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

// import { logger } from '@salto-io/logging'
import { BuiltinTypes, CORE_ANNOTATIONS, ElemID, ListType, ObjectType, createRefToElmWithValue, createRestriction } from '@salto-io/adapter-api'
import { createMatchingObjectType } from '@salto-io/adapter-utils'
import { TypeAndInnerTypes } from '../../types/object_types'
import * as constants from '../../constants'
import { ApplicationId, Audience, BaseRecord, Condition, ConditionOrFilter, DEFAULT_VALUE, DO_NOT_ADD, DefinitionId, DefinitionScriptId, Dependencies, Expression, ExpressionValue, FieldOrFormula, FieldReference, Filter, Formula, FormulaFormula, Join, JoinTrail, Meta, Operator, T, TYPE, TranslationType, XML_TYPE } from '../dataset_parsing/parsed_dataset'
import { fieldTypes } from '../../types/field_types'

// const log = logger(module)

const targetFieldContextNameList = ['DEFAULT', 'DISPLAY', 'HIERARCHY', 'IDENTIFIER', 'HIERARCHY_IDENTIFIER'] as const
const fieldStateNameList = ['display', 'raw', 'hierarchy'] as const

type TargetFieldContextName = typeof targetFieldContextNameList[number]
type FieldStateName = typeof fieldStateNameList[number]

type TargetFieldContext = {
  name?: TargetFieldContextName
}

type Sorting = {
  caseSensitive?: boolean
  direction?: 'ASCENDING' | 'DESCENDING'
  localeId?: string
  nullFirst?: boolean
  order?: number
}

type ConditionalFormatFilter = {
  expressions?: ExpressionValue
  operator?: Operator
}

type FormatRuleFilter = {
  conditionalFormatFilter?: ConditionalFormatFilter
}

type RgbColor = {
  blue?: number
  green?: number
  red?: number
}

type BackgroundColor = {
  rgbColor?: RgbColor // is it true that this is rgbColor and not Color?
}

type Color = {
  rgbColor?: RgbColor
}

type Icon = {
  color?: Color
  image?: string
}

type Style = {
  backgroundColor?: BackgroundColor
  icon?: Icon
}

type ConditionalFormatRule = {
  filter?: FormatRuleFilter
  id?: string
  style?: Style
}

type FormatRule = {
  conditionalFormatRule?: ConditionalFormatRule
}

type CellConditionalFormat = {
  formatRules?: FormatRule[]
  id?: string
}

type ConditionalFormat = {
  cellConditionalFormat?: CellConditionalFormat
}

type Column = {
  conditionalFormat?: ConditionalFormat[]
  criterion?: Filter
  customLabel?: TranslationType
  dataSetColumnId?: number
  datasetScriptId?: string
  fieldStateName?: FieldStateName
  sorting?: Sorting
  targetFieldContext?: TargetFieldContext
  width?: number
}

type VisualizationTypeBasics = {
  applicationId?: ApplicationId
  datasets?: string[]
  id?: DefinitionId
  name?: TranslationType
  scriptId?: DefinitionScriptId
  workbook?: string
  version?: string
}

type ChartOrPivot = VisualizationTypeBasics & {
  definition?: string
  format?: string
  datasetLink?: string
  order?: number
}

type DsLink = VisualizationTypeBasics & {
  mapping?: string
}

type DataView = VisualizationTypeBasics & {
  columns?: Column[]
  order?: number
}

type visualizationType = {
  chart?: VisualizationTypeBasics
  dsLink?: VisualizationTypeBasics
  dataView?: VisualizationTypeBasics
  pivot?: VisualizationTypeBasics
}

type InnerWorkbook = {
  applicationId?: ApplicationId
  audience?: Audience
  chartIDs?: string[]
  dataViewIDs?: string[]
  description?: TranslationType
  id?: DefinitionId
  name?: TranslationType
  ownerId?: number
  pivotIDs?: string[]
  scriptId?: DefinitionScriptId
  version?: string
}

type WorkbookDefinitionType = {
  charts?: visualizationType[]
  datasetLinks?: visualizationType[]
  dataViews?: visualizationType[]
  pivots?: visualizationType[]
  Workbook?: InnerWorkbook
}

// type ScriptidListElement = {
//   scriptid: string
// }

export type Workbook = {
  scriptid: string
  name: string
  dependencies?: {
    dependency?: string[]
  }
  definition?: string
  // tables?: ScriptidListElement[]
  // charts?: ScriptidListElement[]
  // pivots?: ScriptidListElement[]
} & WorkbookDefinitionType


export const ParsedWorkbookType = (): TypeAndInnerTypes => {
  const innerTypes: Record<string, ObjectType> = {}

  const workbookTargetFieldContextElemID = new ElemID(constants.NETSUITE, 'workbook_target_field_context')
  const workbookTargetFieldContext = createMatchingObjectType<TargetFieldContext>({
    elemID: workbookTargetFieldContextElemID,
    annotations: {
    },
    fields: {
      name: {
        refType: BuiltinTypes.STRING,
        annotations: {
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ values: targetFieldContextNameList }),
          [DEFAULT_VALUE]: 'DEFAULT',
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookTargetFieldContext = workbookTargetFieldContext

  const workbookSortingElemID = new ElemID(constants.NETSUITE, 'workbook_sorting')
  const workbookSorting = createMatchingObjectType<Sorting>({
    elemID: workbookSortingElemID,
    annotations: {
    },
    fields: {
      caseSensitive: { refType: BuiltinTypes.BOOLEAN },
      direction: {
        refType: BuiltinTypes.STRING,
        annotations: {
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ values: ['ASCENDING', 'DESCENDING'] }),
        },
      },
      localeId: { refType: BuiltinTypes.STRING },
      nullFirst: { refType: BuiltinTypes.BOOLEAN },
      order: { refType: BuiltinTypes.NUMBER },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookSorting = workbookSorting

  const workbookExpressionValueElemID = new ElemID(constants.NETSUITE, 'workbook_expression_value')
  const workbookExpressionValue = createMatchingObjectType<ExpressionValue>({
    elemID: workbookExpressionValueElemID,
    annotations: {
    },
    fields: {
      type: { refType: BuiltinTypes.STRING },
      value: { refType: BuiltinTypes.UNKNOWN },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookExpressionValue = workbookExpressionValue

  const workbookExpressionElemID = new ElemID(constants.NETSUITE, 'workbook_expression')
  const workbookExpression = createMatchingObjectType<Expression>({
    elemID: workbookExpressionElemID,
    annotations: {
    },
    fields: {
      label: { refType: BuiltinTypes.STRING },
      subType: { refType: BuiltinTypes.UNKNOWN },
      uiData: { refType: new ListType(BuiltinTypes.STRING) },
      value: { refType: workbookExpressionValue },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookExpression = workbookExpression

  const workbookOperatorElemID = new ElemID(constants.NETSUITE, 'workbook_operator')
  const workbookOperator = createMatchingObjectType<Operator>({
    elemID: workbookOperatorElemID,
    annotations: {
    },
    fields: {
      code: {
        refType: BuiltinTypes.STRING,
        annotations: {
          [DEFAULT_VALUE]: 'AND',
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookOperator = workbookOperator

  const workbookConditionalFormatFilterElemID = new ElemID(constants.NETSUITE, 'workbook_conditional_format_filter')
  const workbookConditionalFormatFilter = createMatchingObjectType<ConditionalFormatFilter>({
    elemID: workbookConditionalFormatFilterElemID,
    annotations: {
    },
    fields: {
      expressions: { refType: workbookExpressionValue },
      operator: { refType: workbookOperator },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookConditionalFormatFilter = workbookConditionalFormatFilter

  const workbookFormatRuleFilterElemID = new ElemID(constants.NETSUITE, 'workbook_format_rule_filter')
  const workbookFormatRuleFilter = createMatchingObjectType<FormatRuleFilter>({
    elemID: workbookFormatRuleFilterElemID,
    annotations: {
      [XML_TYPE]: true,
    },
    fields: {
      conditionalFormatFilter: {
        refType: workbookConditionalFormatFilter,
        annotations: {
          [DO_NOT_ADD]: true,
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookFormatRuleFilter = workbookFormatRuleFilter

  const workbookRgbColorElemID = new ElemID(constants.NETSUITE, 'workbook_rgb_color')
  const workbookRgbColor = createMatchingObjectType<RgbColor>({
    elemID: workbookRgbColorElemID,
    annotations: {
    },
    fields: {
      blue: { refType: BuiltinTypes.NUMBER },
      green: { refType: BuiltinTypes.NUMBER },
      red: { refType: BuiltinTypes.NUMBER },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookRgbColor = workbookRgbColor

  const workbookColorElemID = new ElemID(constants.NETSUITE, 'workbook_color')
  const workbookColor = createMatchingObjectType<Color>({
    elemID: workbookColorElemID,
    annotations: {
      [XML_TYPE]: true,
    },
    fields: {
      rgbColor: {
        refType: workbookRgbColor,
        annotations: {
          [DO_NOT_ADD]: true,
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookColor = workbookColor

  const workbookBackgroundColorElemID = new ElemID(constants.NETSUITE, 'workbook_background_color')
  const workbookBackgroundColor = createMatchingObjectType<BackgroundColor>({
    elemID: workbookBackgroundColorElemID,
    annotations: {
      [XML_TYPE]: true,
    },
    fields: {
      rgbColor: {
        refType: workbookRgbColor,
        annotations: {
          [DO_NOT_ADD]: true,
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookBackgroundColor = workbookBackgroundColor

  const workbookIconElemID = new ElemID(constants.NETSUITE, 'workbook_icon')
  const workbookIcon = createMatchingObjectType<Icon>({
    elemID: workbookIconElemID,
    annotations: {
    },
    fields: {
      color: { refType: workbookColor },
      image: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookIcon = workbookIcon

  const workbookStyleElemID = new ElemID(constants.NETSUITE, 'workbook_style')
  const workbookStyle = createMatchingObjectType<Style>({
    elemID: workbookStyleElemID,
    annotations: {
    },
    fields: {
      backgroundColor: { refType: workbookBackgroundColor },
      icon: { refType: workbookIcon },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookStyle = workbookStyle

  const workbookConditionalFormatRuleElemID = new ElemID(constants.NETSUITE, 'workbook_conditional_format_rule')
  const workbookConditionalFormatRule = createMatchingObjectType<ConditionalFormatRule>({
    elemID: workbookConditionalFormatRuleElemID,
    annotations: {
    },
    fields: {
      filter: { refType: workbookFormatRuleFilter },
      id: { refType: BuiltinTypes.STRING },
      style: { refType: workbookStyle },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookConditionalFormatRule = workbookConditionalFormatRule

  const workbookFormatRuleElemID = new ElemID(constants.NETSUITE, 'workbook_format_rule')
  const workbookFormatRule = createMatchingObjectType<FormatRule>({
    elemID: workbookFormatRuleElemID,
    annotations: {
      [XML_TYPE]: true,
    },
    fields: {
      conditionalFormatRule: {
        refType: workbookConditionalFormatRule,
        annotations: {
          [DO_NOT_ADD]: true,
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookFormatRule = workbookFormatRule

  const workbookCellConditionalFormatElemID = new ElemID(constants.NETSUITE, 'workbook_cell_conditional_format')
  const workbookCellConditionalFormat = createMatchingObjectType<CellConditionalFormat>({
    elemID: workbookCellConditionalFormatElemID,
    annotations: {
    },
    fields: {
      formatRules: { refType: new ListType(workbookFormatRule) },
      id: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookCellConditionalFormat = workbookCellConditionalFormat

  const workbookConditionalFormatElemID = new ElemID(constants.NETSUITE, 'workbook_conditional_format')
  const workbookConditionalFormat = createMatchingObjectType<ConditionalFormat>({
    elemID: workbookConditionalFormatElemID,
    annotations: {
      [XML_TYPE]: true,
    },
    fields: {
      cellConditionalFormat: {
        refType: workbookCellConditionalFormat,
        annotations: {
          [DO_NOT_ADD]: true,
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookConditionalFormat = workbookConditionalFormat

  const workbookTranslationElemID = new ElemID(constants.NETSUITE, 'workbook_translation')
  const workbookTranslation = createMatchingObjectType<TranslationType>({
    elemID: workbookTranslationElemID,
    annotations: {
    },
    fields: {
      translationScriptId: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookTranslation = workbookTranslation

  const workbookBaseRecordElemID = new ElemID(constants.NETSUITE, 'workbook_baseRecord')
  const workbookBaseRecord = createMatchingObjectType<BaseRecord>({
    elemID: workbookBaseRecordElemID,
    annotations: {
    },
    fields: {
      id: { refType: BuiltinTypes.STRING },
      label: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookBaseRecord = workbookBaseRecord

  const workbookJoinElemID = new ElemID(constants.NETSUITE, 'dataset_join')
  const workbookJoin = createMatchingObjectType<Join>({
    elemID: workbookJoinElemID,
    annotations: {
    },
    fields: {
      id: { refType: BuiltinTypes.STRING },
      targetRecordType: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })
  innerTypes.workbookJoin = workbookJoin

  const workbookJoinTrailElemID = new ElemID(constants.NETSUITE, 'workbook_joinTrail')
  const workbookJoinTrail = createMatchingObjectType<JoinTrail>({
    elemID: workbookJoinTrailElemID,
    annotations: {
    },
    fields: {
      baseRecord: { refType: workbookBaseRecord },
      joins: { refType: new ListType(workbookJoin) },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookJoinTrail = workbookJoinTrail

  const workbookFieldReferenceElemID = new ElemID(constants.NETSUITE, 'workbook_fieldReference')
  const workbookFieldReference = createMatchingObjectType<FieldReference>({
    elemID: workbookFieldReferenceElemID,
    annotations: {
    },
    fields: {
      id: { refType: BuiltinTypes.STRING },
      joinTrail: { refType: workbookJoinTrail },
      label: { refType: BuiltinTypes.STRING },
      uniqueId: { refType: BuiltinTypes.STRING },
      fieldValidityState: {
        refType: BuiltinTypes.STRING,
        annotations: {
          [DO_NOT_ADD]: true,
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookFieldReference = workbookFieldReference

  const workbookFormulaFormulaElemID = new ElemID(constants.NETSUITE, 'workbook_formula_formula')
  const workbookFormulaFormula = createMatchingObjectType<FormulaFormula>({
    elemID: workbookFormulaFormulaElemID,
    annotations: {
      [XML_TYPE]: true,
    },
    fields: {
      dataType: {
        refType: BuiltinTypes.STRING,
        annotations: {
        },
      },
      formulaSQL: { refType: BuiltinTypes.STRING },
      id: { refType: BuiltinTypes.STRING },
      label: { refType: workbookTranslation },
      uniqueId: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookFormulaFormula = workbookFormulaFormula

  const workbookFormulaElemID = new ElemID(constants.NETSUITE, 'workbook_formula')
  const workbookFormula = createMatchingObjectType<Formula>({
    elemID: workbookFormulaElemID,
    annotations: {
    },
    fields: {
      fields: { refType: BuiltinTypes.UNKNOWN },
      formula: { refType: workbookFormulaFormula },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookFormula = workbookFormula

  const workbookFieldOrFormulaElemID = new ElemID(constants.NETSUITE, 'workbook_fieldOrFormula')
  const workbookFieldOrFormula = createMatchingObjectType<FieldOrFormula>({
    elemID: workbookFieldOrFormulaElemID,
    annotations: {
      [XML_TYPE]: true,
    },
    fields: {
      fieldReference: {
        refType: workbookFieldReference,
        annotations: {
          [DO_NOT_ADD]: true,
        },
      },
      dataSetFormula: {
        refType: workbookFormula,
        annotations: {
          [DO_NOT_ADD]: true,
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  workbookFormula.fields.fields.refType = createRefToElmWithValue(new ListType(workbookFieldOrFormula))
  innerTypes.workbookFieldOrFormula = workbookFieldOrFormula

  const workbookMetaElemID = new ElemID(constants.NETSUITE, 'workbook_meta')
  const workbookMeta = createMatchingObjectType<Meta>({
    elemID: workbookMetaElemID,
    annotations: {
    },
    fields: {
      selectorType: { refType: BuiltinTypes.UNKNOWN },
      subType: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookMeta = workbookMeta

  const workbookFilterElemID = new ElemID(constants.NETSUITE, 'workbook_filter')
  const workbookFilter = createMatchingObjectType<Filter>({
    elemID: workbookFilterElemID,
    annotations: {
    },
    fields: {
      caseSensitive: { refType: BuiltinTypes.BOOLEAN },
      expressions: { refType: new ListType(workbookExpression) },
      operator: {
        refType: workbookOperator,
      },
      targetFieldContext: { refType: workbookTargetFieldContext },
      field: { refType: workbookFieldOrFormula },
      fieldStateName: { refType: BuiltinTypes.STRING },
      meta: { refType: workbookMeta },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookFilter = workbookFilter

  const workbookConditionElemID = new ElemID(constants.NETSUITE, 'workbook_condition')
  const workbookCondition = createMatchingObjectType<Condition>({
    elemID: workbookConditionElemID,
    annotations: {
    },
    fields: {
      children: { refType: BuiltinTypes.UNKNOWN },
      operator: { refType: workbookOperator },
      targetFieldContext: { refType: workbookTargetFieldContext },
      meta: { refType: workbookMeta },
      field: { refType: workbookFieldOrFormula },
      fieldStateName: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookCondition = workbookCondition

  const workbookCriterionElemID = new ElemID(constants.NETSUITE, 'workbook_criteria')
  const workbookCriterion = createMatchingObjectType<ConditionOrFilter>({
    elemID: workbookCriterionElemID,
    annotations: {
      [XML_TYPE]: true,
      [DEFAULT_VALUE]: {
        [T]: 'condition',
        condition: {
          children: { [TYPE]: 'array' },
          operator: { code: workbookOperator.fields.code.annotations[DEFAULT_VALUE] },
          targetFieldContext: { name: workbookTargetFieldContext.fields.name.annotations[DEFAULT_VALUE] },
          meta: { [TYPE]: 'null' },
          field: { [TYPE]: 'null' },
          fieldStateName: { [TYPE]: 'null' },
        },
      },
    },
    fields: {
      condition: {
        refType: workbookCondition,
        annotations: {
          [DO_NOT_ADD]: true,
        },
      },
      filter: {
        refType: workbookFilter,
        annotations: {
          [DO_NOT_ADD]: true,
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookCriterion = workbookCriterion

  workbookCondition.fields.children.refType = createRefToElmWithValue(new ListType(workbookCriterion))

  const workbookColumnElemID = new ElemID(constants.NETSUITE, 'workbook_column')
  const workbookColumn = createMatchingObjectType<Column>({
    elemID: workbookColumnElemID,
    annotations: {
    },
    fields: {
      conditionalFormat: { refType: new ListType(workbookConditionalFormat) },
      criterion: { refType: workbookCriterion },
      customLabel: { refType: workbookTranslation },
      dataSetColumnId: { refType: BuiltinTypes.NUMBER },
      datasetScriptId: { refType: BuiltinTypes.STRING },
      fieldStateName: {
        refType: BuiltinTypes.STRING,
        annotations: {
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ values: fieldStateNameList }),
        },
      },
      sorting: { refType: workbookSorting },
      targetFieldContext: { refType: workbookTargetFieldContext },
      width: { refType: BuiltinTypes.NUMBER },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookColumn = workbookColumn

  // const workbookVisualizationTypeBasicsElemID = new ElemID(constants.NETSUITE, 'workbook_visualization_type_basics')
  // const workbookVisualizationTypeBasics = createMatchingObjectType<VisualizationTypeBasics>({
  //   elemID: workbookVisualizationTypeBasicsElemID,
  //   annotations: {
  //   },
  //   fields: {
  //     applicationId: { refType: BuiltinTypes.UNKNOWN },
  //     datasets: { refType: new ListType(BuiltinTypes.STRING) },
  //     id: { refType: BuiltinTypes.UNKNOWN },
  //     name: { refType: workbookTranslation },
  //     order: { refType: BuiltinTypes.NUMBER },
  //     scriptId: { refType: BuiltinTypes.UNKNOWN },
  //     version: { refType: BuiltinTypes.STRING },
  //     workbook: { refType: BuiltinTypes.STRING },
  //   },
  //   path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  // })
  // innerTypes.workbookVisualizationTypeBasics = workbookVisualizationTypeBasics

  const workbookChartOrPivotElemID = new ElemID(constants.NETSUITE, 'workbook_chart_or_pivot')
  const workbookChartOrPivot = createMatchingObjectType<ChartOrPivot>({
    elemID: workbookChartOrPivotElemID,
    annotations: {
    },
    fields: {
      id: { refType: BuiltinTypes.UNKNOWN },
      scriptId: { refType: BuiltinTypes.UNKNOWN },
      applicationId: { refType: BuiltinTypes.UNKNOWN },
      version: { refType: BuiltinTypes.STRING },
      name: { refType: workbookTranslation },
      workbook: { refType: BuiltinTypes.STRING },
      datasets: { refType: new ListType(BuiltinTypes.STRING) },
      format: {
        refType: BuiltinTypes.STRING,
        annotations: {
        },
      },
      order: { refType: BuiltinTypes.NUMBER },
      definition: {
        refType: createRefToElmWithValue(fieldTypes.cdata),
        annotations: {
        },
      },
      datasetLink: {
        refType: BuiltinTypes.STRING,
        annotations: {
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookChartOrPivot = workbookChartOrPivot

  const workbookDsLinkElemID = new ElemID(constants.NETSUITE, 'workbook_dsLink')
  const workbookDsLink = createMatchingObjectType<DsLink>({
    elemID: workbookDsLinkElemID,
    annotations: {
    },
    fields: {
      id: { refType: BuiltinTypes.UNKNOWN },
      scriptId: { refType: BuiltinTypes.UNKNOWN },
      applicationId: { refType: BuiltinTypes.UNKNOWN },
      version: { refType: BuiltinTypes.STRING },
      name: { refType: workbookTranslation },
      workbook: { refType: BuiltinTypes.STRING },
      datasets: { refType: new ListType(BuiltinTypes.STRING) },
      mapping: {
        refType: createRefToElmWithValue(fieldTypes.cdata),
        annotations: {
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookDsLink = workbookDsLink

  const workbookDataViewElemID = new ElemID(constants.NETSUITE, 'workbook_data_view')
  const workbookDataView = createMatchingObjectType<DataView>({
    elemID: workbookDataViewElemID,
    annotations: {
    },
    fields: {
      id: { refType: BuiltinTypes.UNKNOWN },
      scriptId: { refType: BuiltinTypes.UNKNOWN },
      applicationId: { refType: BuiltinTypes.UNKNOWN },
      version: { refType: BuiltinTypes.STRING },
      name: { refType: workbookTranslation },
      workbook: { refType: BuiltinTypes.STRING },
      datasets: { refType: new ListType(BuiltinTypes.STRING) },
      columns: {
        refType: new ListType(workbookColumn),
        annotations: {
        },
      },
      order: { refType: BuiltinTypes.NUMBER },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookDataView = workbookDataView

  const workbookVisualizationTypeElemID = new ElemID(constants.NETSUITE, 'workbook_visualization_type')
  const workbookVisualizationType = createMatchingObjectType<visualizationType>({
    elemID: workbookVisualizationTypeElemID,
    annotations: {
      [XML_TYPE]: true,
    },
    fields: {
      chart: {
        refType: workbookChartOrPivot,
        annotations: {
          [DO_NOT_ADD]: true,
        },
      },
      dsLink: {
        refType: workbookDsLink,
        annotations: {
          [DO_NOT_ADD]: true,
        },
      },
      dataView: {
        refType: workbookDataView,
        annotations: {
          [DO_NOT_ADD]: true,
        },
      },
      pivot: {
        refType: workbookChartOrPivot,
        annotations: {
          [DO_NOT_ADD]: true,
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookVisualizationType = workbookVisualizationType

  const workbookAudienceElemID = new ElemID(constants.NETSUITE, 'workbook_audience')
  const workbookAudience = createMatchingObjectType<Audience>({
    elemID: workbookAudienceElemID,
    annotations: {
    },
    fields: {
      AudienceItems: { refType: new ListType(BuiltinTypes.UNKNOWN) },
      isPublic: { refType: BuiltinTypes.BOOLEAN },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookAudience = workbookAudience

  const workbookInnerWorkbookElemID = new ElemID(constants.NETSUITE, 'workbook_inner_workbook')
  const workbookInnerWorkbook = createMatchingObjectType<InnerWorkbook>({
    elemID: workbookInnerWorkbookElemID,
    annotations: {
      [XML_TYPE]: true,
    },
    fields: {
      id: { refType: BuiltinTypes.UNKNOWN },
      scriptId: { refType: BuiltinTypes.UNKNOWN },
      applicationId: { refType: BuiltinTypes.UNKNOWN },
      version: { refType: BuiltinTypes.STRING },
      name: { refType: workbookTranslation },
      audience: { refType: workbookAudience },
      ownerId: { refType: BuiltinTypes.NUMBER },
      description: { refType: workbookTranslation },
      dataViewIDs: { refType: new ListType(BuiltinTypes.STRING) },
      pivotIDs: { refType: new ListType(BuiltinTypes.STRING) },
      chartIDs: { refType: new ListType(BuiltinTypes.STRING) },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookInnerWorkbook = workbookInnerWorkbook

  const workbookDependenciesElemID = new ElemID(constants.NETSUITE, 'workbook_dependencies')
  const workbookDependencies = createMatchingObjectType<Dependencies>({
    elemID: workbookDependenciesElemID,
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
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  innerTypes.workbookDependencies = workbookDependencies

  const workbookElemID = new ElemID(constants.NETSUITE, 'workbook')
  const workbook = createMatchingObjectType<Workbook>({
    elemID: workbookElemID,
    annotations: {
    },
    fields: {
      scriptid: {
        refType: BuiltinTypes.STRING,
        annotations: {
          _required: true,
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ regex: '^custworkbook[0-9a-z_]+' }),
        },
      },
      name: {
        refType: BuiltinTypes.STRING,
        annotations: {
          _required: true,
        },
      },
      dependencies: {
        refType: createRefToElmWithValue(workbookDependencies),
        annotations: {
        },
      },
      definition: { refType: BuiltinTypes.STRING },
      charts: { refType: new ListType(workbookVisualizationType) },
      datasetLinks: { refType: new ListType(workbookVisualizationType) },
      dataViews: { refType: new ListType(workbookVisualizationType) },
      pivots: { refType: new ListType(workbookVisualizationType) },
      Workbook: { refType: workbookInnerWorkbook },
      // tables: { refType: new ListType(workbookScriptidListElement) },
      // charts: { refType: new ListType(workbookScriptidListElement) },
      // tables: { refType: new ListType(workbookScriptidListElement) },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  return { type: workbook, innerTypes }
}
