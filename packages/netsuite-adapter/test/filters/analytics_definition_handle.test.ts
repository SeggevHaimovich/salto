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
import { ElemID, InstanceElement, ObjectType, isObjectType } from '@salto-io/adapter-api'
import { buildElementsSourceFromElements } from '@salto-io/adapter-utils'
// import { collections } from '@salto-io/lowerdash'
import { logger } from '@salto-io/logging'
import { LocalFilterOpts } from '../../src/filter'
import { createEmptyElementsSourceIndexes, getDefaultAdapterConfig } from '../utils'
import { emptyDefinition } from '../type_parsers/saved_search_definition'
import { ParsedWorkbookType } from '../../src/type_parsers/workbook_parsing/parsed_workbook'
import { ParsedDatasetType } from '../../src/type_parsers/dataset_parsing/parsed_dataset'
import { WORKBOOK } from '../../src/constants'
import filterCreator from '../../src/filters/analytics_definition_handle2'

const log = logger(module)
// const { awu } = collections.asynciterable

describe('parse_report_types filter', () => {
  let workbookInstance: InstanceElement
  let sourceWorkbookInstance: InstanceElement

  let datasetInstance: InstanceElement
  let sourceDatasetInstance: InstanceElement

  let fetchOpts: LocalFilterOpts

  beforeEach(async () => {
    fetchOpts = {
      elementsSourceIndex: {
        getIndexes: () => Promise.resolve(createEmptyElementsSourceIndexes()),
      },
      elementsSource: buildElementsSourceFromElements([]),
      isPartial: false,
      config: await getDefaultAdapterConfig(),
    }

    const workbook = ParsedWorkbookType().type
    const dataset = ParsedDatasetType().type
    workbookInstance = new InstanceElement(
      'someWorkbook',
      workbook,
      { definition: emptyDefinition }
    )
    sourceWorkbookInstance = new InstanceElement(
      'someWorkbook',
      workbook,
      { definition: emptyDefinition }
    )

    datasetInstance = new InstanceElement(
      'someDataset',
      dataset,
      { definition: emptyDefinition }
    )
    sourceDatasetInstance = new InstanceElement(
      'someDataset',
      dataset,
      { definition: emptyDefinition }
    )
    log.debug('', workbookInstance, sourceWorkbookInstance, datasetInstance, sourceDatasetInstance, fetchOpts)

    describe('onFetch', () => {
      it('should removes old object type and adds new type', async () => {
        const workbookObject = new ObjectType({ elemID: new ElemID('netsuite', WORKBOOK) })
        const elements = [workbookObject]
        await filterCreator(fetchOpts).onFetch?.(elements)
        expect(elements.filter(isObjectType)
          .filter(e => e.elemID.typeName === WORKBOOK)[0])
          .not.toEqual(workbookObject)
        expect(elements.filter(isObjectType)
          .filter(e => e.elemID.typeName === WORKBOOK)[0])
          .toEqual(ParsedWorkbookType().type)
      })
    })
  })
})
