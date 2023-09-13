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
import { InstanceElement, ReferenceExpression, toChange } from '@salto-io/adapter-api'
import { buildElementsSourceFromElements } from '@salto-io/adapter-utils/src/element_source'
import filterCreator from '../../src/filters/add_referencing_workbooks'
import { LocalFilterOpts } from '../../src/filter'
import { ParsedDatasetType } from '../../src/type_parsers/dataset_parsing/parsed_dataset'
import { ParsedWorkbookType } from '../../src/type_parsers/workbook_parsing/parsed_workbook'

describe('add_referencing_workbooks filter', () => {
  const { type: workbook } = ParsedWorkbookType()
  const dataset = new InstanceElement('dataset', ParsedDatasetType().type, {
    scriptid: 'datasetScriptId',
  })
  const referencingWorkbook = new InstanceElement('referencingWorkbook', workbook, {
    dependencies: {
      dependency: [
        new ReferenceExpression(dataset.elemID.createNestedID('scriptid')),
      ],
    },
  })
  const unreferencingWorkbook = new InstanceElement('unreferencingWorkbook', workbook, {
    dependencies: {
      dependency: [
        'seggev test',
      ],
    },
  })
  const nonValidWorkbook = new InstanceElement('nonValidWorkbook', workbook, {
    dependencies: {
      dependency: [
        new ReferenceExpression(dataset.elemID.createNestedID('scriptid')),
      ],
    },
    pivots: true,
  })
  const workbookWithoutDependencies = new InstanceElement('workbookWithoutDependencies', workbook)
  it('should not add any workbook if there is no datasets in the deployment', async () => {
    const changes = [
      toChange({ after: referencingWorkbook }),
    ]
    const elementsSource = buildElementsSourceFromElements([
      dataset,
      referencingWorkbook,
      unreferencingWorkbook,
      workbookWithoutDependencies,
      nonValidWorkbook,
    ])
    const originalNumOfChanges = changes.length
    await filterCreator({ elementsSource } as LocalFilterOpts).preDeploy?.(changes)
    expect(changes.length).toEqual(originalNumOfChanges)
  })
  it('should not add any workbook if there is a dataset and a workbook referencing it in the deployment', async () => {
    const changes = [
      toChange({ after: referencingWorkbook }),
      toChange({ after: dataset }),
    ]
    const elementsSource = buildElementsSourceFromElements([
      dataset,
      referencingWorkbook,
      unreferencingWorkbook,
      workbookWithoutDependencies,
      nonValidWorkbook,
    ])
    const originalNumOfChanges = changes.length
    await filterCreator({ elementsSource } as LocalFilterOpts).preDeploy?.(changes)
    expect(changes.length).toEqual(originalNumOfChanges)
  })
  it('should not add any workbook if there is a dataset and a workbook referencing it, with other workbooks, in the deployment', async () => {
    const changes = [
      toChange({ after: unreferencingWorkbook }),
      toChange({ after: workbookWithoutDependencies }),
      toChange({ after: referencingWorkbook }),
      toChange({ after: nonValidWorkbook }),
      toChange({ after: dataset }),
    ]
    const elementsSource = buildElementsSourceFromElements([
      dataset,
      referencingWorkbook,
      unreferencingWorkbook,
      workbookWithoutDependencies,
      nonValidWorkbook,
    ])
    const originalNumOfChanges = changes.length
    await filterCreator({ elementsSource } as LocalFilterOpts).preDeploy?.(changes)
    expect(changes.length).toEqual(originalNumOfChanges)
  })
  it('should add a workbook if there is no workbook in the deployment', async () => {
    const changes = [
      toChange({ after: dataset }),
    ]
    const elementsSource = buildElementsSourceFromElements([
      dataset,
      nonValidWorkbook,
      unreferencingWorkbook,
      workbookWithoutDependencies,
      referencingWorkbook,
    ])
    const originalNumOfChanges = changes.length
    await filterCreator({ elementsSource } as LocalFilterOpts).preDeploy?.(changes)
    expect(changes.length).toEqual(originalNumOfChanges + 1)
    expect(changes[originalNumOfChanges]).toEqual(
      toChange({ before: referencingWorkbook, after: referencingWorkbook })
    )
  })
  it('should add a workbook to the deployment if there is a unreferenced dataset', async () => {
    const changes = [
      toChange({ after: dataset }),
      toChange({ after: unreferencingWorkbook }),
    ]
    const elementsSource = buildElementsSourceFromElements([
      dataset,
      referencingWorkbook,
      unreferencingWorkbook,
      workbookWithoutDependencies,
      nonValidWorkbook,
    ])
    const originalNumOfChanges = changes.length
    await filterCreator({ elementsSource } as LocalFilterOpts).preDeploy?.(changes)
    expect(changes.length).toEqual(originalNumOfChanges + 1)
    expect(changes[originalNumOfChanges]).toEqual(
      toChange({ before: referencingWorkbook, after: referencingWorkbook })
    )
  })
})
