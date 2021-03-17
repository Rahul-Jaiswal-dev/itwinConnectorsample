/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import { Logger } from "@bentley/bentleyjs-core";
import { BriefcaseManager } from "@bentley/imodeljs-backend";
import { AccessToken, AuthorizedClientRequestContext } from "@bentley/itwin-client";
import { Utilities, ConnectorHelper } from "./Utilities";
import dotenv = require("dotenv");
dotenv.config();

export async function main(process: NodeJS.Process): Promise<void> {
  console.log(`Purging all briefcases...`);
  try {
    let projectId: string | undefined;
    let iModelName : string = "";
    let requestContext: AuthorizedClientRequestContext | undefined;
    await Utilities.startBackend();
    const accessToken: AccessToken | undefined = await ConnectorHelper.signIn();
    ConnectorHelper.accessToken = accessToken;

    try {
      if (accessToken)
        requestContext = await new AuthorizedClientRequestContext(accessToken);
    } catch (error) {
      Logger.logError("Error", `Failed with error: ${error}`);
    }
    if (requestContext) {
      projectId = process.env.IMJS_CONTEXT_ID;
      console.log(`iModel project id: ${projectId}`);
      const iModel  = await ConnectorHelper.getiModel(requestContext,projectId!,process.env.IMJS_IMODEL_ID!);
      if(iModel && iModel.name)
        iModelName = iModel.name;
      else
        throw new Error("iModel not found..") 
      console.log("iModelName" + iModelName)
      await BriefcaseManager.deleteAllBriefcases(requestContext, process.env.IMJS_IMODEL_ID!);
  }
}
catch (error) {
 
}
finally {
  await Utilities.shutdownBackend();
  process.exit();
}
}
// Invoke main if Main.js is being run directly
if (require.main === module) {
  // tslint:disable-next-line: no-floating-promises
  main(process);
}




