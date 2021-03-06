/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import { DbResult, Id64String } from "@bentley/bentleyjs-core";
import { Code, CodeSpec, Placement3d, AxisAlignedBox3d } from "@bentley/imodeljs-common";
import { IModelDb, SpatialCategory, DrawingCategory, IModelSchemaLoader, ECSqlStatement } from "@bentley/imodeljs-backend";
import { ItemState, SourceItem, ChangeResults, SynchronizationResults } from "@bentley/imodel-bridge/lib/Synchronizer";
import * as connectorElements from "./Elements";
import * as ConnectorRelationships from "./Relationships";
import * as connectorRelatedElements from "./RelatedElements";
import { Connector } from "./Connector";
import { DataFetcher } from "./DataFetcher";
import * as hash from "object-hash";

export class DataAligner {

  public imodel: IModelDb;
  public connector: Connector;
  public dataFetcher: DataFetcher;
  public schemaItems: { [className: string]: any };
  public categoryCache: { [categoryName: string]: Id64String };
  public modelCache: { [modelName: string]: Id64String };
  public elementCache: { [identifier: string]: Id64String };
  public isGenericPhysicalObjectPresent: boolean;
  public elementId: string;

  constructor(connector: Connector) {
    this.connector = connector;
    this.dataFetcher = connector.dataFetcher!;
    this.imodel = connector.synchronizer.imodel;
    const loader = new IModelSchemaLoader(this.imodel);
    const existingSchema = loader.tryGetSchema("IoTDevice");
    const existingGenericSchema = loader.tryGetSchema("Generic");
    console.log(`Here is imported IoTDevice schema as json...`);
    console.log(existingSchema?.toJSON().items);
    this.schemaItems = existingSchema!.toJSON().items!;
    const obj = existingGenericSchema!.toJSON().items!;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        this.schemaItems[key] = existingGenericSchema!.toJSON().items![key];
      }
    }
    this.isGenericPhysicalObjectPresent = false;
    this.categoryCache = {};
    this.modelCache = {};
    this.elementCache = {};
    this.elementId = "";
  }

  public async align(elementTree: any) {
    console.log(`Executing DataAligner align...`);
    const partitions = elementTree.subjects.Subject1.partitions;
    const partitionNames = partitions ? Object.keys(partitions) : [];
    for (const partitionName of partitionNames) {
      console.log(` partitionName: ${partitionName}`);
      const partition = partitions[partitionName];
      const models = partition.models;
      const modelNames = models ? Object.keys(models) : [];

      for (const modelName of modelNames) {
        console.log(`   modelName: ${modelName}`);
        const model = models[modelName];
        const modelId = this.updateModel(partition, model, modelName);

        const elements = model.elements;
        const elementNames = elements ? Object.keys(elements) : [];
        for (const elementName of elementNames) {
          console.log(`     elementName: ${elementName}`);
          const element = elements[elementName];
          this.updateElement(modelId, element, elementName);
        }

        const elementClasses = model.elementClasses;
        const elementClassNames = elementClasses ? Object.keys(elementClasses) : [];
        for (const elementClassName of elementClassNames) {
          console.log(`     elementClassName: ${elementClassName}`);
          const elementClass = elementClasses[elementClassName];
          await this.updateElementClass(modelId, elementClass);
        }

        const relationshipClasses = model.relationshipClasses;
        const relationshipClassNames = relationshipClasses ? Object.keys(relationshipClasses) : [];
        for (const relationshipClassName of relationshipClassNames) {
          console.log(`     relationshipClassName: ${relationshipClassName}`);
          const relationshipClass = relationshipClasses[relationshipClassName];
          await this.updateRelationshipClass(relationshipClass);
        }
      }
    }
    console.log("                       Align Executed Completely");
  }

  public updateModel(partition: any, model: any, modelName: string) {
    console.log(`   Executing DataAligner updateModel...`);
    const jobSubjectId = this.connector.jobSubject.id;
    const existingModelId = this.imodel.elements.queryElementIdByCode(partition.ref.createCode(this.imodel, jobSubjectId, modelName));
    if (existingModelId) {
      this.modelCache[modelName] = existingModelId;
      return existingModelId;
    }
    const newModelId = model.ref.insert(this.imodel, jobSubjectId, modelName);
    this.modelCache[modelName] = newModelId;
    return newModelId;
  }

  public updateElement(modelId: any, element: any, elementName: string) {
    console.log(`     Executing DataAligner updateElement...`);
    if (element.ref === SpatialCategory || element.ref === DrawingCategory) {
      const existingCategoryId = element.ref.queryCategoryIdByName(this.imodel, modelId, elementName);
      if (existingCategoryId) {
        this.categoryCache[elementName] = existingCategoryId;
        return existingCategoryId;
      }
      const newCategoryId = element.ref.insert(this.imodel, modelId, elementName);
      this.categoryCache[elementName] = newCategoryId;
      return newCategoryId;
    }
  }

  public async updateRelationshipClass(relationshipClass: any) {
    console.log(`     Executing DataAligner updateRelationshipClass...`);
    const tableName = relationshipClass.ref.tableName;
    const tableData = await this.dataFetcher.fetchTableData(tableName);
    for (const elementData of tableData) {
      const sourceModelId = this.modelCache[relationshipClass.sourceModelName];
      const sourceCode = this.getCode(relationshipClass.sourceRef.className, sourceModelId, elementData[relationshipClass.sourceKey]);
      const sourceId = this.imodel.elements.queryElementIdByCode(sourceCode)!;
      let targetId;
      if (relationshipClass.ref.className === "DatapointObservesSpatialElement" && this.isGenericPhysicalObjectPresent) {
        targetId = this.elementId;
      } else {
        const targetModelId = this.modelCache[relationshipClass.targetModelName];
        const targetCode = this.getCode(relationshipClass.targetRef.className, targetModelId, elementData[relationshipClass.targetKey]);
        targetId = this.imodel.elements.queryElementIdByCode(targetCode)!;
      }
      if (relationshipClass.ref.className in connectorRelatedElements) {
        const sourceElement = this.imodel.elements.getElement(sourceId);
        const targetElement = this.imodel.elements.getElement(targetId!);
        const relatedElement = new relationshipClass.ref(sourceId, targetId, relationshipClass.ref.classFullName);
        const updatedElement = relationshipClass.ref.addRelatedElement(sourceElement, targetElement, relatedElement);
        updatedElement.update();
      } else if (relationshipClass.ref.className in ConnectorRelationships) {
        if (!sourceId || !targetId) continue;
        const relationship = this.imodel.relationships.tryGetInstance(relationshipClass.ref.classFullName, { sourceId, targetId });
        if (relationship) continue;
        const relationshipProps = relationshipClass.ref.createProps(sourceId, targetId);
        this.imodel.relationships.insertInstance(relationshipProps);
      }
    }
  }

  public async updateElementClass(modelId: any, elementClass: any) {
    console.log(`     Executing DataAligner updateElementClass...`);
    let tableData: any = [];
    let rowsCount: number = 0;
    if (elementClass.ref.className === "PhysicalObject") {
      this.imodel.withPreparedStatement(`Select EcInstanceId from Generic.PhysicalObject`, (stmt: ECSqlStatement) => {
        while (stmt.step() === DbResult.BE_SQLITE_ROW) {
          this.elementId = stmt.getValue(0).getId();
          this.isGenericPhysicalObjectPresent = true;
          rowsCount++;
          if (rowsCount === 2)
            break;
        }
      });
      if (this.isGenericPhysicalObjectPresent && rowsCount === 2) { // Make sure the PhysicalObject does not get deleted
        return;
      } else {
        tableData = [{ "PhysicalObject.devicephysicalid": "4.0" }];
      }
    }
    const tableName = elementClass.ref.tableName;
    if (tableData.length === 0) {
      tableData = await this.dataFetcher.fetchTableData(tableName);
    }
    const categoryId = this.categoryCache[elementClass.categoryName];
    const primaryKey = this.dataFetcher.getTablePrimaryKey(tableName);
    const codeSpec: CodeSpec = this.imodel.codeSpecs.getByName(connectorElements.CodeSpecs.Connector);
    //  console.log(" CodeSpec \n  "+  JSON.stringify(codeSpec));

    console.log(`\nPrinting data from intermediary db:`);
    for (const elementData of tableData) {
      const guid = tableName + elementData[`${tableName}.${primaryKey}`];
      const code = new Code({ spec: codeSpec.id, scope: modelId, value: guid });
      //  console.log("  Code \n" +  JSON.stringify(code));
      const sourceItem: SourceItem = { id: guid, checksum: hash.MD5(JSON.stringify(elementData)) };
      const changeResults: ChangeResults = this.connector.synchronizer.detectChanges(modelId, tableName, sourceItem);
      // console.log(changeResults.state);
      if (elementData[`${tableName}.${primaryKey}`] === "") {
        console.log("Empty Row in Excel File");
        continue;
      }

      if (changeResults.state === ItemState.Unchanged) {
        this.connector.synchronizer.onElementSeen(changeResults.id!);
        console.log(JSON.stringify(elementData, null, 2));
        continue;
      }
      let msg = "";
      // if (tableName === "Device") {
      if (changeResults.state === 1) {
        msg = "is ready to be added in iModel.";
      } else {
        msg = "is ready to be updated in iModel.";
      }
      const devicetype = "Device type '" + elementData[`${tableName}.devicetype`] + "'";
      // console.log(`${devicetype} in table ${tableName} from intermediary db ${msg}`);
      // }
      console.log(JSON.stringify(elementData, null, 2));
      let props;
      if (elementClass.ref.className === "PhysicalObject") {
        props = elementClass.ref.createProps(modelId, code, elementData, categoryId);
      } else {
        props = elementClass.ref.createProps(modelId, code, elementData);
      }
      this.addForeignProps(props, elementClass, elementData);
      if (props.placement) this.updateExtent(props.placement);

      const existingElementId = this.imodel.elements.queryElementIdByCode(code);
      const element = this.imodel.elements.createElement(props);

      if (existingElementId) element.id = existingElementId;
      const syncResults: SynchronizationResults = { element, itemState: changeResults.state };
      this.connector.synchronizer.updateIModel(syncResults, modelId, sourceItem, tableName);
      this.elementCache[guid] = element.id;

      if (elementClass.typeDefinition && changeResults.state === ItemState.New)
        this.updateTypeDefinition(element, elementClass.typeDefinition, elementData);
    }
    this.connector.synchronizer.detectDeletedElements();
  }

  public addForeignProps(props: any, elementClass: any, elementData: any) {
    try {
      const { className } = elementClass.ref;
      // console.log(`Reached addForeignProps`);
      const { properties } = this.schemaItems[className];
      // console.log(`${JSON.stringify(properties)}`);
      // console.log(`${JSON.stringify(elementData)}`);
      if (properties) {
        for (const prop of properties) {
          const attribute = prop.name;
          props[prop.name] = elementData[`${className}.${attribute}`];
        }
      }
    } catch (error) {
      console.log("Error in addForeignProps for  " + elementClass.ref.className);
    }
  }

  public updateTypeDefinition(element: any, typeClass: any, elementData: any) {
    const typeCode = this.getCode(typeClass.ref.className, this.modelCache[typeClass.modelName], elementData[typeClass.key]);
    const typeDef = this.imodel.elements.getElement(typeCode);
    element.typeDefinition = typeDef;
    element.update();
  }

  public updateExtent(placement: Placement3d) {
    const targetPlacement: Placement3d = Placement3d.fromJSON(placement);
    const targetExtents: AxisAlignedBox3d = targetPlacement.calculateRange();
    if (!targetExtents.isNull && !this.imodel.projectExtents.containsRange(targetExtents)) {
      targetExtents.extendRange(this.imodel.projectExtents);
      this.imodel.updateProjectExtents(targetExtents);
    }
  }

  public getCode(tableName: string, modelId: Id64String, keyValue: string) {
    if (keyValue.startsWith("T-")) {
      tableName = "TemperatureDatapoint";
    } else if (keyValue.startsWith("P-")) {
      tableName = "PressureDatapoint";
    }
    const codeValue = `${tableName}${keyValue}`;
    console.log("UpdateRelationship " + codeValue);
    const codeSpec: CodeSpec = this.imodel.codeSpecs.getByName(connectorElements.CodeSpecs.Connector);
    return new Code({ spec: codeSpec.id, scope: modelId, value: codeValue });
  }
}
