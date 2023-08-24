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

import { ElemID, InstanceElement, isInstanceElement, isObjectType, ObjectType, ReferenceExpression, Value } from '@salto-io/adapter-api'
import _, { isString } from 'lodash'
import { TransformFuncArgs, transformValues } from '@salto-io/adapter-utils'
import { parse } from 'fast-xml-parser'
import { decode } from 'he'
import { NETSUITE } from '../constants'
import { LocalFilterCreator } from '../filter'
import { datasetDefinition, DatasetType } from '../type_parsers/dataset_parsing/parsed_dataset'
import { ATTRIBUTE_PREFIX } from '../client/constants'


const elemIdPath = [NETSUITE, 'translationcollection', 'instance', 'strings', 'string']
const filterCreator: LocalFilterCreator = () => ({
  name: 'parseReportTypes',
  onFetch: async elements => {
    const cloneReportInstance = (instance: InstanceElement, type: ObjectType): InstanceElement =>
    // We create another element not using element.clone because
    // we need the new element to have a parsed save search type.
      new InstanceElement(instance.elemID.name, type, instance.value,
        instance.path, instance.annotations)
    const { type, innerTypes } = DatasetType()
    _.remove(elements, e => isObjectType(e) && e.elemID.typeName === type.elemID.name)
    _.remove(elements, e => isObjectType(e) && e.elemID.name.startsWith(type.elemID.name))
    const instances = _.remove(elements, e => isInstanceElement(e) && e.elemID.typeName === type.elemID.name)
    elements.push(type)
    elements.push(...Object.values(innerTypes))
    const goodFunc = async (instance: InstanceElement): Promise<InstanceElement> => {
      const tryfunc = (params: TransformFuncArgs): Value => {
        let ans = params.value
        if (_.isPlainObject(params.value)) {
          ans = _.omit(params.value, ['_T_'])
          if ('@_type' in ans) {
            if (ans['@_type'] === 'null') {
              ans = {}
            } else if (ans['@_type'] === 'array') {
              // eslint-disable-next-line dot-notation
              ans = ans['_ITEM_']
            } else if (ans['@_type'] === 'boolean') {
              ans = ans['#text']
            } else if (ans['@_type'] === 'string') {
              ans = String(ans['#text'])
            }
          }
        } else if (isString(params.value) && params.value.startsWith('custcollectiontranslations')) {
          const nameParts = params.value.split('.')
          const finalElemIdPath = [
            elemIdPath[0], elemIdPath[1],
            nameParts[0],
            elemIdPath[2], elemIdPath[3],
            nameParts[1],
          ]
          const elemId = new ElemID(NETSUITE, ...finalElemIdPath)
          const bla = new ReferenceExpression(elemId)
          return bla
        }
        return ans
      }
      const definitionValues = parse(instance.value.definition, {
        attributeNamePrefix: ATTRIBUTE_PREFIX,
        ignoreAttributes: false,
        tagValueProcessor: val => decode(val),
      })
      const values = transformValues({
        values: definitionValues.root,
        type: datasetDefinition(),
        transformFunc: tryfunc,
        strict: false,
        pathID: instance.elemID,
      })
      const finalValue = {
        ..._.omit(instance.value, 'definition'),
        ..._.omit(await values, 'name'),
      }
      instance.value = finalValue
      return instance
    }
    const parsedInstances = (
      instances
        .filter(isInstanceElement)
        .map(instance => cloneReportInstance(instance, type))
    )
    const bla = await goodFunc(parsedInstances[0])
    elements.push(bla)
  },
})

export default filterCreator
