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

import { BuiltinTypes, Change, ElemID, getChangeData, InstanceElement, isContainerType, isInstanceChange, isInstanceElement, isListType, isObjectType, isPrimitiveType, isReferenceExpression, ObjectType, ReferenceExpression, TypeElement, Value, Values } from '@salto-io/adapter-api'
import _, { isBoolean, isPlainObject, isString } from 'lodash'
import { TransformFuncArgs, transformValues, WALK_NEXT_STEP, WalkOnFunc, walkOnValue } from '@salto-io/adapter-utils'
import { logger } from '@salto-io/logging'
import { parse, j2xParser } from 'fast-xml-parser'
import { decode, encode } from 'he'
import { DATASET, NETSUITE } from '../constants'
import { LocalFilterCreator } from '../filter'
import { ParsedDatasetType } from '../type_parsers/dataset_parsing/parsed_dataset'
import { ATTRIBUTE_PREFIX, CDATA_TAG_NAME } from '../client/constants'

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
  preDeploy: async (changes: Change[]) => {
    const types: Set<string> = new Set([
      'fieldReference',
      'dataSetFormula',
      'condition',
      'filter',
    ])
    const isNumberStr = (str: string): boolean => !Number.isNaN(Number(str))

    const nullObject = (): { [key: string]: Value } => ({
      '@_type': 'null',
    })
    const createEmptyObjectOfType = async (typeElem: TypeElement): Promise<Value> => {
      if (isContainerType(typeElem)) {
        if (isListType(typeElem)) {
          return {
            '@_type': 'array',
          }
        }
        return {
          '@_type': 'map',
        }
      }
      if (isPrimitiveType(typeElem)) {
        return nullObject()
      }
      // it must be an object (recursive building the object)
      const keys = Object.keys(typeElem.fields)
      const newObject: { [key: string]: Value} = {}
      for (const key of keys) {
        if (!(types.has(key))) {
          // eslint-disable-next-line no-await-in-loop
          newObject[key] = await createEmptyObjectOfType(await typeElem.fields[key].getType())
        }
        // eslint-disable-next-line no-await-in-loop
      }
      // Object.keys(typeElem.fields).forEach(async key => {
      //   newObject[key] = createEmptyObjectOfType(await typeElem.fields[key].getType())
      // })

      // object that contains only nulls should be null
      if (Object.keys(newObject).every(key => _.isEqual(newObject[key], nullObject()))) {
        return nullObject()
      }
      return newObject
    }
    // const isEmptyObject = (obj: { [key: string]: Value}): boolean =>
    //   (Object.keys(obj).length === 0)

    // const isNullObject = (obj: { [key: string]: Value}): boolean =>
    //   (_.isEqual(obj, nullObject()))

    const walkFunc: WalkOnFunc = ({ value }) => {
      const checkReference = (key: string): Value => {
        if (key === 'translationScriptId' && isReferenceExpression(value[key])) {
          const name = value[key].elemID.getFullName()
          const nameList = name.split('.')
          if (
            nameList[0] === NETSUITE
            && nameList[1] === 'translationcollection'
            && nameList[2] === 'instance'
            && nameList[4] === 'strings'
            && nameList[5] === 'string'
            && nameList[7] === 'scriptid'
          ) {
            return nameList[3].concat('.', nameList[6])
          }
          return name
        }
        return value[key]
      }

      const checkTypeField = (key: string | number): Value => {
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
          value[key] = checkReference(key)
        }

        // check if contains a field that supposed to have @_type
        if (!('@_type' in value)) {
          // keys.map(checkChanges)
          for (const key of keys) {
            value[key] = checkTypeField(key)
          }
        }
      } else if (Array.isArray(value)) {
        // eslint-disable-next-line no-plusplus
        for (let i = 0; i < value.length; i++) {
          value[i] = checkT(i)
          value[i] = checkTypeField(i)
        }
      }
      return WALK_NEXT_STEP.RECURSE
    }

    const valueChanges = async ({ value, field, path }: TransformFuncArgs): Promise<Value> => {
      const fieldType = await field?.getType()
      if (isObjectType(fieldType) && isPlainObject(value) && !('@_type' in value)) {
        for (const key of Object.keys(fieldType.fields)) {
          if (!(key in value) && !(types.has(key))) {
            // eslint-disable-next-line no-await-in-loop
            value[key] = await createEmptyObjectOfType(await fieldType.fields[key].getType())
          }
        }
      }
      return value
      log.debug('hello %o, %o, %o', value, field, path)
    }
    const matchToOriginalObjectFromXML = (instance: InstanceElement, definitionValues: Values): void =>
      walkOnValue({
        elemId: instance.elemID,
        value: definitionValues,
        func: walkFunc,
      })

    const addMissingFields = (instance: InstanceElement, definitionValues: Values): Promise<Values | undefined> =>
      transformValues({
        values: definitionValues,
        type: ParsedDatasetType().type,
        transformFunc: valueChanges,
        strict: false,
        pathID: instance.elemID,
      })
    const returnToOriginalShape = async (instance: InstanceElement): Promise<void> => {
      const definitionValues = {
        ..._.omit(instance.value, ['scriptid', 'dependencies', 'definition']),
      }
      const fullDefinitionValues = await addMissingFields(instance, definitionValues)
      if (fullDefinitionValues) {
        matchToOriginalObjectFromXML(instance, fullDefinitionValues)
        const datasetType = ParsedDatasetType().type
        for (const key of Object.keys(datasetType.fields)) {
          if (!(key in fullDefinitionValues) && !['scriptid', 'dependencies', 'definition'].includes(key)) {
            // eslint-disable-next-line no-await-in-loop
            fullDefinitionValues[key] = await createEmptyObjectOfType(await datasetType.fields[key].getType())
          }
        }
        const finalDefinitionObject: { [key: string]: Value} = {
          _T_: 'dataSet',
          ...fullDefinitionValues,
        }
        // eslint-disable-next-line new-cap
        const xmlString = new j2xParser({
          attributeNamePrefix: ATTRIBUTE_PREFIX,
          // We convert to an not formatted xml since the CDATA transformation is wrong when having format
          format: false,
          ignoreAttributes: false,
          cdataTagName: CDATA_TAG_NAME,
          tagValueProcessor: val => encode(val.toString()),
        }).parse({ root: finalDefinitionObject })
        const nameParts = finalDefinitionObject.name.translationScriptId.split('.')
        const finalElemIdPath = [
          elemIdPath[0], elemIdPath[1],
          nameParts[0],
          elemIdPath[2], elemIdPath[3],
          nameParts[1],
          elemIdPath[4],
        ]
        const name = new ReferenceExpression(new ElemID(NETSUITE, ...finalElemIdPath))
        instance.value = {
          name,
          scriptid: instance.value.scriptid,
          dependencies: instance.value.dependencies,
          definition: xmlString,
        }
        const parsedOutcome = parse(instance.value.definition, {
          attributeNamePrefix: ATTRIBUTE_PREFIX,
          ignoreAttributes: false,
          tagValueProcessor: val => decode(val),
        })
        const originalDefinitionValues = parse(instance.value.definition, {
          attributeNamePrefix: ATTRIBUTE_PREFIX,
          ignoreAttributes: false,
          tagValueProcessor: val => decode(val),
        })
        log.debug('', originalDefinitionValues)
        log.debug('', parsedOutcome)
      }
    }


    changes
      .filter(isInstanceChange)
      .map(getChangeData)
      .filter(instance => instance.elemID.typeName === DATASET)
      .forEach(returnToOriginalShape)
  },
})

export default filterCreator
