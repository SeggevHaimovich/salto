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

import { getChangeData, ChangeError, isInstanceChange, InstanceElement } from '@salto-io/adapter-api'
import _ from 'lodash'
import { NetsuiteChangeValidator } from './types'
import { WORKBOOK } from '../constants'

const unsupportedAttributes = ['charts', 'pivots', 'datasetLinks']

export const checkWorkbookValidity = (workbookInstance: InstanceElement): boolean =>
  !_.isEmpty(unsupportedAttributes.filter(attr => attr in workbookInstance))

const changeValidator: NetsuiteChangeValidator = async changes =>
  changes
    .filter(isInstanceChange)
    .map(getChangeData)
    .filter(inst => inst.elemID.typeName === WORKBOOK)
    .filter(checkWorkbookValidity)
    .map(({ elemID }): ChangeError => ({
      elemID,
      severity: 'Warning',
      message: 'This workbook contains pivots, charts, or data links and cannot be deployed',
      detailedMessage: 'Deployment of workbooks that contain pivots, charts, or data links is not supported',
    }))


export default changeValidator
