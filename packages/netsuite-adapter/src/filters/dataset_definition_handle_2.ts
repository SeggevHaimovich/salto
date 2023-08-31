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

import { BuiltinTypes, Change, ElemID, getChangeData, InstanceElement, isContainerType, isInstanceChange, isInstanceElement, isObjectType, isPrimitiveType, isReferenceExpression, ObjectType, ReferenceExpression, TypeElement, Value, Values } from '@salto-io/adapter-api'
import _, { isBoolean, isPlainObject, isString } from 'lodash'
import { TransformFuncArgs, transformValues, WALK_NEXT_STEP, WalkOnFunc, walkOnValue } from '@salto-io/adapter-utils'
import { parse, j2xParser } from 'fast-xml-parser'
import { decode, encode } from 'he'
import { collections } from '@salto-io/lowerdash'
import { DATASET, NETSUITE } from '../constants'
import { LocalFilterCreator } from '../filter'
import { ParsedDatasetType } from '../type_parsers/dataset_parsing/parsed_dataset'
import { ATTRIBUTE_PREFIX, CDATA_TAG_NAME } from '../client/constants'

const { awu } = collections.asynciterable

const fieldsWithT: Set<string> = new Set([
  'fieldReference',
  'dataSetFormula',
  'condition',
  'filter',
])

const notAddingFields: Set<string> = new Set([
  ...fieldsWithT,
  'fieldValidityState',
])

const elemIdPath = ['translationcollection', 'instance', 'strings', 'string', 'scriptid']

const isNumberStr = (str: string): boolean => !Number.isNaN(Number(str))

const nullObject = (): { [key: string]: Value } => ({
  '@_type': 'null',
})

const cloneReportInstance = (instance: InstanceElement, type: ObjectType): InstanceElement =>
// We create another element not using element.clone because
// we need the new element to have a parsed dataset type.
  new InstanceElement(instance.elemID.name, type, instance.value,
    instance.path, instance.annotations)

const fetchTransformFunc = async ({ value, field }: TransformFuncArgs): Promise<Value> => {
  const fieldType = await field?.getType()
  if (_.isPlainObject(value)) {
    if ('@_type' in value) {
      if (value['@_type'] === 'null') {
        return {}
      } if (value['@_type'] === 'array') {
        if (value['_ITEM_'] !== undefined) {
          return (Array.isArray(value['_ITEM_'])) ? value['_ITEM_'] : [value['_ITEM_']]
        }
        return []
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
const createDatasetInstances = async (instance: InstanceElement): Promise<InstanceElement> => {
  const definitionValues = parse(instance.value.definition, {
    attributeNamePrefix: ATTRIBUTE_PREFIX,
    ignoreAttributes: false,
    tagValueProcessor: val => decode(val),
  })

  const updatedValues = transformValues({
    values: definitionValues.root,
    type: ParsedDatasetType().type,
    transformFunc: fetchTransformFunc,
    strict: false,
    pathID: instance.elemID,
    allowEmpty: false,
  })

  instance.value = {
    ..._.omit(await updatedValues, 'name'),
    ..._.omit(instance.value, 'definition'),
  }

  return instance
}
const createEmptyObjectOfType = async (typeElem: TypeElement): Promise<Value> => {
  if (isContainerType(typeElem)) {
    // we only have lists in the type
    return {
      '@_type': 'array',
    }
  }

  if (isPrimitiveType(typeElem)) {
    return nullObject()
  }

  // it must be an object (recursive building the object)
  const keys = Object.keys(typeElem.fields)
  const newObject: { [key: string]: Value} = {}
  await awu(keys)
    .filter(key => !(notAddingFields.has(key)))
    .forEach(async key => {
      newObject[key] = await createEmptyObjectOfType(await typeElem.fields[key].getType())
    })

  // object that contains only nulls should be null
  if (Object.keys(newObject).every(key => _.isEqual(newObject[key], nullObject()))) {
    return nullObject()
  }
  return newObject
}

const checkReferenceToTranslation = (name: string): boolean => {
  const nameList = name.split('.')
  return (nameList.length === 8)
  && (
    nameList[0] === NETSUITE
    && nameList[1] === elemIdPath[0]
    && nameList[2] === elemIdPath[1]
    && nameList[4] === elemIdPath[2]
    && nameList[5] === elemIdPath[3]
    && nameList[7] === elemIdPath[4]
  )
}
const deployWalkFunc: WalkOnFunc = ({ value }) => {
  const checkReference = (key: string): Value => {
    if (key === 'translationScriptId' && isReferenceExpression(value[key])) {
      const name = value[key].elemID.getFullName()
      if (checkReferenceToTranslation(name)) {
        const nameList = name.split('.')
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
        '#text': String(value[key]),
      }
    }
    if (isString(value[key]) && isNumberStr(value[key])) {
      return {
        '@_type': 'string',
        '#text': String(value[key]),
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
      if (innerkeys.length === 1 && fieldsWithT.has(innerkeys[0])) {
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

    keys.forEach(key => {
      value[key] = checkT(key)
      value[key] = checkReference(key)
    })

    if (!('@_type' in value)) {
      keys.forEach(key => {
        value[key] = checkTypeField(key)
      })
    }
  } else if (Array.isArray(value)) {
    value.forEach((_val, index) => {
      value[index] = checkT(index)
      value[index] = checkTypeField(index)
    })
  }
  return WALK_NEXT_STEP.RECURSE
}

const deployTransformFunc = async ({ value, field }: TransformFuncArgs): Promise<Value> => {
  const fieldType = await field?.getType()
  if (isObjectType(fieldType) && isPlainObject(value) && !('@_type' in value)) {
    await awu(Object.keys(fieldType.fields))
      .filter(key => !(key in value) && !(notAddingFields.has(key)))
      .forEach(async key => {
        value[key] = await createEmptyObjectOfType(await fieldType.fields[key].getType())
      })
  }
  return value
}
const matchToOriginalObjectFromXML = (instance: InstanceElement, definitionValues: Values): void =>
  walkOnValue({
    elemId: instance.elemID,
    value: definitionValues,
    func: deployWalkFunc,
  })

const addMissingFields = (instance: InstanceElement, definitionValues: Values): Promise<Values | undefined> =>
  transformValues({
    values: definitionValues,
    type: ParsedDatasetType().type,
    transformFunc: deployTransformFunc,
    strict: false,
    pathID: instance.elemID,
  })
const returnToOriginalShape = async (instance: InstanceElement): Promise<Value> => {
  const definitionValues = {
    ..._.omit(instance.value, ['scriptid', 'dependencies', 'definition', 'name']),
  }
  const fullDefinitionValues = await addMissingFields(instance, definitionValues)
  if (fullDefinitionValues) {
    matchToOriginalObjectFromXML(instance, fullDefinitionValues)

    // add fields to dataset high level
    const datasetNewType = ParsedDatasetType().type
    await awu(Object.keys(datasetNewType.fields))
      .filter(key => !(key in fullDefinitionValues) && !['scriptid', 'dependencies', 'definition', 'name'].includes(key))
      .forEach(async key => {
        fullDefinitionValues[key] = await createEmptyObjectOfType(await datasetNewType.fields[key].getType())
      })
    fullDefinitionValues['_T_'] = 'dataset'
    const name = instance.value.name['#text']?.elemID.getFullName()
    if (name !== undefined && checkReferenceToTranslation(name)) {
      const nameList = name.split('.')
      fullDefinitionValues.name = {
        translationScriptId: nameList[3].concat('.', nameList[6]),
      }
    } else {
      fullDefinitionValues.name = instance.value.name
    }

    // eslint-disable-next-line new-cap
    const xmlString = new j2xParser({
      attributeNamePrefix: ATTRIBUTE_PREFIX,
      format: true,
      ignoreAttributes: false,
      cdataTagName: CDATA_TAG_NAME,
      tagValueProcessor: val => encode(val.toString()),
    }).parse({ root: fullDefinitionValues })
    return {
      name: instance.value.name,
      scriptid: instance.value.scriptid,
      dependencies: instance.value.dependencies,
      definition: xmlString,
    }
  }
  return instance.value
}

const filterCreator: LocalFilterCreator = () => ({
  name: 'parseReportTypes',
  onFetch: async elements => {
    const { type, innerTypes } = ParsedDatasetType()
    _.remove(elements, e => isObjectType(e) && e.elemID.typeName === type.elemID.name)
    _.remove(elements, e => isObjectType(e) && e.elemID.name.startsWith(type.elemID.name))
    const instances = _.remove(elements, e => isInstanceElement(e) && e.elemID.typeName === type.elemID.name)
    elements.push(type)
    elements.push(...Object.values(innerTypes))
    // instances
    //   .filter(isInstanceElement)
    //   .map(instance => cloneReportInstance(instance, type))
    //   .map(createDatasetInstances)
    // elements.push(...instances) // why doesn't it work?
    const parsedInstances = (
      instances
        .filter(isInstanceElement)
        .map(instance => cloneReportInstance(instance, type))
        .map(createDatasetInstances))
    elements.push(...await Promise.all(parsedInstances))
  },
  preDeploy: async (changes: Change[]) => {
    await awu(changes)
      .filter(isInstanceChange)
      .map(getChangeData)
      .filter(instance => instance.elemID.typeName === DATASET)
      .forEach(async instance => {
        instance.value = await returnToOriginalShape(instance)
      })
  },
})

export default filterCreator
