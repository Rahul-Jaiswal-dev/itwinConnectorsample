/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import { BentleyStatus, ClientRequestContext, IModelStatus, Logger } from "@bentley/bentleyjs-core";
import { AuthorizedClientRequestContext } from "@bentley/itwin-client";
import { CodeSpec, CodeScopeSpec, IModelError } from "@bentley/imodeljs-common";
import { IModelBridge, loggerCategory } from "@bentley/imodel-bridge";
import { IModelDb, IModelJsFs } from "@bentley/imodeljs-backend";
import { Schema } from "@bentley/ecschema-metadata";
import { ItemState, SourceItem, SynchronizationResults } from "@bentley/imodel-bridge/lib/Synchronizer";
import { DataFetcher } from "./DataFetcher";
import { DataAligner } from "./DataAligner";
import { SAMPLE_ELEMENT_TREE4 } from "./ElementTree";
import { DynamicSchemaGenerator, SchemaSyncResults } from "./DynamicSchemaGenerator";
import { CodeSpecs } from "./Elements";
import { SensorSchema } from "./Schema";
import * as path from "path";

export class Connector extends IModelBridge {
  public sourceDataState: ItemState = ItemState.New;
  public sourceDataPath?: string;
  public dataFetcher?: DataFetcher;
  public schemaGenerator?: DynamicSchemaGenerator;
  public dynamicSchema?: Schema;

  public initialize(_params: any) {}
  public async initializeJob(): Promise<void> {}

  public async openSourceData(sourcePath: string): Promise<BentleyStatus> {
    this.sourceDataPath = sourcePath;
    const sourceDataStatus = this.getSourceDataStatus();
    if(sourceDataStatus !== undefined)
      this.sourceDataState = sourceDataStatus.itemState;
    if (this.sourceDataState === ItemState.Unchanged) return BentleyStatus.ERROR;
    console.log("sourceDataState " + this.sourceDataState);
    this.dataFetcher = new DataFetcher(sourcePath);
    await this.dataFetcher.initialize();
    return BentleyStatus.SUCCESS;
  }

  public async importDomainSchema(_requestContext: AuthorizedClientRequestContext | ClientRequestContext): Promise<any> {
    if (this.sourceDataState === ItemState.New) {
      const functionalSchemaPath = path.join(__dirname, "./schema/Functional.ecschema.xml");
      const spatialCompositionSchemaPath = path.join(__dirname, "./schema/SpatialComposition.ecschema.xml");
      const buildingSpatialSchemaPath = path.join(__dirname, "./schema/BuildingSpatial.ecschema.xml");
      await this.synchronizer.imodel.importSchemas(_requestContext, [functionalSchemaPath, spatialCompositionSchemaPath, buildingSpatialSchemaPath]);
    }
  }

  public async importDynamicSchema(requestContext: AuthorizedClientRequestContext | ClientRequestContext): Promise<any> {
    if (this.sourceDataState === ItemState.Unchanged) {
      console.log(`The state of the given SourceItem against the iModelDb is unchanged.`);
      return;
    }
    if (this.sourceDataState === ItemState.New) {
      console.log(`The state of the given SourceItem against the iModelDb is changed.`);
      SensorSchema.registerSchema();
    }
    console.log(`Started importing dynamic schema...`);

    const schemaGenerator = new DynamicSchemaGenerator(this.dataFetcher!);
    console.log(` DynamicSchemaGenerator object created.`);
    this.schemaGenerator = schemaGenerator;
    const results: SchemaSyncResults = await schemaGenerator.synchronizeSchema(this.synchronizer.imodel);
    if (results.schemaState !== ItemState.Unchanged) {
      const schemaString = await schemaGenerator.schemaToString(results.dynamicSchema);
      await this.synchronizer.imodel.importSchemaStrings(requestContext, [schemaString]);
    }
    this.dynamicSchema = results.dynamicSchema;
  }

  public async importDefinitions(): Promise<any> {
    if (this.sourceDataState === ItemState.New) this.insertCodeSpecs();
  }

  public async updateExistingData() {
    if (this.sourceDataState === ItemState.Unchanged) return;
    if (!this.dataFetcher) throw new Error("No DataFetcher available for DataAligner.");
    if (!this.schemaGenerator) throw new Error("No DynamicSchemaGenerator available for DataAligner.");

    const aligner = new DataAligner(this);
    console.log(`Started DataAligner...`);
    await aligner.align(SAMPLE_ELEMENT_TREE4);
    this.dataFetcher.close();
  }

  public insertCodeSpecs() {
    const insert = (codeSpec: CodeSpecs) => {
      if (this.synchronizer.imodel.codeSpecs.hasName(codeSpec)) return;
      const newCodeSpec = CodeSpec.create(this.synchronizer.imodel, codeSpec, CodeScopeSpec.Type.Model);
      this.synchronizer.imodel.codeSpecs.insert(newCodeSpec);
    };
    insert(CodeSpecs.Connector);
  }

  public getSourceDataStatus(): SynchronizationResults | undefined {
    let timeStamp = Date.now();
    if (!this.sourceDataPath) throw new Error("we should not be in this method if the source file has not yet been opened");
    const stat = IModelJsFs.lstatSync(this.sourceDataPath);
    if (undefined !== stat) timeStamp = stat.mtimeMs;
    const sourceItem: SourceItem = {
      id: this.sourceDataPath!,
      version: timeStamp.toString(),
    };
    let sourceDataStatus: SynchronizationResults| undefined;
    try{
     sourceDataStatus = this.synchronizer.recordDocument(IModelDb.rootSubjectId, sourceItem);
    }
    catch(error)
    {
      this.sourceDataState= ItemState.Changed;
   }
    return sourceDataStatus;
  }

  public getApplicationId(): string {
    return "Test-Connector";
  }

  public getApplicationVersion(): string {
    return "1.0.0.0";
  }

  public getBridgeName(): string {
    return "Connector";
  }
}

export function getBridgeInstance() {
  return new Connector();
}
