/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { AccessToken, AuthorizedClientRequestContext } from "@bentley/itwin-client";
import { ClientRequestContext, GuidString, Logger, LogLevel } from "@bentley/bentleyjs-core";
import { ChangeSet, HubIModel } from "@bentley/imodelhub-client";
import { BriefcaseManager, DesktopAuthorizationClient, IModelHost, IModelHostConfiguration, IModelJsFs } from "@bentley/imodeljs-backend";
import * as path from "path";
import { IModelBankArgs, IModelBankUtils } from "@bentley/imodel-bridge/lib/IModelBankUtils";
import { IModelHubUtils } from "@bentley/imodel-bridge/lib/IModelHubUtils";
import { HubUtility } from "./test/HubUtility";
import { KnownTestLocations } from "./test/KnownTestLocations";
import { DesktopAuthorizationClientConfiguration } from "@bentley/imodeljs-common";
import dotenv = require("dotenv");
dotenv.config();
const storage = require("node-persist");
export class ConnectorIModelInfo {
  private _name: string;
  private _id: string;
  private _localReadonlyPath: string;
  private _localReadWritePath: string;
  private _changeSets: ChangeSet[];

  constructor(name: string) {
    this._name = name;
    this._id = "";
    this._localReadonlyPath = "";
    this._localReadWritePath = "";
    this._changeSets = [];
  }

  get name(): string { return this._name; }
  set name(name: string) { this._name = name; }
  get id(): string { return this._id; }
  set id(id: string) { this._id = id; }
  get localReadonlyPath(): string { return this._localReadonlyPath; }
  set localReadonlyPath(localReadonlyPath: string) { this._localReadonlyPath = localReadonlyPath; }
  get localReadWritePath(): string { return this._localReadWritePath; }
  set localReadWritePath(localReadWritePath: string) { this._localReadWritePath = localReadWritePath; }
  get changeSets(): ChangeSet[] { return this._changeSets; }
  set changeSets(changeSets: ChangeSet[]) { this._changeSets = changeSets; }
}

export class Utilities {
  public static setupLogging() {
    Logger.initializeToConsole();
    Logger.setLevelDefault(LogLevel.Error);

    if (process.env.imjs_test_logging_config === undefined) {
      // tslint:disable-next-line:no-console
      console.log(`You can set the environment variable imjs_test_logging_config to point to a logging configuration json file.`);
    }
    const loggingConfigFile: string = process.env.imjs_test_logging_config || path.join(__dirname, "logging.config.json");

    if (IModelJsFs.existsSync(loggingConfigFile)) {
      // tslint:disable-next-line:no-console
      console.log(`Setting up logging levels from ${loggingConfigFile}`);
      // tslint:disable-next-line:no-var-requires
      Logger.configureLevels(require(loggingConfigFile));
    }
  }

  public static async getTestModelInfo(requestContext: AuthorizedClientRequestContext, projectId: string, iModelName: string): Promise<ConnectorIModelInfo> {
    const iModelInfo = new ConnectorIModelInfo(iModelName);
    iModelInfo.id = await HubUtility.queryIModelIdByName(requestContext, projectId, iModelInfo.name);

    // iModelInfo.changeSets = await BriefcaseManager.imodelClient.changeSets.get(requestContext, iModelInfo.id);
    return iModelInfo;
  }

  public static async startBackend(clientArgs?: IModelBankArgs): Promise<void> {
    //  const result = IModelJsConfig.init(true /* suppress exception */, false /* suppress error message */, Config.App);
    const config = new IModelHostConfiguration();
    config.concurrentQuery.concurrent = 4; // for test restrict this to two threads. Making closing connection faster
    config.cacheDir = KnownTestLocations.outputDir;
    config.imodelClient = (undefined === clientArgs) ? IModelHubUtils.makeIModelClient() : IModelBankUtils.makeIModelClient(clientArgs);
    await IModelHost.startup(config);
  }

  public static async shutdownBackend(): Promise<void> {
    await IModelHost.shutdown();
  }
}

export class ConnectorHelper {
  public static accessToken: AccessToken | undefined;

  public static async getiModel(requestContext: AuthorizedClientRequestContext, projectId: string, iModelId: GuidString): Promise<HubIModel> {
    let iModel: HubIModel;
    const iModelsIniModelHub = await BriefcaseManager.imodelClient.iModels.get(requestContext, projectId);
    iModelsIniModelHub.forEach((value) => {
      if (value.id === iModelId)
        iModel = value;
    });
    return iModel!;
  }

  public static async signIn(): Promise<void> {
    console.log(`Executing signIn...`);
    await storage.init();
    let accessToken: AccessToken | undefined;
    const cachedAccessToken = await storage.getItem("accessToken");
    if (cachedAccessToken && cachedAccessToken.time > (new Date().valueOf() + 10 * 60 * 1000))
      accessToken = AccessToken.fromTokenString(cachedAccessToken.token);
    else {
      accessToken = await ConnectorHelper.signInClient();
      await storage.setItem("accessToken", { token: accessToken?.toTokenString(), time: accessToken?.getExpiresAt()?.valueOf() });
    }
    ConnectorHelper.accessToken = accessToken;
  }

  public static async signInClient(): Promise<AccessToken | undefined> {
    const config: DesktopAuthorizationClientConfiguration = {
      clientId: this.getenvVariables().clientId!,
      redirectUri: this.getenvVariables().redirectUri!,
      scope: this.getenvVariables().scope!,
    };

    const client = new DesktopAuthorizationClient(config);
    const requestContext = new ClientRequestContext();
    await client.initialize(requestContext);
    return new Promise<AccessToken | undefined>((resolve, _reject) => {
      client.onUserStateChanged.addListener((token: AccessToken | undefined) => resolve(token));
      client.signIn(requestContext);
    });
  }

  public static getenvVariables() {
    const envvariables = {
      clientId: process.env.IMJS_CLIENT_ID, contextId: process.env.IMJS_CONTEXT_ID,
      iModelId: process.env.IMJS_IMODEL_ID, dataSource: process.env.IMJS_DATA_SOURCE, redirectUri: process.env.IMJS_REDIRECT_URI,
      scope: process.env.IMJS_SCOPE,
    };
    if (envvariables.clientId && envvariables.contextId && envvariables.dataSource && envvariables.iModelId && envvariables.redirectUri && envvariables.scope)
      return envvariables;
    else
      throw new Error(".env file values are  missing.............");
  }
}
