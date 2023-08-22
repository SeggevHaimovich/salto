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

import { InstanceElement, getChangeData, isAdditionChange, isAdditionOrModificationChange, ChangeError, isReferenceExpression, ChangeDataType, isInstanceElement, Value } from '@salto-io/adapter-api'
import { TransformFuncArgs, WALK_NEXT_STEP, WalkOnFunc, transformValues, walkOnElement } from '@salto-io/adapter-utils'
import { parse } from 'fast-xml-parser'
import { decode } from 'he'
import { logger } from '@salto-io/logging'
import _ from 'lodash'
import { datasetDefinition } from '../type_parsers/dataset_parsing/parsed_dataset'
import { ATTRIBUTE_PREFIX } from '../client/constants'
import { DEFXML } from '../client/bla'
import { isFileInstance } from '../types'
import { NetsuiteChangeValidator } from './types'

const log = logger(module)

const getUnreferencedFilesFullNames = (
  files: InstanceElement[],
  changesData: ChangeDataType[],
): Set<string> => {
  const unreferencedFilesFullNames = new Set(files.map(file => file.elemID.getFullName()))

  const func: WalkOnFunc = ({ value }) => {
    if (isReferenceExpression(value)) {
      unreferencedFilesFullNames.delete(value.elemID.createTopLevelParentID().parent.getFullName())
      if (unreferencedFilesFullNames.size === 0) {
        return WALK_NEXT_STEP.EXIT
      }
      return WALK_NEXT_STEP.SKIP
    }
    return WALK_NEXT_STEP.RECURSE
  }

  changesData.forEach(element => walkOnElement({ element, func }))
  return unreferencedFilesFullNames
}

const changeValidator: NetsuiteChangeValidator = async changes => {
  const definitionValues = parse(DEFXML, {
    attributeNamePrefix: ATTRIBUTE_PREFIX,
    ignoreAttributes: false,
    tagValueProcessor: val => decode(val),
  })
  const tryfunc = ({ value, field, path }: TransformFuncArgs): Value => {
    let ans = value
    log.debug('lets see %o, %o', field, path)
    if (_.isPlainObject(value)) {
      ans = _.omit(value, ['_T_'])
      if ('@_type' in ans) {
        if (ans['@_type'] === 'null') {
          ans = {}
        } else if (ans['@_type'] === 'array') {
          // eslint-disable-next-line dot-notation
          ans = ans['_ITEM_']
        } else if (ans['@_type'] === 'boolean' || ans['@_type'] === 'string') {
          ans = ans['#text']
        }
      }
    }
    return ans
  }
  const values = transformValues({
    values: definitionValues.root,
    type: datasetDefinition(),
    transformFunc: tryfunc,
    strict: false,
    pathID: definitionValues.root.elemID,
  })
  const val2 = await values
  log.debug('bla %o', val2)
  const additionAndModificationChanges = changes
    .filter(isAdditionOrModificationChange)
  const fileAdditions = additionAndModificationChanges
    .filter(isAdditionChange)
    .map(getChangeData)
    .filter(isInstanceElement)
    .filter(isFileInstance)

  if (fileAdditions.length === 0) {
    return []
  }

  const unreferencedFilesFullNames = getUnreferencedFilesFullNames(
    fileAdditions, additionAndModificationChanges.map(getChangeData)
  )

  return fileAdditions
    .filter(file => unreferencedFilesFullNames.has(file.elemID.getFullName()))
    .map(({ elemID }): ChangeError => ({
      elemID,
      severity: 'Warning',
      message: 'File not referenced by any element',
      detailedMessage: "This file isn't referenced by any other element. This may indicate that you forgot to include some element in your deployment which uses this file.",
    }))
}

export default changeValidator
