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

// can't deploy ownerId - do strange thing (change and stay after fetch, doesn't change the owner in the UI)

// TODO add all the options to all
const codeList = ['AND', 'OR',
  'ANY_OF',
  'EMPTY', 'EMPTY_NOT', 'CONTAIN', 'CONTAIN_NOT', 'ENDWITH', 'ENDWITH_NOT', 'IS', 'IS_NOT', 'START_WITH', 'START_WITH_NOT',
  'LESS', 'GREATER', 'EQUAL', 'EQUAL_NOT', 'GREATER_OR_EQUAL', 'LESS_OR_EQUAL', 'BETWEEN', 'BETWEEN_NOT'] as const
const criteriaTargetFieldContextNameList = ['DEFAULT', 'IDENTIFIER', 'UNCONSOLIDATED'] as const
const formulaDataTypeList = ['INTEGER', 'BOOLEAN', 'DATE', 'DATETIME', 'FLOAT', 'STRING', 'CLOBTEXT', 'PERCENT', 'DURATION'] as const
const validityList = ['VALID'] // ????? could it be something else?

// should I just use string?
type Code = typeof codeList[number]
type CriteriaTargetFieldContextName = typeof criteriaTargetFieldContextNameList[number]
type FormulaDataType = typeof formulaDataTypeList[number]
type Validity = typeof validityList[number]

type AudienceItem = Value
type FieldReferenceJoinTrailJoin = Value
type CriteriaExpressionSubType = Value
type CriteriaExpressionUiData = Value

// maybe we should ignore these values
type ApplicationId = Value
type DefinitionId = Value
type DefinitionScriptId = Value

export const XML_TYPE_DESCRIBER = '_T_'

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
  translationScriptId?: string
}

type JoinTrail = {
  baseRecord?: BaseRecord
  joins?: FieldReferenceJoinTrailJoin[]
}

type FieldReference = {
  id?: string
  joinTrail?: JoinTrail
  label?: string
  uniqueId?: string
  fieldValidityState?: Validity
}

type FormulaFormula = {
  dataType?: FormulaDataType
  formulaSQL?: string
  id?: string
  label?: Label
  uniqueId?: string
}

type Formula = {
  // eslint-disable-next-line no-use-before-define
  fields?: FieldOrFormula[]
  formula?: FormulaFormula
}

export type FieldOrFormula = {
  fieldReference?: FieldReference
  dataSetFormula?: Formula
}

export type Column = {
  alias?: string
  columnId?: number
  field?: FieldOrFormula
  label?: Label
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

type Operator = {
  code?: Code
}

type CriteriaTargetFieldContext = {
  name?: CriteriaTargetFieldContextName
}

type Meta = {
  selectorType?: string
  subType?: string
}

type Filter = {
  caseSensitive?: boolean
  expressions?: CriteriaExpression[]
  field?: FieldOrFormula
  fieldStateName?: string
  meta?: Meta
  operator?: Operator
  targetFieldContext?: CriteriaTargetFieldContext
}

type Condition = {
  operator?: Operator
  // eslint-disable-next-line no-use-before-define
  children?: ConditionOrFilter[]
  targetFieldContext?: CriteriaTargetFieldContext
  meta?: Meta
  field?: FieldOrFormula
  fieldStateName?: string
}

export type ConditionOrFilter = {
  condition?: Condition
  filter?: Filter
}

type Description = {
  translationScriptId?: string
}

type Name = {
  translationScriptId?: string
}

export type DatasetDefinitionType = {
  applicationId?: ApplicationId
  audience?: Audience
  baseRecord?: BaseRecord
  columns?: Column[]
  criteria?: ConditionOrFilter
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
} & DatasetDefinitionType

export const ParsedDatasetType = (): TypeAndInnerTypes => {
  const innerTypes: Record<string, ObjectType> = {}

  const datasetAudienceElemID = new ElemID(constants.NETSUITE, 'dataset_audience')
  const datasetAudience = createMatchingObjectType<Audience>({
    elemID: datasetAudienceElemID,
    annotations: {
    },
    fields: {
      AudienceItems: { refType: new ListType(BuiltinTypes.UNKNOWN) },
      isPublic: { refType: BuiltinTypes.BOOLEAN },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
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
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
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
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })


  const datasetJoinTrailElemID = new ElemID(constants.NETSUITE, 'dataset_joinTrail')
  const datasetJoinTrail = createMatchingObjectType<JoinTrail>({
    elemID: datasetJoinTrailElemID,
    annotations: {
    },
    fields: {
      baseRecord: { refType: datasetBaseRecord },
      joins: { refType: new ListType(BuiltinTypes.UNKNOWN) },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
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
      fieldValidityState: {
        refType: BuiltinTypes.STRING,
        annotations: {
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ values: validityList }),
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const datasetLabelElemID = new ElemID(constants.NETSUITE, 'dataset_label')
  const datasetLabel = createMatchingObjectType<Label>({
    elemID: datasetLabelElemID,
    annotations: {
    },
    fields: {
      translationScriptId: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const datasetFormulaFormulaElemID = new ElemID(constants.NETSUITE, 'dataset_formula_formula')
  const datasetFormulaFormula = createMatchingObjectType<FormulaFormula>({
    elemID: datasetFormulaFormulaElemID,
    annotations: {
      XML_TYPE_DESCRIBER: 'formula',
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
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const datasetFormulaElemID = new ElemID(constants.NETSUITE, 'dataset_formula')
  const datasetFormula = createMatchingObjectType<Formula>({
    elemID: datasetFormulaElemID,
    annotations: {
    },
    fields: {
      fields: { refType: BuiltinTypes.UNKNOWN },
      formula: { refType: datasetFormulaFormula },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const datasetFieldOrFormulaElemID = new ElemID(constants.NETSUITE, 'dataset_fieldOrFormula')
  const datasetFieldOrFormula = createMatchingObjectType<FieldOrFormula>({
    elemID: datasetFieldOrFormulaElemID,
    annotations: {
      XML_TYPE_DESCRIBER: 'field or formula',
    },
    fields: {
      fieldReference: { refType: datasetFieldReference },
      dataSetFormula: { refType: datasetFormula },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })
  datasetFormula.fields.fields.refType = createRefToElmWithValue(new ListType(datasetFieldOrFormula))

  const datasetColumnElemID = new ElemID(constants.NETSUITE, 'dataset_column')
  const datasetColumn = createMatchingObjectType<Column>({
    elemID: datasetColumnElemID,
    annotations: {
    },
    fields: {
      alias: { refType: BuiltinTypes.STRING },
      columnId: { refType: BuiltinTypes.NUMBER },
      field: { refType: datasetFieldOrFormula },
      label: { refType: datasetLabel },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const datasetDescriptionElemID = new ElemID(constants.NETSUITE, 'dataset_description') // not sure
  const datasetDescription = createMatchingObjectType<Description>({
    elemID: datasetDescriptionElemID,
    annotations: {
    },
    fields: {
      translationScriptId: { refType: createRefToElmWithValue(BuiltinTypes.STRING) },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const datasetNameElemID = new ElemID(constants.NETSUITE, 'dataset_name') // not sure
  const datasetName = createMatchingObjectType<Name>({
    elemID: datasetNameElemID,
    annotations: {
    },
    fields: {
      translationScriptId: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const expressionValueElemID = new ElemID(constants.NETSUITE, 'dataset_criteria_expression_value')
  const expressionValue = createMatchingObjectType<CriteriaExpressionValue>({
    elemID: expressionValueElemID,
    annotations: {
    },
    fields: {
      type: { refType: BuiltinTypes.STRING },
      value: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const expressionElemID = new ElemID(constants.NETSUITE, 'dataset_criteria_expression')
  const expression = createMatchingObjectType<CriteriaExpression>({
    elemID: expressionElemID,
    annotations: {
    },
    fields: {
      label: { refType: BuiltinTypes.STRING },
      subType: { refType: BuiltinTypes.UNKNOWN },
      uiData: { refType: new ListType(BuiltinTypes.STRING) },
      value: { refType: expressionValue },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
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
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const datasetOperatorElemID = new ElemID(constants.NETSUITE, 'dataset_operator')
  const datasetOperator = createMatchingObjectType<Operator>({
    elemID: datasetOperatorElemID,
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
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
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
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const datasetFilterElemID = new ElemID(constants.NETSUITE, 'dataset_filter')
  const datasetFilter = createMatchingObjectType<Filter>({
    elemID: datasetFilterElemID,
    annotations: {
    },
    fields: {
      caseSensitive: { refType: BuiltinTypes.BOOLEAN },
      expressions: { refType: new ListType(expression) },
      operator: {
        refType: datasetOperator,
      },
      targetFieldContext: { refType: datasetTargetFieldContext },
      field: { refType: datasetFieldOrFormula },
      fieldStateName: { refType: BuiltinTypes.STRING },
      meta: { refType: datasetMeta },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const datasetConditionElemID = new ElemID(constants.NETSUITE, 'dataset_condition')
  const datasetCondition = createMatchingObjectType<Condition>({
    elemID: datasetConditionElemID,
    annotations: {
    },
    fields: {
      children: { refType: BuiltinTypes.UNKNOWN },
      operator: { refType: datasetOperator },
      targetFieldContext: { refType: datasetTargetFieldContext },
      meta: { refType: datasetMeta },
      field: { refType: datasetFieldOrFormula },
      fieldStateName: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const datasetCriteriaElemID = new ElemID(constants.NETSUITE, 'dataset_criteria')
  const datasetCriteria = createMatchingObjectType<ConditionOrFilter>({
    elemID: datasetCriteriaElemID,
    annotations: {
      XML_TYPE_DESCRIBER: 'criteria',
    },
    fields: {
      condition: { refType: datasetCondition },
      filter: { refType: datasetFilter },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  datasetCondition.fields.children.refType = createRefToElmWithValue(new ListType(datasetCriteria))

  innerTypes.audience = datasetAudience
  innerTypes.baseRecord = datasetBaseRecord
  innerTypes.column = datasetColumn
  innerTypes.condition = datasetCondition
  innerTypes.context = datasetTargetFieldContext
  innerTypes.criteriaMeta = datasetMeta
  innerTypes.criteria = datasetCriteria
  innerTypes.dependencies = datasetDependencies
  innerTypes.description = datasetDescription
  innerTypes.expression = expression
  innerTypes.expressionValue = expressionValue
  innerTypes.fieldOrFormula = datasetFieldOrFormula
  innerTypes.fieldReference = datasetFieldReference
  innerTypes.filter = datasetFilter
  innerTypes.formula = datasetFormula
  innerTypes.formulaFormula = datasetFormulaFormula
  innerTypes.joinTrail = datasetJoinTrail
  innerTypes.label = datasetLabel
  innerTypes.name = datasetName
  innerTypes.operator = datasetOperator

  const datasetElemID = new ElemID(constants.NETSUITE, 'dataset')
  const dataset = createMatchingObjectType<ParsedDataset>({
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
        refType: datasetName,
        // refType: createRefToElmWithValue(BuiltinTypes.STRING),
        // annotations: {
        //   [CORE_ANNOTATIONS.REQUIRED]: true,
        //   // [constants.IS_ATTRIBUTE]: true,
        // },
      },
      dependencies: { refType: datasetDependencies },
      applicationId: { refType: BuiltinTypes.UNKNOWN },
      audience: { refType: datasetAudience },
      baseRecord: { refType: datasetBaseRecord },
      columns: { refType: new ListType(datasetColumn) },
      criteria: { refType: datasetCriteria },
      description: { refType: datasetDescription },
      formulas: { refType: new ListType(datasetFieldOrFormula) },
      id: { refType: BuiltinTypes.UNKNOWN },
      ownerId: { refType: BuiltinTypes.NUMBER },
      version: { refType: BuiltinTypes.STRING },
      scriptId: { refType: BuiltinTypes.UNKNOWN },
    },
    annotations: {
      XML_TYPE_DESCRIBER: 'dataSet',
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })
  return { type: dataset, innerTypes }
}
