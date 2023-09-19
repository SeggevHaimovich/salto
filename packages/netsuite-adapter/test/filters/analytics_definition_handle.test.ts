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

/* eslint-disable camelcase */
import { AdditionChange, ElemID, InstanceElement, ObjectType, isInstanceElement, isObjectType, isReferenceExpression, toChange } from '@salto-io/adapter-api'
import { buildElementsSourceFromElements } from '@salto-io/adapter-utils'
import { LocalFilterOpts } from '../../src/filter'
import { createEmptyElementsSourceIndexes, getDefaultAdapterConfig } from '../utils'
import { ParsedDatasetType } from '../../src/type_parsers/dataset_parsing/parsed_dataset'
import filterCreator from '../../src/filters/analytics_definition_handle'
import * as constants from '../../src/constants'
import { basicDataset, basicDatasetDefinition, basicWorkbookDefinition, custcollectiontranslations_workbook_example, emptyDataset, emptyDatasetDefinition, emptyWorkbook, emptyWorkbookDefinition, parsedBasicDataset, parsedBasicDatasetValue, parsedBasicWorkbook, parsedTypesWorkbook, parsedUnknownDataset, parsedWorkbookWithReference, parsedWorkbookWithReferenceValue, referencePreDeployDefinition, typesWorkbook, unknownDataset, workbookDependencies, workbookWithReference } from './analytics_tests_constants'


describe('parse_report_types filter', () => {
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
  })

  describe('onFetch', () => {
    it('should remove old object type and add the new type', async () => {
      const datasetObject = new ObjectType({ elemID: new ElemID('netsuite', constants.DATASET) })
      const elements = [datasetObject]
      await filterCreator(fetchOpts).onFetch?.(elements)
      expect(elements.filter(isObjectType)
        .filter(e => e.elemID.typeName === constants.DATASET)[0])
        .not.toEqual(datasetObject)
      expect(elements.filter(isObjectType)
        .filter(e => e.elemID.typeName === constants.DATASET)[0])
        .toEqual(ParsedDatasetType().type)
    })
    test('Unknown attribute check', async () => {
      const elements = [unknownDataset]
      await filterCreator(fetchOpts).onFetch?.(elements)
      const newInstance = elements.filter(isInstanceElement)
        .filter(e => e.elemID.typeName === constants.DATASET)[0].value
      expect(newInstance)
        .not.toEqual(unknownDataset)
      expect(newInstance)
        .toEqual(parsedUnknownDataset)
    })
    test('References', async () => {
      fetchOpts.elementsSource = buildElementsSourceFromElements([
        workbookWithReference,
        custcollectiontranslations_workbook_example,
      ])
      const elements = [workbookWithReference]
      await filterCreator(fetchOpts).onFetch?.(elements)
      const newInstance = elements.filter(isInstanceElement)
        .filter(e => e.elemID.typeName === constants.WORKBOOK)[0].value
      expect(newInstance)
        .not.toEqual(workbookWithReference)
      expect(newInstance)
        .toEqual(parsedWorkbookWithReferenceValue)
    })
    test('Different types', async () => {
      const elements = [typesWorkbook]
      await filterCreator(fetchOpts).onFetch?.(elements)
      const newInstance = elements.filter(isInstanceElement)
        .filter(e => e.elemID.typeName === constants.WORKBOOK)[0].value
      expect(newInstance)
        .not.toEqual(typesWorkbook)
      expect(newInstance)
        .toEqual(parsedTypesWorkbook)
    })
    test('Basic fetch check', async () => {
      fetchOpts.elementsSource = buildElementsSourceFromElements([basicDataset])
      const elements = [basicDataset]
      await filterCreator(fetchOpts).onFetch?.(elements)
      const newInstance = elements.filter(isInstanceElement)
        .filter(e => e.elemID.typeName === constants.DATASET)[0].value
      expect(newInstance)
        .not.toEqual(basicDataset)
      expect(newInstance)
        .toEqual(parsedBasicDatasetValue)
    })
  })
  describe('preDeploy', () => {
    it('should write the references to the definition in the right form', async () => {
      fetchOpts.elementsSource = buildElementsSourceFromElements([
        workbookWithReference,
        custcollectiontranslations_workbook_example,
      ])
      const datasetChange = toChange({ after: parsedWorkbookWithReference }) as AdditionChange<InstanceElement>
      await filterCreator(fetchOpts).preDeploy?.([datasetChange])
      expect(Object.keys(datasetChange.data.after.value)).toHaveLength(7)
      expect(isReferenceExpression(datasetChange.data.after.value.name)).toBeTruthy()
      expect(datasetChange.data.after.value.name).toEqual(parsedWorkbookWithReference.value.name)
      expect(datasetChange.data.after.value.scriptid).toEqual(parsedWorkbookWithReference.value.scriptid)
      expect(datasetChange.data.after.value.dependencies).toBeUndefined()
      expect(datasetChange.data.after.value.definition).toEqual(referencePreDeployDefinition)
    })
    test('empty dataset', async () => {
      const datasetChange = toChange({ after: emptyDataset }) as AdditionChange<InstanceElement>
      await filterCreator(fetchOpts).preDeploy?.([datasetChange])
      expect(Object.keys(datasetChange.data.after.value)).toHaveLength(4)
      expect(datasetChange.data.after.value.definition).toEqual(emptyDatasetDefinition)
      expect(datasetChange.data.after.value.name).toEqual(emptyDataset.value.name)
      expect(datasetChange.data.after.value.scriptid).toEqual(emptyDataset.value.scriptid)
      expect(datasetChange.data.after.value.dependencies).toBeUndefined()
    })
    test('empty workbook', async () => {
      const analyticChange = toChange({ after: emptyWorkbook }) as AdditionChange<InstanceElement>
      await filterCreator(fetchOpts).preDeploy?.([analyticChange])
      expect(Object.keys(analyticChange.data.after.value)).toHaveLength(7)
      expect(analyticChange.data.after.value.definition).toEqual(emptyWorkbookDefinition)
      expect(analyticChange.data.after.value.name).toEqual(emptyWorkbook.value.name)
      expect(analyticChange.data.after.value.scriptid).toEqual(emptyWorkbook.value.scriptid)
      expect(analyticChange.data.after.value.dependencies).toBeUndefined()
    })
    test('basic dataset', async () => {
      const analyticChange = toChange({ after: parsedBasicDataset }) as AdditionChange<InstanceElement>
      await filterCreator(fetchOpts).preDeploy?.([analyticChange])
      expect(Object.keys(analyticChange.data.after.value)).toHaveLength(4)
      expect(analyticChange.data.after.value.definition).toEqual(basicDatasetDefinition)
      expect(analyticChange.data.after.value.name).toEqual(parsedBasicDataset.value.name)
      expect(analyticChange.data.after.value.scriptid).toEqual(parsedBasicDataset.value.scriptid)
      expect(analyticChange.data.after.value.dependencies).toBeUndefined()
    })
    test('basic workbook', async () => {
      const analyticChange = toChange({ after: parsedBasicWorkbook }) as AdditionChange<InstanceElement>
      await filterCreator(fetchOpts).preDeploy?.([analyticChange])
      expect(Object.keys(analyticChange.data.after.value)).toHaveLength(7)
      expect(analyticChange.data.after.value.definition).toEqual(basicWorkbookDefinition)
      expect(analyticChange.data.after.value.name).toEqual(parsedBasicWorkbook.value.name)
      expect(analyticChange.data.after.value.scriptid).toEqual(parsedBasicWorkbook.value.scriptid)
      expect(analyticChange.data.after.value.dependencies).toEqual(workbookDependencies)
    })
  })
})
