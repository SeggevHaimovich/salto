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

import { BuiltinTypes, Change, ElemID, getChangeData, InstanceElement, isInstanceChange, isInstanceElement, isObjectType, ObjectType, ReferenceExpression, Value } from '@salto-io/adapter-api'
import _, { isBoolean, isPlainObject, isString } from 'lodash'
import { TransformFuncArgs, transformValues, WALK_NEXT_STEP, WalkOnFunc, walkOnValue } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { parse } from 'fast-xml-parser'
import { decode } from 'he'
import { DATASET, NETSUITE } from '../constants'
import { LocalFilterCreator } from '../filter'
import { ParsedDatasetType, XML_TYPE_DESCRIBER } from '../type_parsers/dataset_parsing/parsed_dataset'
import { ATTRIBUTE_PREFIX } from '../client/constants'
import { PreDeployParsedDatasetType } from '../type_parsers/dataset_parsing/predeploy_parsed_dataset'

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
        allowEmpty: false,
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
  preDeploy2: async (changes: Change[]) => {
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
    //         '#text': String(value),
    //       }
    //     }
    //   }
    //   return value
    // }
    const returnToOriginalShape = async (instance: InstanceElement): Promise<void> => {
      const valueChanges = async ({ value, field, path }: TransformFuncArgs): Promise<Value> => {
        const fieldType = await field?.getType()
        let ans = value
        if (fieldType !== undefined && XML_TYPE_DESCRIBER in fieldType?.annotations) {
          if (fieldType.annotations[XML_TYPE_DESCRIBER] !== 'formula') {
            ans = {
              ...value[Object.keys(value)[0]],
              _T_: fieldType.annotations[XML_TYPE_DESCRIBER],
            }
          } else {
            ans = {
              ...value,
              _T_: fieldType.annotations[XML_TYPE_DESCRIBER],
            }
          }
        }
        // if (isObjectType(fieldType) && isPlainObject(value)) {
        //   Object.keys(fieldType.fields).forEach(async key => {
        //     if (!(key in value)) {
        //       value[key] = _.pick(addTypeField(await fieldType.fields[key].getType(), undefined))
        //     }
        //   })
        // }
        // return addTypeField(fieldType, value)
        log.debug('hello %o, %o, %o', value, field, path)
        return ans
      }
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
      const wantedType = PreDeployParsedDatasetType()
      log.debug('acd %o', wantedType)
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
  preDeploy: async (changes: Change[]) => {
    const types: Set<string> = new Set([
      'fieldReference',
      'dataSetFormula',
      'condition',
      'filter',
    ])
    const isNumberStr = (str: string): boolean => !Number.isNaN(Number(str))
    const returnToOriginalShape = async (instance: InstanceElement): Promise<void> => {
      const walkFunc: WalkOnFunc = ({ value }) => {
        const checkChanges = (key: string | number): Value => {
          if (Array.isArray(value[key])) {
            return {
              '@_type': 'array',
              _ITEM_: value[key],
            }
          }
          if (isBoolean(value[key])) {
            // eslint-disable-next-line no-param-reassign
            return {
              '@_type': 'boolean',
              '#text': value[key],
            }
          }
          if (isString(value[key]) && isNumberStr(value[key])) {
            return {
              '@_type': 'string',
              '#text': value[key],
            }
          }
          return value[key]
        }
        const checkT = (key: string | number): Value => {
          if (key === 'formula') {
            return {
              _T_: 'formula',
              ...value[key],
            }
          }
          const innerVal = value[key]
          if (isPlainObject(innerVal)) {
            const innerkeys = Object.keys(innerVal)
            if (innerkeys.length === 1 && types.has(innerkeys[0])) {
              return {
                _T_: innerkeys[0],
                ...value[key][innerkeys[0]],
              }
            }
          }
          return value[key]
        }
        if (isPlainObject(value)) {
          const keys = Object.keys(value)

          // check if contains a field with _T_
          // keys.map(checkT)
          for (const key of keys) {
            value[key] = checkT(key)
          }

          // check if contains a field that supposed to have @_type
          if (!('@_type' in value)) {
            // keys.map(checkChanges)
            for (const key of keys) {
              value[key] = checkChanges(key)
            }
          }
        }
        if (Array.isArray(value)) {
          // eslint-disable-next-line no-plusplus
          for (let i = 0; i < value.length; i++) {
            value[i] = checkT(i)
            value[i] = checkChanges(i)
          }
        }
        return WALK_NEXT_STEP.RECURSE
      }
      const definitionValues = {
        ..._.omit(instance.value, ['scriptid', 'dependencies', 'definition', 'name']),
      }
      walkOnValue({
        elemId: instance.elemID,
        value: definitionValues,
        func: walkFunc,
      })
      log.debug('bla %o', instance)
    }
    changes
      .filter(isInstanceChange)
      .map(getChangeData)
      .filter(instance => instance.elemID.typeName === DATASET)
      .forEach(returnToOriginalShape)
  },
})

export default filterCreator
