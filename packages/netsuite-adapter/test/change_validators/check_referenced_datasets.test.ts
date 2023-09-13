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
import { buildElementsSourceFromElements } from '@salto-io/adapter-utils'
import checkReferencedDatasets from '../../src/change_validators/check_referenced_datasets'
import { ParsedDatasetType } from '../../src/type_parsers/dataset_parsing/parsed_dataset'
import { ParsedWorkbookType } from '../../src/type_parsers/workbook_parsing/parsed_workbook'

describe('unreferenced dataset validator', () => {
  const { type: dataset } = ParsedDatasetType()
  const { type: workbook } = ParsedWorkbookType()
  const referencedDataset = new InstanceElement('referencedDataset', dataset, {
    scriptid: 'referencedDatasetScriptId',
  })
  const unreferencedDataset = new InstanceElement('unreferencedDataset', dataset, {
    scriptid: 'unreferencedDatasetScriptId',
  })
  const referencingWorkbook = new InstanceElement('referencingWorkbook', workbook, {
    dependencies: {
      dependency: [
        new ReferenceExpression(referencedDataset.elemID.createNestedID('scriptid')),
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
        new ReferenceExpression(referencedDataset.elemID.createNestedID('scriptid')),
      ],
    },
    pivots: true,
  })

  it('Should not have a change error when changing a dataset and a workbook referencing it', async () => {
    const changeErrors = await checkReferencedDatasets([
      toChange({ after: referencedDataset }),
      toChange({ after: referencingWorkbook }),
    ],
    undefined,
    buildElementsSourceFromElements([
      referencedDataset,
      referencingWorkbook,
    ]))
    expect(changeErrors).toHaveLength(0)
  })

  it('Should not have a change error when not adding a dataset', async () => {
    const changeErrors = await checkReferencedDatasets([
      toChange({ after: unreferencingWorkbook }),
    ],
    undefined,
    buildElementsSourceFromElements([
      unreferencingWorkbook,
    ]))
    expect(changeErrors).toHaveLength(0)
  })

  it('Should not have a change error when adding a dataset that is being referenced by a workbook in the elementsSource', async () => {
    const changeErrors = await checkReferencedDatasets([
      toChange({ after: referencedDataset }),
    ],
    undefined,
    buildElementsSourceFromElements([
      referencedDataset,
      referencingWorkbook,
    ]))
    expect(changeErrors).toHaveLength(0)
  })

  it('Should have a change error when adding a dataset that is not being referenced by any workbook in the elementsSource', async () => {
    const changeErrors = await checkReferencedDatasets([
      toChange({ after: unreferencedDataset }),
      toChange({ after: unreferencingWorkbook }),
    ],
    undefined,
    buildElementsSourceFromElements([
      unreferencedDataset,
      referencedDataset,
      referencingWorkbook,
    ]))
    expect(changeErrors).toHaveLength(1)
    expect(changeErrors[0].severity).toEqual('Error')
    expect(changeErrors[0].elemID).toBe(unreferencedDataset.elemID)
  })

  it('Should have a change error when adding a dataset that is being referenced only by an non-valid workbook', async () => {
    const changeErrors = await checkReferencedDatasets([
      toChange({ after: referencedDataset }),
    ],
    undefined,
    buildElementsSourceFromElements([
      referencedDataset,
      nonValidWorkbook,
    ]))
    expect(changeErrors).toHaveLength(1)
    expect(changeErrors[0].severity).toEqual('Error')
    expect(changeErrors[0].elemID).toBe(referencedDataset.elemID)
  })
})
