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
import { BuiltinTypes, CORE_ANNOTATIONS, ElemID, ObjectType, createRestriction, ListType, Value, ReferenceExpression, createRefToElmWithValue } from '@salto-io/adapter-api'
import { createMatchingObjectType } from '@salto-io/adapter-utils'
import { TypeAndInnerTypes } from '../../types/object_types'
import * as constants from '../../constants'

// do I need inner types to inner types? what are they here for?


type AudienceItem = Value
type FieldReferenceJoinTrailJoin = Value
type CriteriaExpressionSubType = Value
type CriteriaExpressionUiData = Value
type MetaSelectorType = Value
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
type CriteriaChildExpressionValue = {
  type?: string
  value?: string
}
type CriteriaExpression = {
  label?: string
  subType?: CriteriaExpressionSubType
  uiData?: CriteriaExpressionUiData[]
  value?: CriteriaChildExpressionValue
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
  selectorType?: MetaSelectorType
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
  translationScriptId?: string | ReferenceExpression
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
  definitionName?: Name
  definitionScriptId?: DefinitionScriptId
  version?: string
}

export type ParsedDataset = {
  scriptid: string
  name: string
  dependencies?: {
    dependency?: ReferenceExpression[]
  }
} & DatasetDefinitionType

export const DatasetType = (): TypeAndInnerTypes => {
  const innerTypes: Record<string, ObjectType> = {}

  // ######################### Definition #########################################

  // const datasetApplicationIdElemID = new ElemID(constants.NETSUITE, 'dataset_applicationId') // not sure if needed

  const datasetAudienceElemID = new ElemID(constants.NETSUITE, 'dataset_audience')
  const datasetAudience = createMatchingObjectType<Audience>({
    elemID: datasetAudienceElemID,
    annotations: {
    },
    fields: {
      AudienceItems: { refType: new ListType(BuiltinTypes.UNKNOWN) },
      isPublic: { refType: BuiltinTypes.BOOLEAN },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetAudienceElemID.name],
  })

  const datasetDependenciesElemID = new ElemID(constants.NETSUITE, 'dataset_dependencies')
  const datasetDependencies = createMatchingObjectType<Dependencies>({
    elemID: datasetDependenciesElemID,
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
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetDependenciesElemID.name],
  })

  const datasetBaseRecordElemID = new ElemID(constants.NETSUITE, 'dataset_baseRecord')
  const datasetBaseRecord = createMatchingObjectType<BaseRecord>({
    elemID: datasetBaseRecordElemID,
    annotations: {
    },
    fields: {
      id: { refType: BuiltinTypes.STRING },
      label: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetBaseRecordElemID.name],
  })


  const datasetJoinTrailElemID = new ElemID(constants.NETSUITE, 'dataset_joinTrail')
  const datasetJoinTrail = createMatchingObjectType<JoinTrail>({
    elemID: datasetJoinTrailElemID,
    annotations: {
    },
    fields: {
      baseRecord: { refType: datasetBaseRecord },
      joins: { refType: new ListType(BuiltinTypes.UNKNOWN) },
      label: { refType: BuiltinTypes.STRING },
      uniqueId: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetJoinTrailElemID.name],
  })

  const datasetFieldReferenceElemID = new ElemID(constants.NETSUITE, 'dataset_fieldReference')
  const datasetFieldReference = createMatchingObjectType<FieldReference>({
    elemID: datasetFieldReferenceElemID,
    annotations: {
    },
    fields: {
      id: { refType: BuiltinTypes.STRING },
      joinTrail: { refType: datasetJoinTrail },
      label: { refType: BuiltinTypes.STRING },
      uniqueId: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetFieldReferenceElemID.name],
  })

  const datasetColumnElemID = new ElemID(constants.NETSUITE, 'dataset_column')
  const datasetColumn = createMatchingObjectType<Column>({
    elemID: datasetColumnElemID,
    annotations: {
    },
    fields: {
      alias: { refType: BuiltinTypes.STRING },
      columnId: { refType: BuiltinTypes.NUMBER },
      field: { refType: datasetFieldReference },
      label: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetColumnElemID.name],
  })

  const datasetDescriptionElemID = new ElemID(constants.NETSUITE, 'dataset_description') // not sure
  const datasetDescription = createMatchingObjectType<Description>({
    elemID: datasetDescriptionElemID,
    annotations: {
    },
    fields: {
      translationScriptId: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetDescriptionElemID.name],
  })

  const datasetLabelElemID = new ElemID(constants.NETSUITE, 'dataset_label')
  const datasetLabel = createMatchingObjectType<Label>({
    elemID: datasetLabelElemID,
    annotations: {
    },
    fields: {
      translationScriptId: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetLabelElemID.name],
  })

  const datasetFormulaFormulaElemID = new ElemID(constants.NETSUITE, 'dataset_formula_formula')
  const datasetFormulaFormula = createMatchingObjectType<FormulaFormula>({
    elemID: datasetFormulaFormulaElemID,
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
      label: { refType: datasetLabel },
      uniqueId: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetFormulaFormulaElemID.name],
  })

  const datasetFormulaElemID = new ElemID(constants.NETSUITE, 'dataset_formula')
  const datasetFormula = createMatchingObjectType<Formula>({
    elemID: datasetFormulaElemID,
    annotations: {
    },
    fields: {
      fields: { refType: new ListType(datasetFieldReference) },
      formula: { refType: datasetFormulaFormula },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetFormulaElemID.name],
  })

  const datasetNameElemID = new ElemID(constants.NETSUITE, 'dataset_name') // not sure
  const datasetName = createMatchingObjectType<Name>({
    elemID: datasetNameElemID,
    annotations: {
    },
    fields: {
      translationScriptId: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetNameElemID.name],
  })

  const datasetCriteriaExpressionValueElemID = new ElemID(constants.NETSUITE, 'dataset_criteria_expression_value')
  const datasetCriteriaExpressionValue = createMatchingObjectType<CriteriaChildExpressionValue>({
    elemID: datasetCriteriaExpressionValueElemID,
    annotations: {
    },
    fields: {
      type: { refType: BuiltinTypes.STRING },
      value: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetCriteriaExpressionValueElemID.name],
  })

  const datasetCriteriaChildExpressionElemID = new ElemID(constants.NETSUITE, 'dataset_criteria_expression')
  const datasetCriteriaChildExpression = createMatchingObjectType<CriteriaExpression>({
    elemID: datasetCriteriaChildExpressionElemID,
    annotations: {
    },
    fields: {
      label: { refType: BuiltinTypes.STRING },
      subType: { refType: BuiltinTypes.UNKNOWN },
      uiData: { refType: new ListType(BuiltinTypes.STRING) },
      value: { refType: datasetCriteriaExpressionValue },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetCriteriaChildExpressionElemID.name],
  })

  const datasetMetaElemID = new ElemID(constants.NETSUITE, 'dataset_meta')
  const datasetMeta = createMatchingObjectType<Meta>({
    elemID: datasetMetaElemID,
    annotations: {
    },
    fields: {
      selectorType: { refType: BuiltinTypes.UNKNOWN },
      subType: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetMetaElemID.name],
  })

  const datasetOperatorElemID = new ElemID(constants.NETSUITE, 'dataset_operator')
  const datasetOperator = createMatchingObjectType<Operator>({
    elemID: datasetMetaElemID,
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
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetOperatorElemID.name],
  })

  const datasetTargetFieldContextElemID = new ElemID(constants.NETSUITE, 'dataset_criteria_TargetFieldContext')
  const datasetTargetFieldContext = createMatchingObjectType<CriteriaTargetFieldContext>({
    elemID: datasetTargetFieldContextElemID,
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
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetTargetFieldContextElemID.name],
  })

  const datasetCriteriaElemID = new ElemID(constants.NETSUITE, 'dataset_criteria')
  const datasetCriteria = createMatchingObjectType<Criteria>({
    elemID: datasetCriteriaElemID,
    annotations: {
    },
    fields: {
      children: { refType: BuiltinTypes.UNKNOWN }, // don't know how to do without value
      caseSensitive: { refType: BuiltinTypes.BOOLEAN },
      expressions: { refType: new ListType(datasetCriteriaChildExpression) },
      operator: { refType: datasetOperator },
      targetFieldContext: { refType: datasetTargetFieldContext },
      field: { refType: datasetFieldReference },
      fieldStateName: { refType: BuiltinTypes.STRING },
      meta: { refType: datasetMeta },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetCriteriaElemID.name],
  })
  datasetCriteria.fields.children.refType = createRefToElmWithValue(new ListType(datasetCriteria))

  // innerTypes.applicationId = datasetApplicationId // not sure if needed
  innerTypes.audience = datasetAudience
  innerTypes.baseRecord = datasetBaseRecord
  innerTypes.criteria = datasetCriteria
  innerTypes.description = datasetDescription
  innerTypes.name = datasetName

  const datasetElemID = new ElemID(constants.NETSUITE, 'dataset')
  const reportdefinition = createMatchingObjectType<ParsedDataset>({
    elemID: datasetElemID,
    fields: {
      scriptid: {
        refType: BuiltinTypes.SERVICE_ID,
        annotations: {
          _required: true,
          [constants.IS_ATTRIBUTE]: true,
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ regex: '^custdataset[0-9a-z_]+' }),
        },
      },
      name: {
        refType: BuiltinTypes.STRING,
        annotations: {
          _required: true,
        },
      },
      dependencies: {
        refType: datasetDependencies,
      },
      applicationId: {
        refType: BuiltinTypes.UNKNOWN,
      },
      audience: {
        refType: datasetAudience,
      },
      baseRecord: {
        refType: datasetBaseRecord,
      },
      columns: {
        refType: new ListType(datasetColumn),
      },
      criteria: {
        refType: datasetCriteria,
      },
      description: {
        refType: datasetDescription,
      },
      formulas: {
        refType: new ListType(datasetFormula),
      },
      id: {
        refType: BuiltinTypes.UNKNOWN,
      },
      definitionName: {
        refType: datasetName,
      },
      definitionScriptId: {
        refType: BuiltinTypes.UNKNOWN,
      },
      version: {
        refType: BuiltinTypes.STRING,
      },
    },
    annotations: {
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, datasetElemID.name],
  })
  return { type: reportdefinition, innerTypes }
}
