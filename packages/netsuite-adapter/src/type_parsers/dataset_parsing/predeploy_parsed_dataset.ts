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

import { Value, ElemID, BuiltinTypes, CORE_ANNOTATIONS, createRestriction, ListType, createRefToElmWithValue, Field, ObjectType } from '@salto-io/adapter-api'
import { createMatchingObjectType } from '@salto-io/adapter-utils'
import * as constants from '../../constants'
import { ConditionOrFilter, Column, FieldOrFormula, ParsedDatasetType } from './parsed_dataset'

type UnknownList = {
  '@_type': 'array'
  '_ITEM_': Value[]
}

type StringList = {
  '@_type': 'array'
  '_ITEM_': string[]
}

type ConditionOrFilterList = {
  '@_type': 'array'
  '_ITEM_': ConditionOrFilter[]
}

type ColumnList = {
  '@_type': 'array'
  '_ITEM_': Column[]
}

type FieldOrFormulaList = {
  '@_type': 'array'
  '_ITEM_': FieldOrFormula[]
}

type ExpressionList = {
  '@_type': 'array'
  '_ITEM_': FieldOrFormula[]
}

type DatasetBoolean = {
  '@_type': 'boolean'
  '#text': 'true' | 'false'
}


export const PreDeployParsedDatasetType = (): ObjectType => {
  const wantedType = ParsedDatasetType()

  const datasetBoolean = createMatchingObjectType<DatasetBoolean>({
    elemID: new ElemID(constants.NETSUITE, 'dataset_boolean'),
    annotations: {
    },
    fields: {
      '@_type': {
        refType: BuiltinTypes.STRING,
        annotations: {
          _required: true,
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ regex: 'boolean' }),
        },
      },
      '#text': {
        refType: BuiltinTypes.STRING,
        annotations: {
          _required: true,
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ values: ['true', 'false'] }),
        },
      },
    },
  })

  const unknownList = createMatchingObjectType<UnknownList>({
    elemID: new ElemID(constants.NETSUITE, 'dataset_unknown_list'),
    annotations: {
    },
    fields: {
      '@_type': {
        refType: BuiltinTypes.STRING,
        annotations: {
          _required: true,
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ regex: 'array' }),
        },
      },
      _ITEM_: {
        refType: new ListType(BuiltinTypes.UNKNOWN),
        annotations: {
          _required: true,
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const stringList = createMatchingObjectType<StringList>({
    elemID: new ElemID(constants.NETSUITE, 'dataset_string_list'),
    annotations: {
    },
    fields: {
      '@_type': {
        refType: BuiltinTypes.STRING,
        annotations: {
          _required: true,
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ regex: 'array' }),
        },
      },
      _ITEM_: {
        refType: new ListType(BuiltinTypes.STRING),
        annotations: {
          _required: true,
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const criteriaList = createMatchingObjectType<ConditionOrFilterList>({
    elemID: new ElemID(constants.NETSUITE, 'dataset_criteria_list'),
    annotations: {
    },
    fields: {
      '@_type': {
        refType: BuiltinTypes.STRING,
        annotations: {
          _required: true,
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ regex: 'array' }),
        },
      },
      _ITEM_: {
        refType: new ListType(wantedType.innerTypes.criteria),
        annotations: {
          _required: true,
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const columnList = createMatchingObjectType<ColumnList>({
    elemID: new ElemID(constants.NETSUITE, 'dataset_column_list'),
    annotations: {
    },
    fields: {
      '@_type': {
        refType: BuiltinTypes.STRING,
        annotations: {
          _required: true,
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ regex: 'array' }),
        },
      },
      _ITEM_: {
        refType: new ListType(wantedType.innerTypes.column),
        annotations: {
          _required: true,
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const fieldorFormulaList = createMatchingObjectType<FieldOrFormulaList>({
    elemID: new ElemID(constants.NETSUITE, 'dataset_field_or_formula_list'),
    annotations: {
    },
    fields: {
      '@_type': {
        refType: BuiltinTypes.STRING,
        annotations: {
          _required: true,
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ regex: 'array' }),
        },
      },
      _ITEM_: {
        refType: new ListType(wantedType.innerTypes.fieldOrFormula),
        annotations: {
          _required: true,
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })

  const expressionList = createMatchingObjectType<ExpressionList>({
    elemID: new ElemID(constants.NETSUITE, 'dataset_expression_list'),
    annotations: {
    },
    fields: {
      '@_type': {
        refType: BuiltinTypes.STRING,
        annotations: {
          _required: true,
          [CORE_ANNOTATIONS.RESTRICTION]: createRestriction({ regex: 'array' }),
        },
      },
      _ITEM_: {
        refType: new ListType(wantedType.innerTypes.expression),
        annotations: {
          _required: true,
        },
      },
    },
    path: [constants.NETSUITE, constants.TYPES_PATH, constants.DATASET],
  })
  wantedType.innerTypes.joinTrail.fields.joins.refType = createRefToElmWithValue(unknownList)
  wantedType.innerTypes.formula.fields.fields.refType = createRefToElmWithValue(fieldorFormulaList)
  wantedType.innerTypes.filter.fields.caseSensitive.refType = createRefToElmWithValue(datasetBoolean)
  wantedType.innerTypes.filter.fields.expressions.refType = createRefToElmWithValue(expressionList)
  wantedType.innerTypes.condition.fields.children.refType = createRefToElmWithValue(criteriaList)
  wantedType.innerTypes.audience.fields.AudienceItems.refType = createRefToElmWithValue(datasetBoolean)
  wantedType.innerTypes.audience.fields.isPublic.refType = createRefToElmWithValue(unknownList)
  wantedType.innerTypes.expression.fields.uiData.refType = createRefToElmWithValue(stringList)
  wantedType.type.fields.columns.refType = createRefToElmWithValue(columnList)
  wantedType.type.fields.version.refType = createRefToElmWithValue(datasetBoolean)
  wantedType.type.fields.formulas.refType = createRefToElmWithValue(fieldorFormulaList)
  wantedType.type.fields.formulas = new Field(wantedType.type, 'formulas', fieldorFormulaList)
  return wantedType.type
}
