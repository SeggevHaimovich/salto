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

// can't deploy ownerId - do strange thing (change and stay after fetch, doesn't change the owner in the UI)

// TODO add all the options to all
const codeList = ['AND', 'OR',
  'ANY_OF',
  'EMPTY', 'EMPTY_NOT', 'CONTAIN', 'CONTAIN_NOT', 'ENDWITH', 'ENDWITH_NOT', 'IS', 'IS_NOT', 'START_WITH', 'START_WITH_NOT',
  'LESS', 'GREATER', 'EQUAL', 'EQUAL_NOT', 'GREATER_OR_EQUAL', 'LESS_OR_EQUAL', 'BETWEEN', 'BETWEEN_NOT'] as const
const criteriaTargetFieldContextNameList = ['DEFAULT', 'IDENTIFIER', 'UNCONSOLIDATED'] as const
const formulaDataTypeList = ['INTEGER', 'BOOLEAN', 'DATE', 'DATETIME', 'FLOAT', 'STRING', 'CLOBTEXT', 'PERCENT', 'DURATION'] as const

// should I just use string?
type Code = typeof codeList[number]
type criteriaTargetFieldContextName = typeof criteriaTargetFieldContextNameList[number]
type formulaDataType = typeof formulaDataTypeList[number]

type AudienceItem = Value
type FieldReferenceJoinTrailJoin = Value
type CriteriaExpressionSubType = Value
type CriteriaExpressionUiData = Value

// we should ignore these values
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

type FieldorFormula = FieldReference & Formula

type Column = {
  alias?: string
  columnId?: number
  field?: FieldorFormula
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
  name?: criteriaTargetFieldContextName
}

type Meta = {
  selectorType?: string
  subType?: string
}

type Criteria = {
  children?: Criteria[]
  caseSensitive?: boolean
  expressions?: CriteriaExpression[]
  field?: FieldorFormula
  fieldStateName?: string
  meta?: Meta
  operator?: Operator
  targetFieldContext?: CriteriaTargetFieldContext
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
      XML_TYPE_DESCRIBER: '_fieldReference_',
    },
    fields: {
      id: { refType: BuiltinTypes.STRING },
      joinTrail: { refType: datasetJoinTrail },
      label: { refType: BuiltinTypes.STRING },
      uniqueId: { refType: BuiltinTypes.STRING },
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
      XML_TYPE_DESCRIBER: '_formula_',
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
      XML_TYPE_DESCRIBER: '_dataSetFormula_',
    },
    fields: {
      fields: { refType: new ListType(datasetFieldReference) },
      formula: { refType: datasetFormulaFormula },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const datasetFieldOrFormulaElemID = new ElemID(constants.NETSUITE, 'dataset_fieldOrFormula')
  const datasetFieldOrFormula = createMatchingObjectType<FieldorFormula>({
    elemID: datasetFieldOrFormulaElemID,
    annotations: {
      XML_TYPE_DESCRIBER: 'field or formula',
    },
    fields: {
      id: { refType: BuiltinTypes.STRING },
      joinTrail: { refType: datasetJoinTrail },
      label: { refType: BuiltinTypes.STRING },
      uniqueId: { refType: BuiltinTypes.STRING },
      fields: { refType: new ListType(datasetFieldReference) },
      formula: { refType: datasetFormulaFormula },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

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

  const datasetCriteriaExpressionValueElemID = new ElemID(constants.NETSUITE, 'dataset_criteria_expression_value')
  const datasetCriteriaExpressionValue = createMatchingObjectType<CriteriaExpressionValue>({
    elemID: datasetCriteriaExpressionValueElemID,
    annotations: {
    },
    fields: {
      type: { refType: BuiltinTypes.STRING },
      value: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const datasetCriteriaExpressionElemID = new ElemID(constants.NETSUITE, 'dataset_criteria_expression')
  const datasetCriteriaExpression = createMatchingObjectType<CriteriaExpression>({
    elemID: datasetCriteriaExpressionElemID,
    annotations: {
    },
    fields: {
      label: { refType: BuiltinTypes.STRING },
      subType: { refType: BuiltinTypes.UNKNOWN },
      uiData: { refType: new ListType(BuiltinTypes.STRING) },
      value: { refType: datasetCriteriaExpressionValue },
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
      }, // dont know how to do it
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const datasetCriteriaElemID = new ElemID(constants.NETSUITE, 'dataset_criteria')
  const datasetCriteria = createMatchingObjectType<Criteria>({
    elemID: datasetCriteriaElemID,
    annotations: {
      XML_TYPE_DESCRIBER: 'criteria',
    },
    fields: {
      children: { refType: BuiltinTypes.UNKNOWN },
      caseSensitive: { refType: BuiltinTypes.BOOLEAN },
      expressions: { refType: new ListType(datasetCriteriaExpression) },
      operator: { refType: datasetOperator },
      targetFieldContext: { refType: datasetTargetFieldContext },
      field: { refType: datasetFieldOrFormula },
      fieldStateName: { refType: BuiltinTypes.STRING },
      meta: { refType: datasetMeta },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })
  datasetCriteria.fields.children.refType = createRefToElmWithValue(new ListType(datasetCriteria))

  // const datasetDefinitionElemID = new ElemID(constants.NETSUITE, 'dataset_definition')
  // export const datasetDefinition = createMatchingObjectType<DatasetDefinitionType>({
  //   elemID: datasetDefinitionElemID,
  //   annotations: {
  //   },
  //   fields: {
  //     applicationId: { refType: BuiltinTypes.UNKNOWN },
  //     audience: { refType: datasetAudience() },
  //     baseRecord: { refType: datasetBaseRecord() },
  //     columns: { refType: new ListType(datasetColumn()) },
  //     criteria: { refType: datasetCriteria() },
  //     description: { refType: datasetDescription() },
  //     formulas: { refType: new ListType(datasetFormula()) },
  //     id: { refType: BuiltinTypes.UNKNOWN },
  //     name: { refType: datasetName() },
  //     ownerId: { refType: BuiltinTypes.NUMBER },
  //     scriptId: { refType: BuiltinTypes.UNKNOWN },
  //     version: { refType: BuiltinTypes.STRING },
  //   },
  //   path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  // })

  innerTypes.name = datasetName
  innerTypes.audience = datasetAudience
  innerTypes.dependencies = datasetDependencies
  innerTypes.baseRecord = datasetBaseRecord
  innerTypes.joinTrail = datasetJoinTrail
  innerTypes.fieldReference = datasetFieldReference
  innerTypes.fieldorFormula = datasetFieldOrFormula
  innerTypes.column = datasetColumn
  innerTypes.description = datasetDescription
  innerTypes.label = datasetLabel
  innerTypes.formulaFormula = datasetFormulaFormula
  innerTypes.formula = datasetFormula
  innerTypes.criteriaExpressionValue = datasetCriteriaExpressionValue
  innerTypes.criteriaExpression = datasetCriteriaExpression
  innerTypes.criteriaMeta = datasetMeta
  innerTypes.operator = datasetOperator
  innerTypes.context = datasetTargetFieldContext
  innerTypes.criteria = datasetCriteria

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
        refType: createRefToElmWithValue(BuiltinTypes.STRING),
        annotations: {
          [CORE_ANNOTATIONS.REQUIRED]: true,
          // [constants.IS_ATTRIBUTE]: true,
        },
      },
      dependencies: { refType: datasetDependencies },
      applicationId: { refType: BuiltinTypes.UNKNOWN },
      audience: { refType: datasetAudience },
      baseRecord: { refType: datasetBaseRecord },
      columns: { refType: new ListType(datasetColumn) },
      criteria: { refType: datasetCriteria },
      description: { refType: datasetDescription },
      formulas: { refType: new ListType(datasetFormula) },
      id: { refType: BuiltinTypes.UNKNOWN },
      ownerId: { refType: BuiltinTypes.NUMBER },
      version: { refType: BuiltinTypes.STRING },
    },
    annotations: {
      XML_TYPE_DESCRIBER: '_dataset_',
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })
  return { type: dataset, innerTypes }
}
