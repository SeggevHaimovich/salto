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

import _, { isPlainObject } from 'lodash'
import {
  getChangeData, isModificationChange, InstanceElement, isInstanceChange,
  ModificationChange,
  ElemID,
  ChangeError,
  Values,
  isReferenceExpression,
  Value,
} from '@salto-io/adapter-api'
import { collections } from '@salto-io/lowerdash'
import { ROLE } from '../constants'
import { NetsuiteChangeValidator } from './types'

const { awu } = collections.asynciterable

type RestrictedTypeGetters = {
  getListOfVales: (inst: InstanceElement) => Value[]
  getIdentificationString: (item: Value) => Promise<string | undefined>
  getDetailedMessage: (names: string[]) => string
  }

// TODO need to make the permission type more accurate
const getIdentificationForRolePermission = async (permission: Values): Promise<string | undefined> => {
  if (_.isString(permission.permkey)) {
    return permission.permkey
  }
  if (isReferenceExpression(permission.permkey) && _.isString(await permission.permkey.getResolvedValue())) {
    return permission.permkey.getResolvedValue()
  }
  return undefined
}

const getListValuesForRole = (role: InstanceElement): Value[] =>
  (isPlainObject(role.value.permissions?.permission)
    ? collections.array.makeArray(Object.values(role.value.permissions.permission))
    : [])

const roleGetters: RestrictedTypeGetters = {
  getListOfVales: getListValuesForRole,
  getIdentificationString: getIdentificationForRolePermission,
  getDetailedMessage: (names: string[]) => `Cannot remove inner permission${(names.length > 1) ? 's' : ''}: ${names.join(', ')} from the role. NetSuite supports the removal of permissions only from their UI.`,
}

const getIdsUnderLists = async (
  instance: InstanceElement,
  getters: RestrictedTypeGetters | undefined,
): Promise<string[]> => {
  if (getters !== undefined) {
    const bla1 = getters.getListOfVales(instance)
    const bla2 = await awu(bla1).map(getters.getIdentificationString).toArray()
    const bla3 = bla2.filter(_.isString)
    // eslint-disable-next-line no-console
    console.log(bla3)

    return awu(getters.getListOfVales(instance))
      .map(getters.getIdentificationString)
      .filter(_.isString)
      .toArray()
  }
  return [] as string[]
}

const getRelevantGetter = (instance: InstanceElement): RestrictedTypeGetters | undefined => {
  if (instance.elemID.typeName === ROLE) {
    return roleGetters
  }
  return undefined
}

const getRemovedListItems = async (change: ModificationChange<InstanceElement>):
  Promise<{
    elemID: ElemID
    detailedMessage: string
  }> => {
  const getter = getRelevantGetter(change.data.before)
  if (getter === undefined) {
    return {
      elemID: getChangeData(change).elemID,
      detailedMessage: '',
    }
  }
  const idsUnderListsBefore = await getIdsUnderLists(change.data.before, getter)
  const idsUnderListsAfterSet = new Set<string>(
    await getIdsUnderLists(change.data.after, getter)
  )
  const removedListItems = idsUnderListsBefore
    .filter(id => !idsUnderListsAfterSet.has(id))
  return {
    elemID: getChangeData(change).elemID,
    detailedMessage: getter.getDetailedMessage(removedListItems),
  }
}

const changeValidator: NetsuiteChangeValidator = async changes => {
  const instanceChanges = await awu(changes)
    .filter(isModificationChange)
    .filter(isInstanceChange)
    .toArray() as ModificationChange<InstanceElement>[]

  return awu(instanceChanges).map(getRemovedListItems)
    .filter(({ detailedMessage }: {detailedMessage: string}) => detailedMessage !== '')
    .map(({ elemID, detailedMessage }: {detailedMessage: string; elemID: ElemID}) => ({
      elemID,
      severity: 'Warning',
      message: 'Can\'t remove inner elements',
      detailedMessage,
    }))
    .toArray() as Promise<ChangeError[]>
}

export default changeValidator
