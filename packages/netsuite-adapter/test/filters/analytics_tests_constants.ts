
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

/* eslint-disable camelcase */
import { InstanceElement, ReferenceExpression } from '@salto-io/adapter-api'
import { ParsedDataset, ParsedDatasetType } from '../../src/type_parsers/dataset_parsing/parsed_dataset'
import * as constants from '../../src/constants'
import { translationcollectionType } from '../../src/autogen/types/standard_types/translationcollection'
import { ParsedWorkbookType } from '../../src/type_parsers/workbook_parsing/parsed_workbook'

const dataset = ParsedDatasetType().type
const workbook = ParsedWorkbookType().type

// basic definition
const basicDatasetDefinitionOriginal = `
<root>
<_T_>dataSet</_T_>
<id type="null"/>
<scriptId type="null"/>
<applicationId type="null"/>
<version type="string">0.1</version>
<name>
  <translationScriptId>custcollectiontranslations_dataset_27_55a834ce148445fd9a604.dataset_name_1141_1</translationScriptId>
</name>
<audience>
  <AudienceItems type="array"/>
  <isPublic type="boolean">false</isPublic>
</audience>
<ownerId>5</ownerId>
<description type="null"/>
<baseRecord>
  <id>account</id>
  <label>Account</label>
</baseRecord>
<columns type="array">
  <_ITEM_>
    <columnId>5</columnId>
    <label type="null"/>
    <field>
      <_T_>fieldReference</_T_>
      <id>id</id>
      <label>Internal ID</label>
      <joinTrail>
        <baseRecord>
          <id>account</id>
          <label>Account</label>
        </baseRecord>
        <joins type="array"/>
      </joinTrail>
      <uniqueId>id</uniqueId>
    </field>
    <alias>id</alias>
  </_ITEM_>
</columns>
<criteria>
  <_T_>condition</_T_>
  <operator>
    <code>AND</code>
  </operator>
  <children type="array"/>
  <meta type="null"/>
  <field type="null"/>
  <targetFieldContext>
    <name>DEFAULT</name>
  </targetFieldContext>
  <fieldStateName type="null"/>
</criteria>
<formulas type="array"/>
</root>
`
const basicDatasetValue: ParsedDataset = {
  name: 'seggev test basic',
  scriptid: 'seggevTestBasic',
  definition: basicDatasetDefinitionOriginal,
}
export const basicDataset = new InstanceElement(
  'seggev basic',
  dataset,
  basicDatasetValue,
  [constants.NETSUITE, constants.DATASET],
)
export const parsedBasicDatasetValue = {
  scriptid: basicDatasetValue.scriptid,
  name: basicDatasetValue.name,
  version: '0.1',
  audience: {
    isPublic: false,
  },
  ownerId: 5,
  baseRecord: {
    id: 'account',
    label: 'Account',
  },
  columns: [
    {
      columnId: 5,
      field: {
        fieldReference: {
          id: 'id',
          label: 'Internal ID',
          joinTrail: {
            baseRecord: {
              id: 'account',
              label: 'Account',
            },
          },
          uniqueId: 'id',
        },
      },
      alias: 'id',
    },
  ],
  criteria: {
    condition: {
      operator: {
        code: 'AND',
      },
      targetFieldContext: {
        name: 'DEFAULT',
      },
    },
  },
}

export const parsedBasicDataset = new InstanceElement(
  'seggev parsed basic',
  dataset,
  parsedBasicDatasetValue,
  [constants.NETSUITE, constants.DATASET],
)

// definition with unknown attribute
const unknownDefinition = `
<root>
<_T_>dataSet</_T_>
<strangeAttribute type="string">0.5</strangeAttribute>
</root>
`
const unknownDatasetValue: ParsedDataset = {
  name: 'seggev test unknown',
  scriptid: 'seggevTestUnknown',
  definition: unknownDefinition,
}
export const unknownDataset = new InstanceElement(
  'seggev unknown',
  dataset,
  unknownDatasetValue,
  [constants.NETSUITE, constants.DATASET],
)
export const parsedUnknownDataset = {
  name: unknownDatasetValue.name,
  scriptid: unknownDatasetValue.scriptid,
  strangeAttribute: '0.5',
}

// translation collection

const custcollectiontranslations_workbook_example_value = {
  scriptid: 'custcollectiontranslations_workbook_example',
  defaultlanguage: 'en-US',
  strings: {
    string: {
      workbookname: {
        scriptid: 'workbookname',
        defaulttranslation: 'seggev',
        description: 'Name in workbook',
        index: 0,
      },
    },
  },
}
export const custcollectiontranslations_workbook_example = new InstanceElement(
  'custcollectiontranslations_workbook_example',
  translationcollectionType().type,
  custcollectiontranslations_workbook_example_value,
  [constants.NETSUITE, constants.TRANSLATION_COLLECTION],
)

// definition with references
const referenceDefinition = `
<root>
<name1>
  <translationScriptId>custcollectiontranslations_workbook_example.workbookname</translationScriptId>
</name1>
<name2>
  <translationScriptId>false.reference</translationScriptId>
</name>
<name3>
  <translationScriptId>a name without a reference</translationScriptId>
</name>
</root>
`
const workbookWithReferenceValue = {
  name: new ReferenceExpression(custcollectiontranslations_workbook_example.elemID.createNestedID('strings', 'string', 'workbookname', 'scriptid')),
  scriptid: 'seggevTestReference',
  definition: referenceDefinition,
}
export const workbookWithReference = new InstanceElement(
  'seggev reference',
  workbook,
  workbookWithReferenceValue,
  [constants.NETSUITE, constants.WORKBOOK],
)

export const parsedWorkbookWithReferenceValue = {
  name: workbookWithReferenceValue.name,
  scriptid: workbookWithReferenceValue.scriptid,
  name1: {
    translationScriptId: new ReferenceExpression(custcollectiontranslations_workbook_example.elemID.createNestedID('strings', 'string', 'workbookname', 'scriptid')),
  },
  name2: {
    translationScriptId: 'false.reference',
  },
  name3: {
    translationScriptId: 'a name without a reference',
  },
}
export const parsedWorkbookWithReference = new InstanceElement(
  'seggev parsed reference',
  workbook,
  parsedWorkbookWithReferenceValue,
  [constants.NETSUITE, constants.WORKBOOK],
)

// types check
const typesDefinition = `
<root>
<A>1</A>
<B type="string">1</B>
<C type="array">
  <_ITEM_>2</_ITEM_>
</C>
<D type="boolean">true</D>
<E type="null"/>
</root>
`
const typesValue: ParsedDataset = {
  name: 'seggev test types',
  scriptid: 'seggevTestTypes',
  definition: typesDefinition,
}
export const typesWorkbook = new InstanceElement(
  'seggev types',
  workbook,
  typesValue,
  [constants.NETSUITE, constants.WORKBOOK],
)
export const parsedTypesWorkbook = {
  name: typesValue.name,
  scriptid: typesValue.scriptid,
  A: 1,
  B: '1',
  C: [2],
  D: true,
}

export const emptyAnalyticValue = {
  name: 'seggev test empty',
  scriptid: 'seggevTestEmpty',
}
export const emptyDataset = new InstanceElement(
  'seggev empty',
  dataset,
  emptyAnalyticValue,
  [constants.NETSUITE, constants.DATASET],
)
export const emptyWorkbook = new InstanceElement(
  'seggev empty',
  workbook,
  emptyAnalyticValue,
  [constants.NETSUITE, constants.WORKBOOK],
)

export const emptyDatasetDefinition = '<root>\n  <scriptid type="null"></scriptid>\n  <name>seggev test empty</name>\n  <dependencies type="null"></dependencies>\n  <definition type="null"></definition>\n  <applicationId type="null"></applicationId>\n  <audience type="null"></audience>\n  <baseRecord type="null"></baseRecord>\n  <columns type="array"></columns>\n  <criteria>\n    <_T_>condition</_T_>\n    <children type="array"></children>\n    <operator>\n      <code>AND</code>\n    </operator>\n    <targetFieldContext>\n      <name>DEFAULT</name>\n    </targetFieldContext>\n    <meta type="null"></meta>\n    <field type="null"></field>\n    <fieldStateName type="null"></fieldStateName>\n  </criteria>\n  <description type="null"></description>\n  <formulas type="array"></formulas>\n  <id type="null"></id>\n  <ownerId type="null"></ownerId>\n  <version type="null"></version>\n  <scriptId type="null"></scriptId>\n  <_T_>dataSet</_T_>\n</root>\n'

export const basicDatasetDefinition = `<root>
  <version type="string">0.1</version>
  <audience>
    <isPublic type="boolean">false</isPublic>
    <AudienceItems type="array"></AudienceItems>
  </audience>
  <ownerId>5</ownerId>
  <baseRecord>
    <id>account</id>
    <label>Account</label>
  </baseRecord>
  <columns type="array">
    <_ITEM_>
      <columnId>5</columnId>
      <field>
        <_T_>fieldReference</_T_>
        <id>id</id>
        <label>Internal ID</label>
        <joinTrail>
          <baseRecord>
            <id>account</id>
            <label>Account</label>
          </baseRecord>
          <joins type="array"></joins>
        </joinTrail>
        <uniqueId>id</uniqueId>
      </field>
      <alias>id</alias>
      <label type="null"></label>
    </_ITEM_>
  </columns>
  <criteria>
    <_T_>condition</_T_>
    <operator>
      <code>AND</code>
    </operator>
    <targetFieldContext>
      <name>DEFAULT</name>
    </targetFieldContext>
    <children type="array"></children>
    <meta type="null"></meta>
    <field type="null"></field>
    <fieldStateName type="null"></fieldStateName>
  </criteria>
  <scriptid type="null"></scriptid>
  <name>seggev test basic</name>
  <dependencies type="null"></dependencies>
  <definition type="null"></definition>
  <applicationId type="null"></applicationId>
  <description type="null"></description>
  <formulas type="array"></formulas>
  <id type="null"></id>
  <scriptId type="null"></scriptId>
  <_T_>dataSet</_T_>
</root>
`
export const emptyWorkbookDefinition = `<root>
  <scriptid type="null"></scriptid>
  <name>seggev test empty</name>
  <dependencies type="null"></dependencies>
  <definition type="null"></definition>
  <charts type="array"></charts>
  <datasetLinks type="array"></datasetLinks>
  <dataViews type="array"></dataViews>
  <pivots type="array"></pivots>
  <Workbook>
    <id type="null"></id>
    <scriptId type="null"></scriptId>
    <applicationId type="null"></applicationId>
    <version type="null"></version>
    <name type="null"></name>
    <audience>
      <AudienceItems type="array"></AudienceItems>
      <isPublic type="boolean">false</isPublic>
    </audience>
    <ownerId type="null"></ownerId>
    <description type="null"></description>
    <dataViewIDs type="array"></dataViewIDs>
    <pivotIDs type="array"></pivotIDs>
    <chartIDs type="array"></chartIDs>
    <_T_>workbook</_T_>
  </Workbook>
</root>
`

export const referencePreDeployDefinition = `<root>
  <name1>
    <translationScriptId>custcollectiontranslations_workbook_example.workbookname</translationScriptId>
  </name1>
  <name2>
    <translationScriptId>false.reference</translationScriptId>
  </name2>
  <name3>
    <translationScriptId>a name without a reference</translationScriptId>
  </name3>
  <scriptid type="null"></scriptid>
  <name>
    <elemID>
      <adapter>netsuite</adapter>
      <typeName>translationcollection</typeName>
      <idType>instance</idType>
      <nameParts>custcollectiontranslations_workbook_example</nameParts>
      <nameParts>strings</nameParts>
      <nameParts>string</nameParts>
      <nameParts>workbookname</nameParts>
      <nameParts>scriptid</nameParts>
      <fullName>netsuite.translationcollection.instance.custcollectiontranslations_workbook_example.strings.string.workbookname.scriptid</fullName>
    </elemID>
  </name>
  <dependencies type="null"></dependencies>
  <definition type="null"></definition>
  <charts type="array"></charts>
  <datasetLinks type="array"></datasetLinks>
  <dataViews type="array"></dataViews>
  <pivots type="array"></pivots>
  <Workbook>
    <id type="null"></id>
    <scriptId type="null"></scriptId>
    <applicationId type="null"></applicationId>
    <version type="null"></version>
    <name type="null"></name>
    <audience>
      <AudienceItems type="array"></AudienceItems>
      <isPublic type="boolean">false</isPublic>
    </audience>
    <ownerId type="null"></ownerId>
    <description type="null"></description>
    <dataViewIDs type="array"></dataViewIDs>
    <pivotIDs type="array"></pivotIDs>
    <chartIDs type="array"></chartIDs>
    <_T_>workbook</_T_>
  </Workbook>
</root>
`

const custcollectiontranslations_tableValue = {
  scriptid: 'custcollectiontranslations_tableValue',
  defaultlanguage: 'en-US',
  name: 'table name',
  strings: {
    string: {
      tableview_name: {
        scriptid: 'tableview_name',
        defaulttranslation: 'Table 1',
        description: 'Name in tableView',
        index: 0,
      },
    },
  },
}

export const custcollectiontranslations_table = new InstanceElement(
  'seggev_table',
  translationcollectionType().type,
  custcollectiontranslations_tableValue,
  [constants.NETSUITE, constants.TRANSLATION_COLLECTION],
)

export const workbookDependencies = {
  dependency: new ReferenceExpression(custcollectiontranslations_table.elemID.createNestedID('strings', 'string', 'tableview_name', 'scriptid')),
}

const parsedBasicWorkbookValue = {
  scriptid: 'custworkbook_basic',
  name: 'seggev basic workbook name',
  dependencies: workbookDependencies,
  tables: {
    table: {
      custview72_16951029801843995215: {
        scriptid: 'custview72_16951029801843995215',
        index: 0,
      },
    },
  },
  Workbook: {
    version: '1.1.1',
    name: {
      translationScriptId: 'seggev basic workbook name',
    },
    audience: {
      isPublic: false,
    },
    ownerId: 5,
    dataViewIDs: [
      'custview72_16951029801843995215',
    ],
  },
  dataViews: [
    {
      dataView: {
        scriptId: 'custview72_16951029801843995215',
        version: '1.2021.2',
        name: {
          translationScriptId: new ReferenceExpression(custcollectiontranslations_table.elemID.createNestedID('strings', 'string', 'tableview_name', 'scriptid')),
        },
        workbook: 'custworkbook_basic',
        datasets: [
          'stddatasetMyTransactionsDataSet',
        ],
        columns: [
          {
            datasetScriptId: 'stddatasetMyTransactionsDataSet',
            dataSetColumnId: 10,
            targetFieldContext: {
              name: 'DISPLAY',
            },
            fieldStateName: 'display',
          },
        ],
        order: 0,
      },
    },
  ],
}
export const parsedBasicWorkbook = new InstanceElement(
  'seggev parsed basic workbook',
  workbook,
  parsedBasicWorkbookValue,
  [constants.NETSUITE, constants.WORKBOOK],
)

export const basicWorkbookDefinition = `<root>
  <tables>
    <table>
      <custview72_16951029801843995215>
        <scriptid>custview72_16951029801843995215</scriptid>
        <index>0</index>
      </custview72_16951029801843995215>
    </table>
  </tables>
  <Workbook>
    <version>1.1.1</version>
    <name>
      <translationScriptId>seggev basic workbook name</translationScriptId>
    </name>
    <audience>
      <isPublic type="boolean">false</isPublic>
      <AudienceItems type="array"></AudienceItems>
    </audience>
    <ownerId>5</ownerId>
    <dataViewIDs type="array">
      <_ITEM_>custview72_16951029801843995215</_ITEM_>
    </dataViewIDs>
    <id type="null"></id>
    <scriptId type="null"></scriptId>
    <applicationId type="null"></applicationId>
    <description type="null"></description>
    <pivotIDs type="array"></pivotIDs>
    <chartIDs type="array"></chartIDs>
    <_T_>workbook</_T_>
  </Workbook>
  <dataViews type="array">
    <_ITEM_>
      <_T_>dataView</_T_>
      <scriptId>custview72_16951029801843995215</scriptId>
      <version>1.2021.2</version>
      <name>
        <translationScriptId>seggev_table.tableview_name</translationScriptId>
      </name>
      <workbook>custworkbook_basic</workbook>
      <datasets type="array">
        <_ITEM_>stddatasetMyTransactionsDataSet</_ITEM_>
      </datasets>
      <columns type="array">
        <_ITEM_>
          <datasetScriptId>stddatasetMyTransactionsDataSet</datasetScriptId>
          <dataSetColumnId>10</dataSetColumnId>
          <targetFieldContext>
            <name>DISPLAY</name>
          </targetFieldContext>
          <fieldStateName>display</fieldStateName>
          <conditionalFormat type="array"></conditionalFormat>
          <criterion>
            <_T_>condition</_T_>
            <children type="array"></children>
            <operator>
              <code>AND</code>
            </operator>
            <targetFieldContext>
              <name>DEFAULT</name>
            </targetFieldContext>
            <meta type="null"></meta>
            <field type="null"></field>
            <fieldStateName type="null"></fieldStateName>
          </criterion>
          <customLabel type="null"></customLabel>
          <sorting type="null"></sorting>
          <width type="null"></width>
        </_ITEM_>
      </columns>
      <order>0</order>
      <id type="null"></id>
      <applicationId type="null"></applicationId>
    </_ITEM_>
  </dataViews>
  <scriptid type="null"></scriptid>
  <name>seggev basic workbook name</name>
  <dependencies type="null"></dependencies>
  <definition type="null"></definition>
  <charts type="array"></charts>
  <datasetLinks type="array"></datasetLinks>
  <pivots type="array"></pivots>
</root>
`
