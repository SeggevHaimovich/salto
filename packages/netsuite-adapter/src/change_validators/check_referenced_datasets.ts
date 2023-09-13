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

import { ChangeError, InstanceElement, getChangeData, isInstanceChange, isReferenceExpression } from '@salto-io/adapter-api'
import { collections } from '@salto-io/lowerdash'
import { NetsuiteChangeValidator } from './types'
import { DATASET, WORKBOOK } from '../constants'
import { checkWorkbookValidity } from './unsupported_workbooks'

const { awu } = collections.asynciterable

export const getUnreferencedDatasets = (
  datasets: InstanceElement[],
  workbooks: InstanceElement[],
): InstanceElement[] => {
  const datasetElemIdFullNameSet = new Set<string>(
    datasets
      .map(dataset => dataset.elemID.createNestedID('scriptid'))
      .map(elemId => elemId.getFullName())
  )

  workbooks
    .flatMap(workbook => workbook.value.dependencies?.dependency ?? [])
    .map(dep => (isReferenceExpression(dep) ? dep.elemID.getFullName() : ''))
    .forEach(fullName => datasetElemIdFullNameSet.delete(fullName))

  return datasets.filter(dataset => datasetElemIdFullNameSet.has(dataset.elemID.createNestedID('scriptid').getFullName()))
}

const changeValidator: NetsuiteChangeValidator = async (changes, _deployReferencedElements, elementsSource) => {
  if (elementsSource === undefined) {
    return []
  }

  const datasetChanges = changes
    .filter(isInstanceChange)
    .map(getChangeData)
    .filter(inst => inst.elemID.typeName === DATASET)

  const validWorkbooks = await awu(await elementsSource.list())
    .filter(elemID => elemID.idType === 'instance' && elemID.typeName === WORKBOOK)
    .map(async elemId => elementsSource.get(elemId))
    .filter(checkWorkbookValidity)
    .toArray()

  return getUnreferencedDatasets(datasetChanges, validWorkbooks)
    .map(({ elemID }): ChangeError => ({
      elemID,
      severity: 'Error',
      message: 'This dataset cannot be deployed because there is no workbook that reference it',
      detailedMessage: 'a dataset must be deployed along side with a workbook that reference it.'
        + 'Therefore there must be a deployable workbook (without pivots, charts and dtalinks) in the enviorment',
    }))
}


export default changeValidator
