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
import { ApplicationId, Audience, BaseRecord, DefinitionId, DefinitionScriptId, Dependencies, Expression, ExpressionValue, FieldOrFormula, FieldReference, Filter, Formula, FormulaFormula, JoinTrail, Meta, Operator, TranslationType, codeList, formulaDataTypeList, validityList } from '../dataset_parsing/parsed_dataset'

// const log = logger(module)

const targetFieldContextNameList = ['DISPLAY', 'HIERARCHY', 'IDENTIFIER'] as const
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
  rgbColor?: RgbColor
}

type Style = {
  backgroundColor?: BackgroundColor
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
  order?: number
  scriptId?: DefinitionScriptId
  version?: string
  workbook?: string
  format?: string // ??? I don't know what this field is
  definition?: string
  mapping?: string
  columns?: Column[]
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
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })

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

  const expressionValueElemID = new ElemID(constants.NETSUITE, 'expression_value')
  const expressionValue = createMatchingObjectType<ExpressionValue>({
    elemID: expressionValueElemID,
    annotations: {
    },
    fields: {
      type: { refType: BuiltinTypes.STRING },
      value: { refType: BuiltinTypes.UNKNOWN },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })

  const workbookExpressionElemID = new ElemID(constants.NETSUITE, 'expression')
  const workbookExpression = createMatchingObjectType<Expression>({
    elemID: workbookExpressionElemID,
    annotations: {
    },
    fields: {
      label: { refType: BuiltinTypes.STRING },
      subType: { refType: BuiltinTypes.UNKNOWN },
      uiData: { refType: new ListType(BuiltinTypes.STRING) },
      value: { refType: expressionValue },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })

  const workbookOperatorElemID = new ElemID(constants.NETSUITE, 'workbook_operator')
  const workbookOperator = createMatchingObjectType<Operator>({
    elemID: workbookOperatorElemID,
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
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })

  const workbookConditionalFormatFilterElemID = new ElemID(constants.NETSUITE, 'workbook_conditional_format_filter')
  const workbookConditionalFormatFilter = createMatchingObjectType<ConditionalFormatFilter>({
    elemID: workbookConditionalFormatFilterElemID,
    annotations: {
    },
    fields: {
      expressions: { refType: expressionValue },
      operator: { refType: workbookOperator },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })

  const workbookFormatRuleFilterElemID = new ElemID(constants.NETSUITE, 'workbook_format_rule_filter')
  const workbookFormatRuleFilter = createMatchingObjectType<FormatRuleFilter>({
    elemID: workbookFormatRuleFilterElemID,
    annotations: {
    },
    fields: {
      conditionalFormatFilter: { refType: workbookConditionalFormatFilter },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })

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

  const workbookBackgroundColorElemID = new ElemID(constants.NETSUITE, 'workbook_background_color')
  const workbookBackgroundColor = createMatchingObjectType<BackgroundColor>({
    elemID: workbookBackgroundColorElemID,
    annotations: {
    },
    fields: {
      rgbColor: { refType: workbookRgbColor },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })

  const workbookStyleElemID = new ElemID(constants.NETSUITE, 'workbook_style')
  const workbookStyle = createMatchingObjectType<Style>({
    elemID: workbookStyleElemID,
    annotations: {
    },
    fields: {
      backgroundColor: { refType: workbookBackgroundColor },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })

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

  const workbookFormatRuleElemID = new ElemID(constants.NETSUITE, 'workbook_format_rule')
  const workbookFormatRule = createMatchingObjectType<FormatRule>({
    elemID: workbookFormatRuleElemID,
    annotations: {
    },
    fields: {
      conditionalFormatRule: { refType: workbookConditionalFormatRule },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })

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

  const workbookConditionalFormatElemID = new ElemID(constants.NETSUITE, 'workbook_conditional_format')
  const workbookConditionalFormat = createMatchingObjectType<ConditionalFormat>({
    elemID: workbookConditionalFormatElemID,
    annotations: {
    },
    fields: {
      cellConditionalFormat: { refType: workbookCellConditionalFormat },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })

  const workbookTranslationElemID = new ElemID(constants.NETSUITE, 'workbook_label')
  const workbookTranslation = createMatchingObjectType<TranslationType>({
    elemID: workbookTranslationElemID,
    annotations: {
    },
    fields: {
      translationScriptId: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })

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

  const workbookJoinTrailElemID = new ElemID(constants.NETSUITE, 'workbook_joinTrail')
  const workbookJoinTrail = createMatchingObjectType<JoinTrail>({
    elemID: workbookJoinTrailElemID,
    annotations: {
    },
    fields: {
      baseRecord: { refType: workbookBaseRecord },
      joins: { refType: new ListType(BuiltinTypes.UNKNOWN) },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })

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
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ values: validityList }),
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })

  const workbookFormulaFormulaElemID = new ElemID(constants.NETSUITE, 'workbook_formula_formula')
  const workbookFormulaFormula = createMatchingObjectType<FormulaFormula>({
    elemID: workbookFormulaFormulaElemID,
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
      label: { refType: workbookTranslation },
      uniqueId: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })

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

  const workbookFieldOrFormulaElemID = new ElemID(constants.NETSUITE, 'workbook_fieldOrFormula')
  const workbookFieldOrFormula = createMatchingObjectType<FieldOrFormula>({
    elemID: workbookFieldOrFormulaElemID,
    annotations: {
    },
    fields: {
      fieldReference: { refType: workbookFieldReference },
      dataSetFormula: { refType: workbookFormula },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })
  workbookFormula.fields.fields.refType = createRefToElmWithValue(new ListType(workbookFieldOrFormula))

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

  const workbookColumnElemID = new ElemID(constants.NETSUITE, 'workbook_column')
  const workbookColumn = createMatchingObjectType<Column>({
    elemID: workbookColumnElemID,
    annotations: {
    },
    fields: {
      conditionalFormat: { refType: new ListType(workbookConditionalFormat) },
      criterion: { refType: workbookFilter },
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

  const workbookVisualizationTypeBasicsElemID = new ElemID(constants.NETSUITE, 'workbook_visualization_type_basics')
  const workbookVisualizationTypeBasics = createMatchingObjectType<VisualizationTypeBasics>({
    elemID: workbookVisualizationTypeBasicsElemID,
    annotations: {
    },
    fields: {
      applicationId: { refType: BuiltinTypes.UNKNOWN },
      datasets: { refType: new ListType(BuiltinTypes.STRING) },
      id: { refType: BuiltinTypes.UNKNOWN },
      name: { refType: workbookTranslation },
      order: { refType: BuiltinTypes.NUMBER },
      scriptId: { refType: BuiltinTypes.UNKNOWN },
      version: { refType: BuiltinTypes.STRING },
      workbook: { refType: BuiltinTypes.STRING },
      format: { refType: BuiltinTypes.STRING },
      definition: { refType: BuiltinTypes.STRING },
      mapping: { refType: BuiltinTypes.STRING },
      columns: { refType: new ListType(workbookColumn) },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })

  const workbookVisualizationTypeElemID = new ElemID(constants.NETSUITE, 'workbook_visualization_type')
  const workbookVisualizationType = createMatchingObjectType<visualizationType>({
    elemID: workbookVisualizationTypeElemID,
    annotations: {
    },
    fields: {
      chart: { refType: workbookVisualizationTypeBasics },
      dsLink: { refType: workbookVisualizationTypeBasics },
      dataView: { refType: workbookVisualizationTypeBasics },
      pivot: { refType: workbookVisualizationTypeBasics },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })

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

  const workbookInnerWorkbookElemID = new ElemID(constants.NETSUITE, 'workbook_inner_workbook')
  const workbookInnerWorkbook = createMatchingObjectType<InnerWorkbook>({
    elemID: workbookInnerWorkbookElemID,
    annotations: {
    },
    fields: {
      applicationId: { refType: BuiltinTypes.UNKNOWN },
      audience: { refType: workbookAudience },
      chartIDs: { refType: new ListType(BuiltinTypes.STRING) },
      dataViewIDs: { refType: new ListType(BuiltinTypes.STRING) },
      description: { refType: workbookTranslation },
      id: { refType: BuiltinTypes.UNKNOWN },
      name: { refType: workbookTranslation },
      ownerId: { refType: BuiltinTypes.NUMBER },
      pivotIDs: { refType: new ListType(BuiltinTypes.STRING) },
      scriptId: { refType: BuiltinTypes.UNKNOWN },
      version: { refType: BuiltinTypes.STRING },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  })

  // const workbookDefinitionElemID = new ElemID(constants.NETSUITE, 'workbook_audience')
  // const workbookDefinition = createMatchingObjectType<WorkbookDefinitionType>({
  //   elemID: workbookDefinitionElemID,
  //   annotations: {
  //   },
  //   fields: {
  //     charts: { refType: new ListType(workbookVisualizationType) },
  //     datasetLinks: { refType: new ListType(workbookVisualizationType) },
  //     dataViews: { refType: new ListType(workbookVisualizationType) },
  //     pivots: { refType: new ListType(workbookVisualizationType) },
  //     innerWorkbook: { refType: workbookInnerWorkbook },
  //   },
  //   path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  // })

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

  // const workbookScriptidListElementElemID = new ElemID(constants.NETSUITE, 'workbook_tables_table')
  // const workbookScriptidListElement = createMatchingObjectType<ScriptidListElement>({
  //   elemID: workbookScriptidListElementElemID,
  //   annotations: {
  //   },
  //   fields: {
  //     scriptid: {
  //       refType: createRefToElmWithValue(BuiltinTypes.SERVICE_ID),
  //       annotations: {
  //         _required: true,
  //         [constants.IS_ATTRIBUTE]: true,
  //       },
  //     },
  //   },
  //   path: [constants.NETSUITE, constants.TYPES_PATH, constants.WORKBOOK],
  // })

  innerTypes.workbookOperator = workbookOperator
  innerTypes.workbookTargetFieldContext = workbookTargetFieldContext
  innerTypes.workbookSorting = workbookSorting
  innerTypes.expressionValue = expressionValue
  innerTypes.workbookExpression = workbookExpression
  innerTypes.workbookConditionalFormatFilter = workbookConditionalFormatFilter
  innerTypes.workbookFormatRuleFilter = workbookFormatRuleFilter
  innerTypes.workbookRgbColor = workbookRgbColor
  innerTypes.workbookBackgroundColor = workbookBackgroundColor
  innerTypes.workbookStyle = workbookStyle
  innerTypes.workbookConditionalFormatRule = workbookConditionalFormatRule
  innerTypes.workbookFormatRule = workbookFormatRule
  innerTypes.workbookCellConditionalFormat = workbookCellConditionalFormat
  innerTypes.workbookConditionalFormat = workbookConditionalFormat
  innerTypes.workbookTranslation = workbookTranslation
  innerTypes.workbookBaseRecord = workbookBaseRecord
  innerTypes.workbookJoinTrail = workbookJoinTrail
  innerTypes.workbookFieldReference = workbookFieldReference
  innerTypes.workbookFormulaFormula = workbookFormulaFormula
  innerTypes.workbookFormula = workbookFormula
  innerTypes.workbookFieldOrFormula = workbookFieldOrFormula
  innerTypes.workbookMeta = workbookMeta
  innerTypes.workbookFilter = workbookFilter
  innerTypes.workbookColumn = workbookColumn
  innerTypes.workbookVisualizationTypeBasics = workbookVisualizationTypeBasics
  innerTypes.workbookVisualizationType = workbookVisualizationType
  innerTypes.workbookAudience = workbookAudience
  innerTypes.workbookInnerWorkbook = workbookInnerWorkbook
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

// ############### inner XMLs ###############
// type CategoryDef = {
//   axis: Axis
//   dimensionTree:
// }

// type ChartDefinitionType = {
//   categoryDef: CategoryDef
//   legendDef: LegendDef
//   measures: Mesure[]
//   series: Series[]
//   subtitle: Subtitle
//   title: Title
//   version: string // I think
// }

// type DatasetLinkMappingType = {
// }

// type PivotDefinitionType = {
// }
// type Chart = VisualizationTypeBasics & ChartDefinitionType

// type DatasetLink = VisualizationTypeBasics & DatasetLinkMappingType

// type Pivot = VisualizationTypeBasics & PivotDefinitionType
