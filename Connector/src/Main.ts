/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import { ClientRequestContext, Logger, OpenMode } from "@bentley/bentleyjs-core";
import { BridgeJobDefArgs, BridgeRunner } from "@bentley/imodel-bridge";
import { ServerArgs } from "@bentley/imodel-bridge/lib/IModelHubUtils";
import { BriefcaseDb, BriefcaseManager, DesktopAuthorizationClient, IModelJsFs } from "@bentley/imodeljs-backend";
import { DesktopAuthorizationClientConfiguration } from "@bentley/imodeljs-common";
import { AccessToken, AuthorizedClientRequestContext } from "@bentley/itwin-client";
import { Utilities, ConnectorIModelInfo } from "./Utilities";
import { KnownTestLocations } from "./test/KnownTestLocations";
import * as path from "path";
import dotenv = require("dotenv");
import { expect } from "chai";
dotenv.config();

async function signIn(): Promise<AccessToken | undefined> {
  console.log(`Executing signIn...`);
  const config: DesktopAuthorizationClientConfiguration = {
    clientId: process.env.clientId!,
    redirectUri: process.env.redirectUri!,
    scope: process.env.scope!,
  };

  const client = new DesktopAuthorizationClient(config);
  const requestContext = new ClientRequestContext();
  await client.initialize(requestContext);
  return new Promise<AccessToken | undefined>((resolve, _reject) => {
    client.onUserStateChanged.addListener((token: AccessToken | undefined) => resolve(token));
    client.signIn(requestContext);
  });
}

export async function main(process: NodeJS.Process): Promise<void> {
  console.log(`Running Connector now...`);
  console.log(`Started main...`);
  try {
    let testProjectId: string | undefined;
    let requestContext: AuthorizedClientRequestContext | undefined;
    let sampleIModel: ConnectorIModelInfo;
    await Utilities.startBackend();

    // await IModelHost.startup();
    const accessToken: AccessToken | undefined = await signIn();
    dd.a = accessToken;
    if (!IModelJsFs.existsSync(KnownTestLocations.outputDir))
      IModelJsFs.mkdirSync(KnownTestLocations.outputDir);

    try {
      if (accessToken)
        requestContext = await new AuthorizedClientRequestContext(accessToken);
    } catch (error) {
      Logger.logError("Error", `Failed with error: ${error}`);
    }
    if (requestContext) {
      const projectName = process.env.projectName;
      testProjectId = process.env.testProjectId;
      const iModelName = process.env.iModelName;

      // await HubUtility.createIModel(requestContext, testProjectId!, iModelName!);
      // const targetIModelId = await HubUtility.queryIModelByName(requestContext, testProjectId, iModelName);
      sampleIModel = await Utilities.getTestModelInfo(requestContext, testProjectId!, iModelName!);

      // Purge briefcases that are close to reaching the acquire limit
      // const managerRequestContext = await TestUtility.getAuthorizedClientRequestContext(TestUsers.manager);
      // await HubUtility.purgeAcquiredBriefcases(requestContext, testProjectId!, iModelName!);

      const { testSourcePath, bridgeJobDef, serverArgs } = await getEnv(testProjectId!, sampleIModel);
      const intermediaryDb = process.env.intermediaryDb;
      const sourcePath = path.join(KnownTestLocations.assetsDir, intermediaryDb!);
      IModelJsFs.copySync(sourcePath, testSourcePath, { overwrite: true });
      await runConnector(bridgeJobDef, serverArgs, false, false);
    }
  } catch (error) {
    process.stdout.write(error.message + "\n" + error.stack);
  } finally {
    await Utilities.shutdownBackend();
    IModelJsFs.purgeDirSync(KnownTestLocations.outputDir);
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
  expect(briefcaseEntry !== undefined);
  let imodel: BriefcaseDb;
  imodel = await BriefcaseDb.open(new ClientRequestContext(), briefcases[0].key, { openAsReadOnly: true });
  briefcaseEntry!.openMode = OpenMode.ReadWrite;
  console.log(`\nConnector synced the following sensor devices with iModel:`);
  console.log(`Executing query: SELECT devicetype FROM cbd.Device`);
  for await (const row of imodel.query(`SELECT devicetype FROM cbd.Device`)) {
    console.log(row);
  }
  imodel.close();
};

const getEnv = async (testProjectId: string, sampleIModel: ConnectorIModelInfo) => {
  const bridgeJobDef = new BridgeJobDefArgs();
  const testSourcePath = path.join(KnownTestLocations.assetsDir, "test.db");
  bridgeJobDef.sourcePath = testSourcePath;
  bridgeJobDef.bridgeModule = path.join(__dirname, "./Connector.js");
  const serverArgs = new ServerArgs();
  serverArgs.contextId = testProjectId;
  serverArgs.iModelId = sampleIModel.id;
  serverArgs.getToken = async (): Promise<AccessToken> => {
    return dd.a ? dd.a : new AccessToken();
  };
  return { testSourcePath, bridgeJobDef, serverArgs };
};

class dd {
  public static a: AccessToken | undefined;
}
