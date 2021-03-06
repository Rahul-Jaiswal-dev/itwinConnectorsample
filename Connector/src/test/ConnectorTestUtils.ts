/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { AuthorizedClientRequestContext, ITwinClientLoggerCategory } from "@bentley/itwin-client";
import { BentleyLoggerCategory, DbResult, Id64, Id64String, Logger, LogLevel } from "@bentley/bentleyjs-core";
import { ChangeSet, IModelHubClientLoggerCategory } from "@bentley/imodelhub-client";
import { BackendLoggerCategory,  ECSqlStatement, ExternalSourceAspect, IModelDb, IModelHost, IModelHostConfiguration, IModelJsFs, NativeLoggerCategory, PhysicalPartition, Subject } from "@bentley/imodeljs-backend";
import { BridgeJobDefArgs } from "@bentley/imodel-bridge";
import * as path from "path";
import { assert } from "chai";
import { KnownTestLocations } from "./KnownTestLocations";
import { IModelBankArgs, IModelBankUtils } from "@bentley/imodel-bridge/lib/IModelBankUtils";
import { IModelHubUtils } from "@bentley/imodel-bridge/lib/IModelHubUtils";
import { HubUtility } from "./HubUtility";
import { BridgeLoggerCategory } from "@bentley/imodel-bridge/lib/BridgeLoggerCategory";
import * as connectorElement from "../Elements";
import { IModel } from "@bentley/imodeljs-common";
import {ConnectorIModelInfo } from "../Utilities"

function getCount(imodel: IModelDb, className: string) {
  let count = 0;
  imodel.withPreparedStatement("SELECT count(*) AS [count] FROM " + className, (stmt: ECSqlStatement) => {
    assert.equal(DbResult.BE_SQLITE_ROW, stmt.step());
    const row = stmt.getRow();
    count = row.count;
  });
  return count;
}

export class ConnectorTestUtils {
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

  private static initDebugLogLevels(reset?: boolean) {
    Logger.setLevelDefault(reset ? LogLevel.Error : LogLevel.Warning);
    Logger.setLevel(BentleyLoggerCategory.Performance, reset ? LogLevel.Error : LogLevel.Info);
    Logger.setLevel(BackendLoggerCategory.IModelDb, reset ? LogLevel.Error : LogLevel.Trace);
    Logger.setLevel(BridgeLoggerCategory.Framework, reset ? LogLevel.Error : LogLevel.Trace);
    Logger.setLevel(ITwinClientLoggerCategory.Clients, reset ? LogLevel.Error : LogLevel.Warning);
    Logger.setLevel(IModelHubClientLoggerCategory.IModelHub, reset ? LogLevel.Error : LogLevel.Warning);
    Logger.setLevel(ITwinClientLoggerCategory.Request, reset ? LogLevel.Error : LogLevel.Warning);

    Logger.setLevel(NativeLoggerCategory.DgnCore, reset ? LogLevel.Error : LogLevel.Warning);
    Logger.setLevel(NativeLoggerCategory.BeSQLite, reset ? LogLevel.Error : LogLevel.Warning);
    Logger.setLevel(NativeLoggerCategory.Licensing, reset ? LogLevel.Error : LogLevel.Warning);
    Logger.setLevel(NativeLoggerCategory.ECDb, LogLevel.Trace);
    Logger.setLevel(NativeLoggerCategory.ECObjectsNative, LogLevel.Trace);
    Logger.setLevel(NativeLoggerCategory.UnitsNative, LogLevel.Trace);
  }

  // Setup typical programmatic log level overrides here
  // Convenience method used to debug specific tests/fixtures
  public static setupDebugLogLevels() {
    ConnectorTestUtils.initDebugLogLevels(false);
  }

  public static resetDebugLogLevels() {
    ConnectorTestUtils.initDebugLogLevels(true);
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

  public static verifyIModel(imodel: IModelDb, bridgeJobDef: BridgeJobDefArgs) {
     assert.equal(5, getCount(imodel, "ConnectorDynamic:Device"));
     assert.isTrue(imodel.codeSpecs.hasName(connectorElement.CodeSpecs.Connector));
     const jobSubjectName = `Connector:${bridgeJobDef.sourcePath!}`;
     const subjectId: Id64String = imodel.elements.queryElementIdByCode(Subject.createCode(imodel, IModel.rootSubjectId, jobSubjectName))!;
     assert.isTrue(Id64.isValidId64(subjectId));

    const informationRecordModel = imodel.elements.queryElementIdByCode(PhysicalPartition.createCode(imodel, subjectId, "InformationRecordModel1"));
    assert.isTrue(informationRecordModel !== undefined);
    assert.isTrue(Id64.isValidId64(informationRecordModel!));

    const ids = ExternalSourceAspect.findBySource(imodel, informationRecordModel!, "Device", "Device1");
    assert.isTrue(Id64.isValidId64(ids.aspectId!));
    assert.isTrue(Id64.isValidId64(ids.elementId!));
    const deviceElement = imodel.elements.getElement(ids.elementId!);
    assert.equal((deviceElement as any).devicetype, "Device 1");
  }
}
