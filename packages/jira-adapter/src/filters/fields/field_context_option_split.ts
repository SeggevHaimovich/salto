/*
 *                      Copyright 2024 Salto Labs Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  BuiltinTypes,
  CORE_ANNOTATIONS,
  ElemID,
  ElemIdGetter,
  Field,
  InstanceElement,
  isInstanceElement,
  ListType,
  ObjectType,
  ReferenceExpression,
  Values,
} from '@salto-io/adapter-api'
import { config as configUtils, elements as adapterElements } from '@salto-io/adapter-components'
import { getParent, invertNaclCase, naclCase, pathNaclCase } from '@salto-io/adapter-utils'
import { values } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'
import _ from 'lodash'
import { DEFAULT_API_DEFINITIONS } from '../../config/api_config'
import { FilterCreator } from '../../filter'
import { findObject, setTypeDeploymentAnnotationsRecursively } from '../../utils'
import {
  FIELD_CONTEXT_OPTIONS_FILE_NAME,
  FIELD_CONTEXT_OPTION_TYPE_NAME,
  FIELD_CONTEXT_ORDER_FILE_NAME,
  FIELD_CONTEXT_TYPE_NAME,
  ORDER_INSTANCE_SUFFIX,
  ORDER_OBJECT_TYPE_NAME,
  PARENT_NAME_FIELD,
} from './constants'
import { convertOptionsToList } from './context_options'

const log = logger(module)

const { getTransformationConfigByType } = configUtils
const { toBasicInstance } = adapterElements

const getOptionsInstances = async ({
  context,
  parent,
  optionList,
  optionType,
  getElemIdFunc,
}: {
  context: InstanceElement
  parent: InstanceElement
  optionList: Values[]
  optionType: ObjectType
  getElemIdFunc: ElemIdGetter | undefined
}): Promise<InstanceElement[]> => {
  const options = (
    await Promise.all(
      optionList.map(async (optionValue: Values) => {
        optionValue[PARENT_NAME_FIELD] = invertNaclCase(parent.elemID.name)
        const optionInstance = await toBasicInstance({
          entry: optionValue,
          type: optionType,
          transformationConfigByType: getTransformationConfigByType(DEFAULT_API_DEFINITIONS.types),
          transformationDefaultConfig: DEFAULT_API_DEFINITIONS.typeDefaults.transformation,
          defaultName: `${invertNaclCase(parent.elemID.name)}_${optionValue.value}`,
          getElemIdFunc,
          parent,
        })
        delete optionInstance.value[PARENT_NAME_FIELD]
        optionInstance.path = context.path && [
          ...context.path,
          pathNaclCase(naclCase(`${invertNaclCase(context.elemID.name)}_${FIELD_CONTEXT_OPTIONS_FILE_NAME}`)),
        ]
        return optionInstance
      }),
    )
  ).filter(values.isDefined)
  return options
}

const getOrderInstance = async ({
  context,
  options,
  orderType,
  parent,
  getElemIdFunc,
}: {
  context: InstanceElement
  options: InstanceElement[]
  orderType: ObjectType
  parent: InstanceElement
  getElemIdFunc: ElemIdGetter | undefined
}): Promise<InstanceElement> => {
  const instance = await toBasicInstance({
    entry: {
      options: options.map(option => new ReferenceExpression(option.elemID, option)),
    },
    type: orderType,
    transformationConfigByType: getTransformationConfigByType(DEFAULT_API_DEFINITIONS.types),
    transformationDefaultConfig: DEFAULT_API_DEFINITIONS.typeDefaults.transformation,
    defaultName: `${invertNaclCase(parent.elemID.name)}_${ORDER_INSTANCE_SUFFIX}`,
    getElemIdFunc,
  })
  instance.path = context.path && [
    ...context.path,
    pathNaclCase(naclCase(`${invertNaclCase(context.elemID.name)}_${FIELD_CONTEXT_ORDER_FILE_NAME}`)),
  ]
  return instance
}

const editDefaultValue = (context: InstanceElement, idToOptionRecord: Record<string, InstanceElement>): void => {
  if (context.value.defaultValue === undefined) {
    return
  }
  const { optionIds, optionId, cascadingOptionId } = context.value.defaultValue
  if (_.isString(optionId) && Object.prototype.hasOwnProperty.call(idToOptionRecord, optionId)) {
    const optionInstance = idToOptionRecord[optionId]
    context.value.defaultValue.optionId = new ReferenceExpression(optionInstance.elemID, optionInstance)
  }
  if (Array.isArray(optionIds)) {
    context.value.defaultValue.optionIds = optionIds
      .filter(_.isString)
      .filter(id => Object.prototype.hasOwnProperty.call(idToOptionRecord, id))
      .map((id: string) => {
        const optionInstance = idToOptionRecord[id]
        return new ReferenceExpression(optionInstance.elemID, optionInstance)
      })
  }
  if (_.isString(cascadingOptionId) && Object.prototype.hasOwnProperty.call(idToOptionRecord, cascadingOptionId)) {
    const optionInstance = idToOptionRecord[cascadingOptionId]
    context.value.defaultValue.cascadingOptionId = new ReferenceExpression(optionInstance.elemID, optionInstance)
  }
}

const filter: FilterCreator = ({ config, getElemIdFunc }) => ({
  name: 'fieldContextOptionsSplitFilter',
  onFetch: async elements => {
    if (!config.fetch.splitFieldContextOptions) {
      return
    }

    const fieldContextType = findObject(elements, FIELD_CONTEXT_TYPE_NAME)
    const fieldContextOptionType = findObject(elements, FIELD_CONTEXT_OPTION_TYPE_NAME)

    if (fieldContextType === undefined || fieldContextOptionType === undefined) {
      log.error('Field context type or field context option type not found')
      return
    }

    fieldContextType.fields.options = new Field(fieldContextType, 'options', new ListType(BuiltinTypes.STRING))

    fieldContextOptionType.fields[PARENT_NAME_FIELD] = new Field(
      fieldContextOptionType,
      PARENT_NAME_FIELD,
      BuiltinTypes.STRING,
      {
        [CORE_ANNOTATIONS.HIDDEN_VALUE]: true,
      },
    )
    await setTypeDeploymentAnnotationsRecursively(fieldContextOptionType)

    const fieldContextOrderObjectType = new ObjectType({
      elemID: new ElemID('jira', ORDER_OBJECT_TYPE_NAME),
      fields: {
        options: { refType: new ListType(BuiltinTypes.STRING) },
      },
    })

    const contexts = elements
      .filter(isInstanceElement)
      .filter(instance => instance.elemID.typeName === FIELD_CONTEXT_TYPE_NAME)

    const orderInstances: InstanceElement[] = []
    const options = _.flatten(
      await Promise.all(
        contexts
          .filter(context => context.value.options !== undefined)
          .flatMap(async context => {
            const orderedOptions = await getOptionsInstances({
              context,
              parent: context,
              optionList: convertOptionsToList(context.value.options ?? {}),
              optionType: fieldContextOptionType,
              getElemIdFunc,
            })
            const orderInstance = await getOrderInstance({
              context,
              options: orderedOptions,
              orderType: fieldContextOrderObjectType,
              parent: context,
              getElemIdFunc,
            })
            delete context.value.options
            orderInstances.push(orderInstance)
            return orderedOptions
          }),
      ),
    )
    const cascadingOptions = _.flatten(
      await Promise.all(
        options
          .filter(option => option.value.cascadingOptions !== undefined)
          .flatMap(async option => {
            const context = getParent(option)
            const orderedOptions = await getOptionsInstances({
              context,
              parent: option,
              optionList: convertOptionsToList(option.value.cascadingOptions ?? {}),
              optionType: fieldContextOptionType,
              getElemIdFunc,
            })
            const orderInstance = await getOrderInstance({
              context,
              options: orderedOptions,
              orderType: fieldContextOrderObjectType,
              parent: option,
              getElemIdFunc,
            })
            delete option.value.cascadingOptions
            orderInstances.push(orderInstance)
            return orderedOptions
          }),
      ),
    )
    const idToOptionRecord: Record<string, InstanceElement> = _.fromPairs(
      options
        .concat(cascadingOptions)
        .filter(option => _.isString(option.value.id))
        .map(option => [option.value.id, option]),
    )
    contexts.forEach(context => editDefaultValue(context, idToOptionRecord))
    contexts.forEach(context => {
      context.path = context.path && [...context.path, context.path[context.path.length - 1]]
    })

    elements.push(fieldContextOrderObjectType)
    options.forEach(option => elements.push(option))
    cascadingOptions.forEach(cascadingOption => elements.push(cascadingOption))
    orderInstances.forEach(orderInstance => elements.push(orderInstance))
  },
})

export default filter
