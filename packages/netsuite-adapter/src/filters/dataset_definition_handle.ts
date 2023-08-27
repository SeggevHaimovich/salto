/*
*                      Copyright 2023 Salto Labs Ltd.
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

/* eslint-disable dot-notation */

import { BuiltinTypes, ElemID, getChangeData, InstanceElement, isInstanceChange, isInstanceElement, isObjectType, ObjectType, ReferenceExpression, Value } from '@salto-io/adapter-api'
import _, { isString } from 'lodash'
import { TransformFuncArgs, transformValues } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { parse } from 'fast-xml-parser'
import { decode } from 'he'
import { DATASET, NETSUITE } from '../constants'
import { LocalFilterCreator } from '../filter'
import { ParsedDatasetType } from '../type_parsers/dataset_parsing/parsed_dataset'
import { ATTRIBUTE_PREFIX } from '../client/constants'
// import { convertToXmlContent } from '../client/sdf_parser'

const log = logger(module)

const elemIdPath = ['translationcollection', 'instance', 'strings', 'string', 'scriptid']
const filterCreator: LocalFilterCreator = () => ({
  name: 'parseReportTypes',
  onFetch: async elements => {
    const cloneReportInstance = (instance: InstanceElement, type: ObjectType): InstanceElement =>
    // We create another element not using element.clone because
    // we need the new element to have a parsed save search type.
      new InstanceElement(instance.elemID.name, type, instance.value,
        instance.path, instance.annotations)
    const createDatasetInstances = async (instance: InstanceElement): Promise<InstanceElement> => {
      const valueChanges = async ({ value, field }: TransformFuncArgs): Promise<Value> => {
        const fieldType = await field?.getType()
        if (_.isPlainObject(value)) {
          if ('@_type' in value) {
            if (value['@_type'] === 'null') {
              return {}
            } if (value['@_type'] === 'array') {
              return (Array.isArray(value['_ITEM_'])) ? value['_ITEM_'] : [value['_ITEM_']]
            } if (value['@_type'] === 'boolean') {
              return value['#text']
            } if (value['@_type'] === 'string') {
              return String(value['#text'])
            }
          }
          if ('_T_' in value) {
            return (value['_T_'] !== 'dataSet' && value['_T_'] !== 'formula') ? {
              [value['_T_']]: _.omit(value, '_T_'),
            } : _.omit(value, '_T_')
          }
          return value
        }
        if (isString(value) && value.startsWith('custcollectiontranslations')) {
          const nameParts = value.split('.')
          const finalElemIdPath = [
            elemIdPath[0], elemIdPath[1],
            nameParts[0],
            elemIdPath[2], elemIdPath[3],
            nameParts[1],
            elemIdPath[4],
          ]
          return new ReferenceExpression(new ElemID(NETSUITE, ...finalElemIdPath))
        }
        if (fieldType?.elemID.isEqual(BuiltinTypes.STRING.elemID)) {
          return String(value)
        }
        return value
      }
      const definitionValues = parse(instance.value.definition, {
        attributeNamePrefix: ATTRIBUTE_PREFIX,
        ignoreAttributes: false,
        tagValueProcessor: val => decode(val),
      })
      const values = transformValues({
        values: definitionValues.root,
        type: ParsedDatasetType().type,
        transformFunc: valueChanges,
        strict: false,
        pathID: instance.elemID,
      })
      const finalValue = {
        // ..._.omit(instance.value, 'definition'),
        ...(await values),
        ..._.omit(instance.value, 'name'),
      }
      instance.value = finalValue
      return instance
    }
    const { type, innerTypes } = ParsedDatasetType()
    _.remove(elements, e => isObjectType(e) && e.elemID.typeName === type.elemID.name)
    _.remove(elements, e => isObjectType(e) && e.elemID.name.startsWith(type.elemID.name))
    const instances = _.remove(elements, e => isInstanceElement(e) && e.elemID.typeName === type.elemID.name)
    elements.push(type)
    elements.push(...Object.values(innerTypes))
    const parsedInstances = (
      instances
        .filter(isInstanceElement)
        .map(instance => cloneReportInstance(instance, type))
    ).map(createDatasetInstances)
    elements.push(...await Promise.all(parsedInstances))
    // const parsedInstances = (
    //   instances
    //     .filter(isInstanceElement)
    //     .map(instance => cloneReportInstance(instance, type))
    // )
    // elements.push(await createDatasetInstances(parsedInstances[4]))
  },
  preDeploy: async changes => {
    // const addTypeField = (field: TypeElement | undefined, value: Value): Value => {
    //   if (field !== undefined) {
    //     if (isListType(field)) {
    //       return {
    //         '@_type': 'array',
    //         _ITEM_: value,
    //       }
    //     }
    //     if (field.elemID.typeName === 'boolean') {
    //       return {
    //         '@_type': 'boolean',
    //         '#text': value,
    //       }
    //     }
    //   }
    //   return value
    // }
    const returnToOriginalShape = async (instance: InstanceElement): Promise<void> => {
      const valueChanges = async ({ value, field, path }: TransformFuncArgs): Promise<Value> => {
        // const fieldType = await field?.getType()
        // if (isObjectType(fieldType) && isPlainObject(value)) {
        //   Object.keys(fieldType.fields).forEach(async key => {
        //     if (!(key in value)) {
        //       value[key] = _.pick(addTypeField(await fieldType.fields[key].getType(), undefined))
        //     }
        //   })
        // }
        // return addTypeField(fieldType, value)
        log.debug('hello %o, %o, %o', value, field, path)
        return value
      }
      // const option1 = (): Values => {
      //   const nameSplit = instance.value.name.elemID.getFullName().split('.')
      //   const nameForDefinition = nameSplit[3] + nameSplit[6]
      //   return {
      //     ..._.omit(instance.value, ['name', 'scriptid', 'dependencies', 'definition']),
      //     name: {
      //       translationScriptId: nameForDefinition,
      //     },
      //   }
      // }
      // const option2 = (): Values => ({
      //   ..._.omit(instance.value, ['scriptid', 'dependencies', 'definition']),
      // })
      // const definitionValues = isReferenceExpression(instance.value.name) ? option1() : option2()
      const definitionValues = {
        ..._.omit(instance.value, ['scriptid', 'dependencies', 'definition', 'name']),
      }
      const values = transformValues({
        values: definitionValues,
        type: ParsedDatasetType().type,
        transformFunc: valueChanges,
        strict: false,
        pathID: instance.elemID,
      })
      const bla = await values
      log.debug('adsckjb %o', bla)
      // const bla2 = (bla !== undefined) ? convertToXmlContent({
      //   typeName: 'root',
      //   values: bla,
      // }) : ''
      // instance.value = {
      //   name: instance.value.name,
      //   scriptid: instance.value.scriptid,
      //   dependencies: instance.value.dependencies,
      //   definition: bla2,
      // }
    }

    changes
      .filter(isInstanceChange)
      .map(getChangeData)
      .filter(instance => instance.elemID.typeName === DATASET)
      .forEach(returnToOriginalShape)
  },
})

export default filterCreator
