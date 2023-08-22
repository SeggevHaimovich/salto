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
import { BuiltinTypes, CORE_ANNOTATIONS, ElemID, ObjectType, createRestriction, ListType, Value, createRefToElmWithValue } from '@salto-io/adapter-api'
import { createMatchingObjectType } from '@salto-io/adapter-utils'
import { TypeAndInnerTypes } from '../../types/object_types'
import * as constants from '../../constants'

// do I need inner types to inner types? what are they here for?
// how to do references (dependencies)
// can deploy without all the fields under definition

// can't deploy ownerId - do strange thing (change and stay after fetch, doesn't change the owner in the UI)


type AudienceItem = Value
type FieldReferenceJoinTrailJoin = Value
type CriteriaExpressionSubType = Value
type CriteriaExpressionUiData = Value

// we should ignore these values
type ApplicationId = Value
type DefinitionId = Value
type DefinitionScriptId = Value


export type Dependencies = {
  dependency: string[]
}

type Audience = {
  AudienceItems?: AudienceItem[]
  isPublic?: boolean
}

type BaseRecord = {
  id?: string
  label?: string
}

type Label = {
  translationScriptId?: string // where did I get it from?
}

type JoinTrail ={
  baseRecord?: BaseRecord
  joins?: FieldReferenceJoinTrailJoin[]
  label?: string
  uniqueId?: string
}

type FieldReference = {
  id?: string
  joinTrail?: JoinTrail
  label?: string
  uniqueId?: string
}

type Column = {
  alias?: string
  columnId?: number
  field?: FieldReference
  label?: string // check it
}
type CriteriaExpressionValue = {
  type?: string
  value?: string
}
type CriteriaExpression = {
  label?: string
  subType?: CriteriaExpressionSubType
  uiData?: CriteriaExpressionUiData[]
  value?: CriteriaExpressionValue
}

// TODO add all the options to all
const codeList = ['AND', 'OR',
  'ANY_OF',
  'EMPTY', 'EMPTY_NOT', 'CONTAIN', 'CONTAIN_NOT', 'ENDWITH', 'ENDWITH_NOT', 'IS', 'IS_NOT', 'START_WITH', 'START_WITH_NOT',
  'LESS', 'GREATER', 'EQUAL', 'EQUAL_NOT', 'GREATER_OR_EQUAL', 'LESS_OR_EQUAL', 'BETWEEN', 'BETWEEN_NOT'] as const
const criteriaTargetFieldContextNameList = ['DEFAULT', 'IDENTIFIER'] as const
const formulaDataTypeList = ['INTEGER', 'BOOLEAN', 'DATE', 'DATETIME', 'FLOAT', 'STRING', 'CLOBTEXT', 'PERCENT', 'DURATION'] as const

// should I just use string?
type Code = typeof codeList[number]
type criteriaTargetFieldContextName = typeof criteriaTargetFieldContextNameList[number]
type formulaDataType = typeof formulaDataTypeList[number]

type Operator = {
  code?: Code
}

type CriteriaTargetFieldContext = {
  name?: criteriaTargetFieldContextName
}

type Meta = {
  selectorType?: string
  subType?: string
}

type Criteria = {
  // _T_: string // 'condition'
  children?: Criteria[]
  caseSensitive?: boolean
  expressions?: CriteriaExpression[]
  field?: FieldReference
  fieldStateName?: string
  meta?: Meta
  operator?: Operator
  targetFieldContext?: CriteriaTargetFieldContext
}

type Description = {
  translationScriptId?: string
}

type FormulaFormula = {
  dataType?: formulaDataType
  formulaSQL?: string
  id?: string
  label?: Label
  uniqueId?: string
}

type Formula = {
  fields?: FieldReference[]
  formula?: FormulaFormula
}

type Name = {
  translationScriptId?: string
}

type DatasetDefinitionType = {
  applicationId?: ApplicationId
  audience?: Audience
  baseRecord?: BaseRecord
  columns?: Column[]
  criteria?: Criteria
  description?: Description
  formulas?: Formula[]
  id?: DefinitionId
  name?: Name
  ownerId?: number
  scriptId?: DefinitionScriptId
  version?: string
}

export type ParsedDataset = {
  scriptid: string
  dependencies?: {
    dependency?: string[]
  }
} & Omit<DatasetDefinitionType, 'scriptId'>

const datasetAudienceElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_audience')
const datasetAudience = (): ObjectType => createMatchingObjectType<Audience>({
  elemID: datasetAudienceElemID(),
  annotations: {
  },
  fields: {
    AudienceItems: { refType: new ListType(BuiltinTypes.UNKNOWN) },
    isPublic: { refType: BuiltinTypes.BOOLEAN },
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetAudienceElemID().name],
})


const datasetDependenciesElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_dependencies')
const datasetDependencies = (): ObjectType => createMatchingObjectType<Dependencies>({
  elemID: datasetDependenciesElemID(),
  annotations: {
  },
  fields: {
    dependency: {
      refType: new ListType(BuiltinTypes.STRING),
      annotations: {
        _required: true,
      },
    },
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetDependenciesElemID().name],
})

const datasetBaseRecordElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_baseRecord')
const datasetBaseRecord = (): ObjectType => createMatchingObjectType<BaseRecord>({
  elemID: datasetBaseRecordElemID(),
  annotations: {
  },
  fields: {
    id: { refType: BuiltinTypes.STRING },
    label: { refType: BuiltinTypes.STRING },
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetBaseRecordElemID().name],
})


const datasetJoinTrailElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_joinTrail')
const datasetJoinTrail = (): ObjectType => createMatchingObjectType<JoinTrail>({
  elemID: datasetJoinTrailElemID(),
  annotations: {
  },
  fields: {
    baseRecord: { refType: datasetBaseRecord() },
    joins: { refType: new ListType(BuiltinTypes.UNKNOWN) },
    label: { refType: BuiltinTypes.STRING },
    uniqueId: { refType: BuiltinTypes.STRING },
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetJoinTrailElemID().name],
})

const datasetFieldReferenceElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_fieldReference')
const datasetFieldReference = (): ObjectType => createMatchingObjectType<FieldReference>({
  elemID: datasetFieldReferenceElemID(),
  annotations: {
  },
  fields: {
    id: { refType: BuiltinTypes.STRING },
    joinTrail: { refType: datasetJoinTrail() },
    label: { refType: BuiltinTypes.STRING },
    uniqueId: { refType: BuiltinTypes.STRING },
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetFieldReferenceElemID().name],
})

const datasetColumnElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_column')
const datasetColumn = (): ObjectType => createMatchingObjectType<Column>({
  elemID: datasetColumnElemID(),
  annotations: {
  },
  fields: {
    alias: { refType: BuiltinTypes.STRING },
    columnId: { refType: BuiltinTypes.NUMBER },
    field: { refType: datasetFieldReference() },
    label: { refType: BuiltinTypes.STRING },
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetColumnElemID().name],
})

const datasetDescriptionElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_description') // not sure
const datasetDescription = (): ObjectType => createMatchingObjectType<Description>({
  elemID: datasetDescriptionElemID(),
  annotations: {
  },
  fields: {
    translationScriptId: { refType: BuiltinTypes.STRING },
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetDescriptionElemID().name],
})

const datasetLabelElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_label')
const datasetLabel = (): ObjectType => createMatchingObjectType<Label>({
  elemID: datasetLabelElemID(),
  annotations: {
  },
  fields: {
    translationScriptId: { refType: BuiltinTypes.STRING },
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetLabelElemID().name],
})

const datasetFormulaFormulaElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_formula_formula')
const datasetFormulaFormula = (): ObjectType => createMatchingObjectType<FormulaFormula>({
  elemID: datasetFormulaFormulaElemID(),
  annotations: {
  },
  fields: {
    dataType: {
      refType: BuiltinTypes.STRING,
      annotations: {
        [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ values: formulaDataTypeList }),
      },
    },
    formulaSQL: { refType: BuiltinTypes.STRING },
    id: { refType: BuiltinTypes.STRING },
    label: { refType: datasetLabel() },
    uniqueId: { refType: BuiltinTypes.STRING },
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetFormulaFormulaElemID().name],
})

const datasetFormulaElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_formula')
const datasetFormula = (): ObjectType => createMatchingObjectType<Formula>({
  elemID: datasetFormulaElemID(),
  annotations: {
  },
  fields: {
    fields: { refType: new ListType(datasetFieldReference()) },
    formula: { refType: datasetFormulaFormula() },
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetFormulaElemID().name],
})

const datasetNameElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_name') // not sure
const datasetName = (): ObjectType => createMatchingObjectType<Name>({
  elemID: datasetNameElemID(),
  annotations: {
  },
  fields: {
    translationScriptId: { refType: BuiltinTypes.STRING },
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetNameElemID().name],
})

const datasetCriteriaExpressionValueElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_criteria_expression_value')
const datasetCriteriaExpressionValue = (): ObjectType => createMatchingObjectType<CriteriaExpressionValue>({
  elemID: datasetCriteriaExpressionValueElemID(),
  annotations: {
  },
  fields: {
    type: { refType: BuiltinTypes.STRING },
    value: { refType: BuiltinTypes.STRING },
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetCriteriaExpressionValueElemID().name],
})

const datasetCriteriaExpressionElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_criteria_expression')
const datasetCriteriaExpression = (): ObjectType => createMatchingObjectType<CriteriaExpression>({
  elemID: datasetCriteriaExpressionElemID(),
  annotations: {
  },
  fields: {
    label: { refType: BuiltinTypes.STRING },
    subType: { refType: BuiltinTypes.UNKNOWN },
    uiData: { refType: new ListType(BuiltinTypes.STRING) },
    value: { refType: datasetCriteriaExpressionValue() },
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetCriteriaExpressionElemID().name],
})

const datasetMetaElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_meta')
const datasetMeta = (): ObjectType => createMatchingObjectType<Meta>({
  elemID: datasetMetaElemID(),
  annotations: {
  },
  fields: {
    selectorType: { refType: BuiltinTypes.UNKNOWN },
    subType: { refType: BuiltinTypes.STRING },
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetMetaElemID().name],
})

const datasetOperatorElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_operator')
const datasetOperator = (): ObjectType => createMatchingObjectType<Operator>({
  elemID: datasetMetaElemID(),
  annotations: {
  },
  fields: {
    code: {
      refType: BuiltinTypes.STRING,
      annotations: {
        [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ values: codeList }),
      },
    },
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetOperatorElemID().name],
})

const datasetTargetFieldContextElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_criteria_TargetFieldContext')
const datasetTargetFieldContext = (): ObjectType => createMatchingObjectType<CriteriaTargetFieldContext>({
  elemID: datasetTargetFieldContextElemID(),
  annotations: {
  },
  fields: {
    name: {
      refType: BuiltinTypes.STRING,
      annotations: {
        [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ values: criteriaTargetFieldContextNameList }),
      },
    }, // dont know how to do it
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetTargetFieldContextElemID().name],
})

const datasetCriteriaElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_criteria')
const datasetCriteria = (): ObjectType => createMatchingObjectType<Criteria>({
  elemID: datasetCriteriaElemID(),
  annotations: {
  },
  fields: {
    children: { refType: BuiltinTypes.UNKNOWN }, // don't know how to do without value
    caseSensitive: { refType: BuiltinTypes.BOOLEAN },
    expressions: { refType: new ListType(datasetCriteriaExpression()) },
    operator: { refType: datasetOperator() },
    targetFieldContext: { refType: datasetTargetFieldContext() },
    field: { refType: datasetFieldReference() },
    fieldStateName: { refType: BuiltinTypes.STRING },
    meta: { refType: datasetMeta() },
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetCriteriaElemID().name],
})
datasetCriteria().fields.children.refType = createRefToElmWithValue(new ListType(datasetCriteria()))

const datasetDefinitionElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset_definition')
export const datasetDefinition = (): ObjectType => createMatchingObjectType<DatasetDefinitionType>({
  elemID: datasetDefinitionElemID(),
  annotations: {
  },
  fields: {
    applicationId: { refType: BuiltinTypes.UNKNOWN },
    audience: { refType: datasetAudience() },
    baseRecord: { refType: datasetBaseRecord() },
    columns: { refType: new ListType(datasetColumn()) },
    criteria: { refType: datasetCriteria() },
    description: { refType: datasetDescription() },
    formulas: { refType: new ListType(datasetFormula()) },
    id: { refType: BuiltinTypes.UNKNOWN },
    name: { refType: datasetName() },
    ownerId: { refType: BuiltinTypes.NUMBER },
    scriptId: { refType: BuiltinTypes.UNKNOWN },
    version: { refType: BuiltinTypes.STRING },
  },
  path: [constants.NETSUITE, constants.TYPES_PATH, datasetDefinitionElemID().name],
})

export const DatasetType = (): TypeAndInnerTypes => {
  const innerTypes: Record<string, ObjectType> = {}

  innerTypes.name = datasetName()
  innerTypes.audience = datasetAudience()
  innerTypes.dependencies = datasetDependencies()
  innerTypes.baseRecord = datasetBaseRecord()
  innerTypes.joinTrail = datasetJoinTrail()
  innerTypes.fieldReference = datasetFieldReference()
  innerTypes.column = datasetColumn()
  innerTypes.description = datasetDescription()
  innerTypes.label = datasetLabel()
  innerTypes.formulaFormula = datasetFormulaFormula()
  innerTypes.formula = datasetFormula()
  innerTypes.criteriaExpressionValue = datasetCriteriaExpressionValue()
  innerTypes.criteriaExpression = datasetCriteriaExpression()
  innerTypes.criteriaMeta = datasetMeta()
  innerTypes.operator = datasetOperator()
  innerTypes.context = datasetTargetFieldContext()
  innerTypes.criteria = datasetCriteria()

  const datasetElemID = (): ElemID => new ElemID(constants.NETSUITE, 'dataset')
  const dataset = (): ObjectType => createMatchingObjectType<ParsedDataset>({
    elemID: datasetElemID(),
    fields: {
      scriptid: {
        refType: BuiltinTypes.SERVICE_ID,
        annotations: {
          _required: true,
          [constants.IS_ATTRIBUTE]: true,
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ regex: '^custdataset[0-9a-z_]+' }),
        },
      },
      name: { refType: datasetName() },
      dependencies: { refType: datasetDependencies() },
      applicationId: { refType: BuiltinTypes.UNKNOWN },
      audience: { refType: datasetAudience() },
      baseRecord: { refType: datasetBaseRecord() },
      columns: { refType: new ListType(datasetColumn()) },
      criteria: { refType: datasetCriteria() },
      description: { refType: datasetDescription() },
      formulas: { refType: new ListType(datasetFormula()) },
      id: { refType: BuiltinTypes.UNKNOWN },
      ownerId: { refType: BuiltinTypes.NUMBER },
      version: { refType: BuiltinTypes.STRING },
    },
    annotations: {
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetElemID().name],
  })
  return { type: dataset(), innerTypes }
}
