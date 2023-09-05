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

import { BuiltinTypes, ElemID, InstanceElement, isContainerType, isInstanceElement, isObjectType, isPrimitiveType, isReferenceExpression, ObjectType, ReferenceExpression, TypeElement, Value, Values } from '@salto-io/adapter-api'
import _, { isBoolean, isPlainObject, isString } from 'lodash'
import { TransformFuncArgs, transformValues, WALK_NEXT_STEP, WalkOnFunc, walkOnValue } from '@salto-io/adapter-utils'
import { parse, j2xParser } from 'fast-xml-parser'
import { decode, encode } from 'he'
import { collections } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'
import { NETSUITE } from '../constants'
import { LocalFilterCreator } from '../filter'
import { ParsedDatasetType } from '../type_parsers/dataset_parsing/parsed_dataset'
import { ATTRIBUTE_PREFIX, CDATA_TAG_NAME } from '../client/constants'
import { ParsedWorkbookType } from '../type_parsers/workbook_parsing/parsed_workbook'

const log = logger(module)


const { awu } = collections.asynciterable

const T = '_T_'
const TYPE = '@_type'
const ITEM = '_ITEM_'
const TEXT = '#text'

const TValuesToIgnore = new Set(['workbook'])

// TODO there is a problem with this becouse if there are more options we don't know this will work not good
// maybe just transfer _T_ to type and vice versa
const fieldsWithT = new Set([
  'pivot',
  'chart',
  'dataView',
  'dsLink',
  'cellConditionalFormat',
  'conditionalFormatRule',
  'rgbColor',
  'conditionalFormatFilter',
  'filter',
  'fieldReference',
  'dataSetFormula',
])

const notAddingFields = new Set([
  ...fieldsWithT,
  'fieldValidityState',

  // TODO change to check the field instead
  'format',
  'definition',
  'mapping',
])

const originalFields = [
  'scriptid',
  'name',
  'definition',
  'dependencies',
]

const isNumberStr = (str: string): boolean => !Number.isNaN(Number(str))

const cloneReportInstance = (instance: InstanceElement, type: ObjectType): InstanceElement =>
// We create another element not using element.clone because
// we need the new element to have a parsed dataset type.
  new InstanceElement(instance.elemID.name, type, instance.value,
    instance.path, instance.annotations)

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
      const finalElemIdPath = `translationcollection.instance.${nameParts[0]}.strings.string.${nameParts[1]}.scriptid`
      return new ReferenceExpression(new ElemID(NETSUITE, finalElemIdPath))
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

  const updatedValues = await transformValues({
    values: definitionValues.root,
    type: ParsedDatasetType().type,
    transformFunc: fetchTransformFunc,
    strict: false,
    pathID: instance.elemID,
    allowEmpty: false,
  })

  if (updatedValues) {
    // updatedValues.Workbook = _.omit(updatedValues.Workbook, 'dataViewIDs', 'pivotIDs', 'chartIDs')
    instance.value = {
      ..._.omit(updatedValues, 'name'),
      ..._.omit(instance.value, 'charts', 'pivots', 'tables'), // add definition
    }

    // eslint-disable-next-line no-use-before-define
    instance.value = await returnToOriginalShape(instance)
  }

  return instance
}

const createEmptyObjectOfType = async (typeElem: TypeElement): Promise<Value> => {
  const arrayObject = {
    [TYPE]: 'array',
  }
  const nullObject = {
    [TYPE]: 'null',
  }
  if (isContainerType(typeElem)) {
    // we only have lists in the type
    return arrayObject
  }

  if (isPrimitiveType(typeElem)) {
    return nullObject
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
  // TODO check if there is a field inside that is an empty array, should the upper field be null?
  if (Object.keys(newObject).every(key =>
    _.isEqual(newObject[key], nullObject)
    || _.isEqual(newObject[key], arrayObject))) {
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
    const innerVal = value[key]
    if (isPlainObject(innerVal)) {
      const innerkeys = Object.keys(innerVal)
      if (innerkeys.length === 1 && fieldsWithT.has(innerkeys[0])) {
        return {
          [T]: innerkeys[0],
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
  const fieldType = (path?.getFullName().split('.').length === 4) ? ParsedWorkbookType().type : await field?.getType()
  if (isObjectType(fieldType) && isPlainObject(value) && !(TYPE in value)) {
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
    type: ParsedWorkbookType().type,
    transformFunc: deployTransformFunc,
    strict: false,
    pathID: instance.elemID,
  })

const createOriginalArrays = (value: Values): Values => {
  const createOriginalArray = (arrName: string, itemName: string): Value => {
    const valToReturn: Values = {}
    value[arrName]?.filter(isPlainObject).forEach((val: Values, index: number) => {
      const scriptId = val[itemName]?.scriptId
      if (scriptId !== undefined) {
        valToReturn[scriptId] = {
          scriptid: scriptId,
          index,
        }
      }
    })
    return valToReturn
  }
  return {
    pivots: {
      pivot: createOriginalArray('pivots', 'pivot'),
    },
    charts: {
      chart: createOriginalArray('charts', 'chart'),
    },
    tables: {
      table: createOriginalArray('dataViews', 'dataView'),
    },
  }
}

const returnToOriginalShape = async (instance: InstanceElement): Promise<Value> => {
  const definitionValues = {
    ..._.omit(instance.value, originalFields),
  }
  const fullDefinitionValues = await addMissingFields(instance, definitionValues)
  if (fullDefinitionValues) {
    matchToXmlObjectForm(instance, fullDefinitionValues)
    fullDefinitionValues.Workbook[T] = 'workbook'
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

    const arrays = createOriginalArrays(instance.value)

    return {
      name: instance.value.name,
      scriptid: instance.value.scriptid,
      dependencies: instance.value.dependencies,
      definition: xmlString,
      ...arrays,
    }
  }
  return instance.value
}

const filterCreator: LocalFilterCreator = () => ({
  name: 'parseWorkbook',
  onFetch: async elements => {
    const { type } = ParsedWorkbookType()
    const instances = _.remove(elements, e => isInstanceElement(e) && e.elemID.typeName === type.elemID.name)
    const parsedInstances = (
      instances
        .filter(isInstanceElement)
        .map(instance => cloneReportInstance(instance, type))
        .map(createDatasetInstances))
    elements.push(...await Promise.all(parsedInstances))
  },
})

log.debug('')

export default filterCreator
