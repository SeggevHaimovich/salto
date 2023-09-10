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

import { BuiltinTypes, Change, ElemID, getChangeData, InstanceElement, isContainerType, isInstanceChange, isInstanceElement, isObjectType, isPrimitiveType, isReferenceExpression, ObjectType, ReferenceExpression, TypeElement, Value, Values } from '@salto-io/adapter-api'
import _, { isBoolean, isPlainObject, isString } from 'lodash'
import { TransformFuncArgs, transformValues, WALK_NEXT_STEP, WalkOnFunc, walkOnValue } from '@salto-io/adapter-utils'
import { parse, j2xParser } from 'fast-xml-parser'
import { decode, encode } from 'he'
import { collections } from '@salto-io/lowerdash'
// import { logger } from '@salto-io/logging'
import { DATASET, NETSUITE } from '../constants'
import { LocalFilterCreator } from '../filter'
import { ParsedDatasetType } from '../type_parsers/dataset_parsing/parsed_dataset'
import { ATTRIBUTE_PREFIX, CDATA_TAG_NAME } from '../client/constants'

// const log = logger(module)

// TODO check if it works when peaple use the old version (with changing name)
// TODO what happens if the user will do deploy before fetch?

const { awu } = collections.asynciterable

const T = '_T_'
const TYPE = '@_type'
const ITEM = '_ITEM_'
const TEXT = '#text'

const TValuesToIgnore = new Set(['dataSet', 'formula'])

const fieldsWithT = new Set([
  'fieldReference',
  'dataSetFormula',
  'condition',
  'filter',
])

const notAddingFields = new Set([
  ...fieldsWithT,
  'fieldValidityState',
])

const originalFields = [
  'scriptid',
  'dependencies',
  'definition',
  'name',
]

const isNumberStr = (str: string): boolean => !Number.isNaN(Number(str))

const cloneReportInstance = (instance: InstanceElement, type: ObjectType): InstanceElement =>
// We create another element not using element.clone because
// we need the new element to have a parsed dataset type.
  new InstanceElement(instance.elemID.name, type, instance.value,
    instance.path, instance.annotations)

// const fetchTransformFunc = async ({ value, field }: TransformFuncArgs): Promise<Value> => {
//   const fieldType = await field?.getType()
//   if (_.isPlainObject(value)) {
//     if (TYPE in value) {
//       if (value[TYPE] === 'null') {
//         return {}
//       } if (value[TYPE] === 'array') {
//         if (value[ITEM] !== undefined) {
//           return (Array.isArray(value[ITEM])) ? value[ITEM] : [value[ITEM]]
//         }
//         return []
//       } if (value[TYPE] === 'boolean') {
//         return value[TEXT]
//       } if (value[TYPE] === 'string') {
//         return String(value[TEXT])
//       }
//     }
//     if (T in value) {
//       return TValuesToIgnore.has(value[T]) ? _.omit(value, T) : {
//         [value[T]]: _.omit(value, T),
//       }
//     }
//     return value
//   }
//   if (isString(value) && value.startsWith('custcollectiontranslations')) {
//     const nameParts = value.split('.')
//     if (nameParts.length === 2) {
//       const instance = new ReferenceExpression(
//         new ElemID(NETSUITE, 'translationcollection', 'instance', nameParts[0])
//       )
//       if (await instance.getResolvedValue()) {
//         return new ReferenceExpression(
//           instance.elemID.createNestedID('strings', 'strings', nameParts[1], 'scriptId')
//         )
//       }
//     }
//   }
//   if (fieldType?.elemID.isEqual(BuiltinTypes.STRING.elemID)) {
//     return String(value)
//   }
//   return value
// }

// const createDatasetInstances = async (instance: InstanceElement): Promise<InstanceElement> => {
//   const definitionValues = parse(instance.value.definition, {
//     attributeNamePrefix: ATTRIBUTE_PREFIX,
//     ignoreAttributes: false,
//     tagValueProcessor: val => decode(val),
//   })

//   const updatedValues = transformValues({
//     values: definitionValues.root,
//     type: ParsedDatasetType().type,
//     transformFunc: fetchTransformFunc,
//     strict: false,
//     pathID: instance.elemID,
//     allowEmpty: false,
//   })

//   instance.value = {
//     ..._.omit(await updatedValues, 'name'),
//     ..._.omit(instance.value, 'definition'),
//   }

//   return instance
// }

const createEmptyObjectOfType = async (typeElem: TypeElement): Promise<Value> => {
  if (isContainerType(typeElem)) {
    // we only have lists in the type
    return {
      [TYPE]: 'array',
    }
  }

  const nullObject = {
    [TYPE]: 'null',
  }

  if (isPrimitiveType(typeElem)) {
    return nullObject
  }

  // it must be an object (recursive building the object)
  const keys = Object.keys(typeElem.fields)
  const newObject: Values = {}
  await awu(keys)
    .filter(key => !(notAddingFields.has(key)))
    .forEach(async key => {
      newObject[key] = await createEmptyObjectOfType(await typeElem.fields[key].getType())
    })

  // object that contains only nulls should be null
  if (Object.keys(newObject).every(key => _.isEqual(newObject[key], nullObject))) {
    return nullObject
  }
  return newObject
}

const checkReferenceToTranslation = (name: string): boolean => {
  const regex = /^netsuite.translationcollection.instance.\w+.strings.string.\w+.scriptid$/
  return regex.test(name)
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
        [TYPE]: 'array',
        [ITEM]: value[key],
      }
    }
    if (isBoolean(value[key])) {
      // eslint-disable-next-line no-param-reassign
      return {
        [TYPE]: 'boolean',
        [TEXT]: String(value[key]),
      }
    }
    if (isString(value[key]) && isNumberStr(value[key])) {
      return {
        [TYPE]: 'string',
        [TEXT]: String(value[key]),
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

    if (!(TYPE in value)) {
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

const deployTransformFunc = async ({ value, field, path }: TransformFuncArgs): Promise<Value> => {
  const fieldType = (path?.getFullName().split('.').length === 4) ? ParsedDatasetType().type : await field?.getType()
  if (isObjectType(fieldType) && isPlainObject(value) && !('@_type' in value)) {
    await awu(Object.keys(fieldType.fields))
      .filter(key => !(key in value) && !(notAddingFields.has(key)))
      .forEach(async key => {
        value[key] = await createEmptyObjectOfType(await fieldType.fields[key].getType())
      })
  }
  return value
}
const matchToXmlObjectForm = (instance: InstanceElement, definitionValues: Values): void =>
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
    ..._.omit(instance.value, originalFields),
  }
  const fullDefinitionValues = await addMissingFields(instance, definitionValues)
  // I am adding an empty definition field but this isn't ruining th deploy
  if (fullDefinitionValues) {
    matchToXmlObjectForm(instance, fullDefinitionValues)
    fullDefinitionValues[T] = 'dataSet'
    fullDefinitionValues.name = instance.value.name
    if (isReferenceExpression(instance.value.name?.[TEXT])) {
      const name = instance.value.name[TEXT].elemID.getFullName()
      if (name !== undefined && checkReferenceToTranslation(name)) {
        const nameList = name.split('.')
        fullDefinitionValues.name = {
          translationScriptId: nameList[3].concat('.', nameList[6]),
        }
      }
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

const filterCreator: LocalFilterCreator = ({ elementsSource }) => ({
  name: 'parseDataset',
  onFetch: async elements => {
    const fetchTransformFunc = async ({ value, field }: TransformFuncArgs): Promise<Value> => {
      const fieldType = await field?.getType()
      if (_.isPlainObject(value)) {
        if (TYPE in value) {
          if (value[TYPE] === 'null') {
            return {}
          } if (value[TYPE] === 'array') {
            if (value[ITEM] !== undefined) {
              return (Array.isArray(value[ITEM])) ? value[ITEM] : [value[ITEM]]
            }
            return []
          } if (value[TYPE] === 'boolean') {
            return value[TEXT]
          } if (value[TYPE] === 'string') {
            return String(value[TEXT])
          }
        }
        if (T in value) {
          return TValuesToIgnore.has(value[T]) ? _.omit(value, T) : {
            [value[T]]: _.omit(value, T),
          }
        }
        return value
      }
      if (isString(value) && value.startsWith('custcollectiontranslations')) {
        const nameParts = value.split('.')
        if (nameParts.length === 2) {
          const instanceElemId = new ElemID(NETSUITE, 'translationcollection', 'instance', nameParts[0])
          const instance = await elementsSource.get(instanceElemId)
          if (instance && instance.value?.strings?.string?.[nameParts[1]]?.scriptid !== undefined) {
            return new ReferenceExpression(instanceElemId.createNestedID('strings', 'string', nameParts[1], 'scriptid'))
          }
        }
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
