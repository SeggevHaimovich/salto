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
import { ElemID, InstanceElement, ListType, ObjectType } from '@salto-io/adapter-api'
import { logger } from '@salto-io/logging'
import { filterUtils, client as clientUtils } from '@salto-io/adapter-components'
import { MockInterface } from '@salto-io/test-utils'
import JiraClient from '../../../src/client/client'
import { JIRA, WORKFLOW_TYPE_NAME } from '../../../src/constants'
import workflowDiagramsFilter from '../../../src/filters/workflow/workflow_diagrams'
import { getFilterParams, mockClient } from '../../utils'

const logging = logger('jira-adapter/src/filters/workflow/workflow_diagrams')
const logErrorSpy = jest.spyOn(logging, 'error')

describe('workflowDiagramFilter', () => {
  let filter: filterUtils.FilterWith<'onFetch'>
  let workflowType: ObjectType
  let workflowStatusType: ObjectType
  let workflowTransitionType: ObjectType
  let instance: InstanceElement
  let client: JiraClient
  let mockConnection: MockInterface<clientUtils.APIConnection>
  beforeEach(async () => {
    jest.clearAllMocks()
    workflowStatusType = new ObjectType({
      elemID: new ElemID(JIRA, 'WorkflowStatus'),
    })
    workflowTransitionType = new ObjectType({
      elemID: new ElemID(JIRA, 'Transition'),
    })

    workflowType = new ObjectType({
      elemID: new ElemID(JIRA, WORKFLOW_TYPE_NAME),
      fields: {
        statuses: { refType: new ListType(workflowStatusType) },
        transitions: { refType: new ListType(workflowTransitionType) },
      },
    })

    instance = new InstanceElement(
      'instance',
      workflowType,
      {
        name: 'workflowName',
        statuses: [
          {
            name: 'Resolved',
            id: '5',
          },
          {
            name: 'Open',
            id: '1',
          },
          {
            name: 'The best name',
            id: '10007',
          },
          {
            name: 'Create',
            id: '5',
          },
          {
            name: 'Building',
            id: '400',
          },
        ],
        transitions: [
          {
            name: 'Building',
            to: '400',
            type: 'global',
          },
          {
            name: 'Create',
            to: '1',
            type: 'initial',
          },
          {
            name: 'hey',
            from: ['1'],
            to: '5',
            type: 'directed',
          },
          {
            name: 'super',
            from: ['10007'],
            to: '400',
            type: 'directed',
          },
          {
            name: 'yey',
            from: ['5'],
            to: '10007',
            type: 'directed',
          },
        ],
      }
    )

    const { client: cli, connection } = mockClient()
    client = cli
    mockConnection = connection

    mockConnection.get.mockResolvedValue({
      status: 200,
      data: {
        isDraft: false,
        layout: {
          statuses: [
            {
              id: 'S<3>',
              name: 'Open',
              stepId: '3',
              statusId: '1',
              x: 3,
              y: 6,
            },
            {
              id: 'I<1>',
              name: 'Create',
              stepId: '1',
              x: 33,
              y: 66,
              initial: true,
            },
            {
              id: 'S<4>',
              name: 'Resolved',
              stepId: '4',
              statusId: '5',
              x: -3,
              y: 6,
            },
            {
              id: 'S<1>',
              name: 'Building',
              stepId: '1',
              statusId: '400',
              x: 3,
              y: -66,
            },
            {
              id: 'S<2>',
              name: 'The best name',
              stepId: '2',
              statusId: '10007',
              x: 33,
              y: -66,
            },
          ],
          transitions: [
            {
              id: 'A<31:S<2>:S<1>>',
              name: 'super',
              sourceId: 'S<2>',
              targetId: 'S<1>',
              sourceAngle: 34.11,
              targetAngle: 173.58,
            },
            {
              id: 'IA<1:I<1>:S<3>>',
              name: 'Create',
              sourceId: 'I<1>',
              targetId: 'S<3>',
              sourceAngle: 99.11,
              targetAngle: 173.58,
            },
            {
              id: 'A<41:S<4>:S<2>>',
              name: 'yey',
              sourceId: 'S<4>',
              targetId: 'S<2>',
              sourceAngle: 78.11,
              targetAngle: 122.58,
            },
            {
              id: 'A<21:S<3>:S<4>>',
              name: 'hey',
              sourceId: 'S<3>',
              targetId: 'S<4>',
              sourceAngle: -78.11,
              targetAngle: 173.58,
            },
            {
              id: 'A<11:S<1>:S<1>>',
              name: 'Building',
              sourceId: 'S<1>',
              targetId: 'S<1>',
              sourceAngle: 78.11,
              targetAngle: -173.58,
            },
          ],
        },
      },
    })
    filter = workflowDiagramsFilter(getFilterParams({
      client,
    })) as typeof filter
  })

  describe('onFetch', () => {
    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should set the location field in WorkflowStatus', async () => {
      const elements = [workflowStatusType]
      await filter.onFetch(elements)
      expect(workflowStatusType.fields.location).toBeDefined()
      expect(elements).toHaveLength(3)
    })

    it('should set the from field in Transition', async () => {
      const elements = [workflowTransitionType]
      await filter.onFetch(elements)
      expect(workflowTransitionType.fields.from).toBeDefined()
      expect(elements).toHaveLength(3)
    })

    it('should add location fields to the statuses', async () => {
      const elements = [instance]
      await filter.onFetch(elements)
      expect(mockConnection.get).toHaveBeenCalledWith(
        '/rest/workflowDesigner/1.0/workflows',
        {
          headers: { 'X-Atlassian-Token': 'no-check' },
          params: { name: 'workflowName' },
        },
      )
      expect(elements).toHaveLength(3)
      expect(instance.value.statuses[0].location).toBeDefined()
      expect(instance.value.statuses[0].location.x).toEqual(-3)
      expect(instance.value.statuses[0].location.y).toEqual(6)
    })

    it('should add angles to from values in transitions', async () => {
      const elements = [instance]
      await filter.onFetch(elements)
      expect(mockConnection.get).toHaveBeenCalledWith(
        '/rest/workflowDesigner/1.0/workflows',
        {
          headers: { 'X-Atlassian-Token': 'no-check' },
          params: { name: 'workflowName' },
        },
      )
      expect(elements).toHaveLength(3)
      expect(instance.value.transitions[2].from).toBeDefined()
      expect(instance.value.transitions[2].from[0].id).toEqual('1')
      expect(instance.value.transitions[2].from[0].sourceAngle).toEqual(-78.11)
      expect(instance.value.transitions[2].from[0].targetAngle).toEqual(173.58)
    })
    it('should add angles to from of initial transitions with undefined id', async () => {
      const elements = [instance]
      await filter.onFetch(elements)
      expect(mockConnection.get).toHaveBeenCalledWith(
        '/rest/workflowDesigner/1.0/workflows',
        {
          headers: { 'X-Atlassian-Token': 'no-check' },
          params: { name: 'workflowName' },
        },
      )
      expect(elements).toHaveLength(3)
      expect(instance.value.transitions[1].from).toBeDefined()
      expect(instance.value.transitions[1].from[0].id).toBeUndefined()
      expect(instance.value.transitions[1].from[0].sourceAngle).toEqual(99.11)
      expect(instance.value.transitions[1].from[0].targetAngle).toEqual(173.58)
    })
    it('from should not be undefined in global transitions', async () => {
      const elements = [instance]
      await filter.onFetch(elements)
      expect(mockConnection.get).toHaveBeenCalledWith(
        '/rest/workflowDesigner/1.0/workflows',
        {
          headers: { 'X-Atlassian-Token': 'no-check' },
          params: { name: 'workflowName' },
        },
      )
      expect(elements).toHaveLength(3)
      expect(instance.value.transitions[0].from).toBeUndefined()
    })

    it('should log error when response is not valid', async () => {
      const elements = [instance]
      mockConnection.get.mockResolvedValue({
        status: 200,
        data: {
          isDraft: false,
          layout: {
            statuses: 'not an array',
          },
        },
      })
      filter = workflowDiagramsFilter(getFilterParams({
        client,
      })) as typeof filter
      await filter.onFetch(elements)
      expect(logErrorSpy).toHaveBeenCalledWith('Failed to get the workflow diagram of jira.Workflow.instance.instance: Fail to get the workflow workflowName diagram values due to an invalid response')
    })
    it('should log error when workflow does not have a name', async () => {
      instance.value.name = undefined
      const elements = [instance]
      await filter.onFetch(elements)
      expect(logErrorSpy).toHaveBeenCalledWith('Failed to get the workflow diagram of jira.Workflow.instance.instance: Fail to get workflow diagram values because its name is undefined')
    })
  })
})