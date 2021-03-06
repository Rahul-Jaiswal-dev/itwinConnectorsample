/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import { ClientRequestContext, DbResult, Logger, OpenMode } from "@bentley/bentleyjs-core";
import { BridgeJobDefArgs, BridgeRunner } from "@bentley/imodel-bridge";
import { ServerArgs } from "@bentley/imodel-bridge/lib/IModelHubUtils";
import { BriefcaseDb, BriefcaseManager, IModelJsFs, ECSqlStatement } from "@bentley/imodeljs-backend";
import { AccessToken, AuthorizedClientRequestContext } from "@bentley/itwin-client";
import { Utilities, ConnectorIModelInfo, ConnectorHelper } from "./Utilities";
import { KnownTestLocations } from "./test/KnownTestLocations";
import * as path from "path";
import dotenv = require("dotenv");
dotenv.config();

const { contextId , iModelId ,dataSource } =  ConnectorHelper.getenvVariables();

export async function main(process: NodeJS.Process): Promise<void> {
  console.log(`Running Connector now...`);
  console.log(`Started main...`);
  try {
    let projectId: string | undefined;
    let iModelName : string = "";
    let requestContext: AuthorizedClientRequestContext | undefined;
    let sampleIModel: ConnectorIModelInfo;
    await Utilities.startBackend();
    await ConnectorHelper.signIn();
    if (!IModelJsFs.existsSync(KnownTestLocations.outputDir))
      IModelJsFs.mkdirSync(KnownTestLocations.outputDir);

    try {
      if (ConnectorHelper.accessToken)
        requestContext = await new AuthorizedClientRequestContext(ConnectorHelper.accessToken);
    } catch (error) {
      Logger.logError("Error", `Failed with error: ${error}`);
    }
    if (requestContext) {
      projectId = contextId;
      console.log(`iModel project id: ${projectId}`);
      const iModel  = await ConnectorHelper.getiModel(requestContext,projectId!,iModelId!);
      if(iModel && iModel.name)
        iModelName = iModel.name;
      else
        throw new Error("iModel not found..") 

      // await HubUtility.createIModel(requestContext, testProjectId!, iModelName!);
      // const targetIModelId = await HubUtility.queryIModelByName(requestContext, testProjectId, iModelName);
      sampleIModel = await Utilities.getTestModelInfo(requestContext, projectId!, iModelName);
      const { testSourcePath, bridgeJobDef, serverArgs } = await getEnv(projectId!, sampleIModel);
      let intermediaryDb =  dataSource;
      if(intermediaryDb)
        intermediaryDb = intermediaryDb.replace("xlsx","db");
      if(!intermediaryDb || !IModelJsFs.existsSync(path.join(KnownTestLocations.assetsDir,intermediaryDb)))
        throw new Error("File not found.....")
      const sourcePath = path.join(KnownTestLocations.assetsDir, intermediaryDb!);
      IModelJsFs.copySync(sourcePath, testSourcePath, { overwrite: true });
      await runConnector(bridgeJobDef, serverArgs, false, false);
    }
  } catch (error) {
    console.log(error.message + "\n" + error.stack);
  } finally {
    await Utilities.shutdownBackend();
    if (IModelJsFs.existsSync(KnownTestLocations.outputDir))
      IModelJsFs.purgeDirSync(KnownTestLocations.outputDir);
    if (IModelJsFs.existsSync(path.join(KnownTestLocations.assetsDir, "test.db")))
      IModelJsFs.unlinkSync(path.join(KnownTestLocations.assetsDir, "test.db"));
    process.exit();
  }
}
// Invoke main if Main.js is being run directly
if (require.main === module) {
  // tslint:disable-next-line: no-floating-promises
  main(process);
}

const runConnector = async (bridgeJobDef: BridgeJobDefArgs, serverArgs: ServerArgs, _isUpdate: boolean = false, _isSchemaUpdate: boolean = false) => {
  console.log(`Started BridgeRunner...`);
  const runner = new BridgeRunner(bridgeJobDef, serverArgs);
  console.log(`Executing BridgeRunner synchronize...`);
  const status = await runner.synchronize();
  // expect(status === BentleyStatus.SUCCESS);
  const briefcases = BriefcaseManager.getBriefcases();
  const briefcaseEntry = BriefcaseManager.findBriefcaseByKey(briefcases[0].key);
  // expect(briefcaseEntry !== undefined);
  let imodel: BriefcaseDb;
  imodel = await BriefcaseDb.open(new ClientRequestContext(), briefcases[0].key, { openAsReadOnly: true });
  briefcaseEntry!.openMode = OpenMode.ReadWrite;
  console.log(`\nConnector synced the following sensors with iModel ${imodel.name}:`);
  console.log(`Executing query: SELECT * FROM iot.device`);
  for await (const row of imodel.query(`SELECT * FROM iot.device`)) {
    console.log(row);
  }
  console.log(`\nExecuting query: SELECT * FROM iot.TemperatureDatapoint`);
  for await (const row of imodel.query(`SELECT * FROM iot.TemperatureDatapoint`)) {
    console.log(row);
  }
  console.log(`\nExecuting query: SELECT * FROM iot.PressureDatapoint`);
  for await (const row of imodel.query(`SELECT * FROM iot.PressureDatapoint`)) {
    console.log(row);
  }
  let elementId;
  try {
    console.log(`\nExecuting query: SELECT * FROM Generic.PhysicalObject Where ECInstanceId = <elementId>`);
    imodel.withPreparedStatement(`Select EcInstanceId from Generic.PhysicalObject`, (stmt: ECSqlStatement) => {
      while (stmt.step() === DbResult.BE_SQLITE_ROW) {
        elementId = stmt.getValue(0).getId();
      }
    });
    for await (const row of imodel.query(`SELECT * FROM Generic.PhysicalObject Where ECInstanceId = ${elementId}`)) {
      console.log(row);
    }
  } catch (error) {
    console.log("Error in querying Generic.PhysicalObject.");
  }
  console.log(`\nExecuting query: SELECT * FROM iot.DatapointObservesSpatialElement`);
  for await (const row of imodel.query(`SELECT * FROM iot.DatapointObservesSpatialElement`)) {
    console.log(row);
  }
  imodel.close();
};

const getEnv = async (projectId: string, sampleIModel: ConnectorIModelInfo) => {
  const bridgeJobDef = new BridgeJobDefArgs();
  const testSourcePath = path.join(KnownTestLocations.assetsDir, "test.db");
  bridgeJobDef.sourcePath = testSourcePath;
  bridgeJobDef.bridgeModule = path.join(__dirname, "./Connector.js");
  const serverArgs = new ServerArgs();
  serverArgs.contextId = projectId;
  serverArgs.iModelId = sampleIModel.id;
  serverArgs.getToken = async (): Promise<AccessToken> => {
    return ConnectorHelper.accessToken ? ConnectorHelper.accessToken : new AccessToken();
  };
  return { testSourcePath, bridgeJobDef, serverArgs };
};
