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
import { InstanceElement, toChange } from '@salto-io/adapter-api'
import unsupportedWorkbooks from '../../src/change_validators/unsupported_workbooks'
import { ParsedWorkbookType } from '../../src/type_parsers/workbook_parsing/parsed_workbook'

describe('unreferenced file addition validator', () => {
  const { type: workbook } = ParsedWorkbookType()
  const validWorkbook = new InstanceElement('validWorkbook', workbook)
  const nonValidWorkbook = new InstanceElement('nonValidWorkbook', workbook, {
    pivots: true,
  })

  it("Should not have a change error when changing a workbook that doesn't contain pivots/charts/dataLinks", async () => {
    const changeErrors = await unsupportedWorkbooks([
      toChange({ after: validWorkbook }),
    ])
    expect(changeErrors).toHaveLength(0)
  })

  it('Should have a change error when changing a workbook that does contain pivots/charts/dataLinks', async () => {
    const changeErrors = await unsupportedWorkbooks([
      toChange({ after: nonValidWorkbook }),
    ])
    expect(changeErrors).toHaveLength(1)
    expect(changeErrors[0].severity).toEqual('Warning')
    expect(changeErrors[0].elemID).toBe(nonValidWorkbook.elemID)
  })

  it('Should have a change error when adding both valid and non-valid workbooks', async () => {
    const changeErrors = await unsupportedWorkbooks([
      toChange({ after: validWorkbook }),
      toChange({ after: nonValidWorkbook }),
    ])
    expect(changeErrors).toHaveLength(1)
    expect(changeErrors[0].severity).toEqual('Warning')
    expect(changeErrors[0].elemID).toBe(nonValidWorkbook.elemID)
  })
})
