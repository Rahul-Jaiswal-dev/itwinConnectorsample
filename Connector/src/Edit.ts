/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { ClientRequestContext, DbResult, GuidString, Logger } from "@bentley/bentleyjs-core";
import { BridgeJobDefArgs, BridgeRunner } from "@bentley/imodel-bridge";
import { ServerArgs } from "@bentley/imodel-bridge/lib/IModelHubUtils";
import { BriefcaseDb, BriefcaseManager, ConcurrencyControl, DesktopAuthorizationClient, ECSqlStatement, IModelHost, IModelJsFs } from "@bentley/imodeljs-backend";
import { DesktopAuthorizationClientConfiguration, ElementProps, LocalBriefcaseProps, RequestNewBriefcaseProps } from "@bentley/imodeljs-common";
import { AccessToken, AuthorizedClientRequestContext } from "@bentley/itwin-client";
import { ConnectorTestUtils, TestIModelInfo } from "./test/ConnectorTestUtils";
import { HubUtility } from "./test/HubUtility";
import { KnownTestLocations } from "./test/KnownTestLocations";
import * as path from "path";

async function signIn(): Promise<AccessToken | undefined> {
  const config: DesktopAuthorizationClientConfiguration = {
    clientId: "native-uNj4U1k1tYl7AwgS5E73Yhnvc",
    redirectUri: "http://localhost:3000/signin-callback",
    scope: "openid email profile organization imodelhub context-registry-service:read-only product-settings-service projectwise-share urlps-third-party", // offline_access",
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
  try {
    let testProjectId: string;
    let requestContext: AuthorizedClientRequestContext | undefined;
    let sampleIModel: TestIModelInfo;
    await ConnectorTestUtils.startBackend();

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
      testProjectId = await HubUtility.queryProjectIdByName(requestContext, "TestProjects");
      if (!testProjectId)
        testProjectId = "8e348f52-d923-4ccc-a14c-721d7ca850ae";   // Put your Context id"
      const iModelName = "MyConnector13";
      // const targetIModelId = await HubUtility.queryIModelByName(requestContext, testProjectId, iModelName);
      sampleIModel = await ConnectorTestUtils.getTestModelInfo(requestContext, testProjectId, iModelName);

      const { testSourcePath, bridgeJobDef, serverArgs } = await getEnv(testProjectId, sampleIModel);
      const sourcePath = path.join(KnownTestLocations.assetsDir, "samplesheet.db");
      IModelJsFs.copySync(sourcePath, testSourcePath, { overwrite: true });
      await runConnector(bridgeJobDef, serverArgs, false, false);
    }
  } catch (error) {
    process.stdout.write(error.message + "\n" + error.stack);
  } finally {
    process.exit();
  }
}
// Invoke main if Main.js is being run directly
if (require.main === module) {
  // tslint:disable-next-line: no-floating-promises
  main(process);
}

const runConnector = async (bridgeJobDef: BridgeJobDefArgs, serverArgs: ServerArgs, isUpdate: boolean = false, isSchemaUpdate: boolean = false) => {
  const runner = new BridgeRunner(bridgeJobDef, serverArgs);
  console.log(isUpdate.toString() + isSchemaUpdate);
  const status = await runner.synchronize();
  // expect(status === BentleyStatus.SUCCESS);
  // const briefcases = BriefcaseManager.getBriefcases();
  // const briefcaseEntry = BriefcaseManager.findBriefcaseByKey(briefcases[0].key);
  // expect(briefcaseEntry !== undefined);
  // let imodel: BriefcaseDb;
  // imodel = await BriefcaseDb.open(new ClientRequestContext(), briefcases[0].key, { openAsReadOnly: true });
  // ConnectorTestUtils.verifyIModel(imodel, bridgeJobDef, isUpdate, isSchemaUpdate);
  // briefcaseEntry!.openMode = OpenMode.ReadWrite;
  //  imodel.close();
};



const getEnv = async (testProjectId: string, sampleIModel: TestIModelInfo) => {
  const bridgeJobDef = new BridgeJobDefArgs();
  const testSourcePath = path.join(KnownTestLocations.assetsDir, "test.db");
  bridgeJobDef.sourcePath = testSourcePath;
  bridgeJobDef.bridgeModule = "D:\\Work\\iot\\source-code\\Rahul\\itwinConnectorsample\\Connector\\lib\\Connector.js";
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
