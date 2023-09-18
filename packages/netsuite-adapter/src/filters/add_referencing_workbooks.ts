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

import { Change, getChangeData, InstanceElement, isInstanceChange, isInstanceElement, isReferenceExpression, ReadOnlyElementsSource, toChange } from '@salto-io/adapter-api'
import { collections } from '@salto-io/lowerdash'
import { DATASET, WORKBOOK } from '../constants'
import { LocalFilterCreator } from '../filter'
import { checkWorkbookValidity } from '../change_validators/unsupported_workbooks'
import { getUnreferencedDatasets } from '../change_validators/check_referenced_datasets'
import { addInnerReferencesTopLevelParent } from '../reference_dependencies'

const { awu } = collections.asynciterable

const getWorkbooksToPush = async (
  datasetChanges: InstanceElement[],
  workbookChanges: InstanceElement[],
  elementsSource: ReadOnlyElementsSource
): Promise<InstanceElement[]> => {
  const workbooksToPush: InstanceElement[] = []
  const unreferencedDatasets = getUnreferencedDatasets(datasetChanges, workbookChanges)
  if (unreferencedDatasets.length > 0) {
    const datasetFullNameSet = new Set<string>(
      unreferencedDatasets
        .map(dataset => dataset.elemID.createNestedID('scriptid'))
        .map(elemId => elemId.getFullName())
    )
    const validWorkbooks = await awu(await elementsSource.list())
      .filter(elemID => elemID.typeName === WORKBOOK)
      .map(async elemId => elementsSource.get(elemId))
      .filter(isInstanceElement)
      .filter(checkWorkbookValidity)
      .toArray()
    for (const workbook of validWorkbooks) {
      if (datasetFullNameSet.size === 0) {
        break
      }
      const dependencies = workbook.value.dependencies?.dependency ?? {}
      if (Array.isArray(dependencies)) {
        const startSizeOfSet = datasetFullNameSet.size
        dependencies
          .forEach(dep => {
            if (isReferenceExpression(dep) && datasetFullNameSet.has(dep.elemID.getFullName())) {
              datasetFullNameSet.delete(dep.elemID.getFullName())
            }
          })
        if (startSizeOfSet > datasetFullNameSet.size) {
          // eslint-disable-next-line no-await-in-loop
          workbook.value = await addInnerReferencesTopLevelParent(workbook.value, elementsSource)
          workbooksToPush.push(workbook)
        }
      }
    }
  }
  return workbooksToPush
}
const filterCreator: LocalFilterCreator = ({ elementsSource }) => ({
  name: 'pushReferencingWorkbooks',

  preDeploy: async (changes: Change[]) => {
    const instanceElems = changes
      .filter(isInstanceChange)
      .map(getChangeData)

    await awu(await getWorkbooksToPush(
      instanceElems.filter(instance => instance.elemID.typeName === DATASET),
      instanceElems.filter(instance => instance.elemID.typeName === WORKBOOK),
      elementsSource,
    )).forEach(workbook => changes.push(toChange({ before: workbook, after: workbook })))
  },
})

export default filterCreator
