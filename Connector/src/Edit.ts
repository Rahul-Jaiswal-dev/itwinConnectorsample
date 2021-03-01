/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { ClientRequestContext, DbResult, GuidString } from "@bentley/bentleyjs-core";
import { BriefcaseDb, BriefcaseManager, ConcurrencyControl, DesktopAuthorizationClient, ECSqlStatement, IModelHost } from "@bentley/imodeljs-backend";
import { DesktopAuthorizationClientConfiguration, ElementProps, LocalBriefcaseProps, RequestNewBriefcaseProps } from "@bentley/imodeljs-common";
import { AccessToken, AuthorizedClientRequestContext } from "@bentley/itwin-client";

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
    await IModelHost.startup();
    const accessToken: AccessToken | undefined = await signIn();
    if (!accessToken) {
         process.stdout.write("Failed to sign-in\n");
         return;
    }

  //  const ABCD = await BriefcaseManager.create(new AuthorizedClientRequestContext(accessToken), "b13edf47-b0ac-427a-b779-0c0488c0b9d1", "NewiModel", { rootSubject: { name: "Rahul-imodel-Electron" } });
    let editJob;
    const fs = require("fs");
    const json = fs.readFileSync(__dirname + "/test_edits.json","utf8");
    if (json === undefined) {
      process.stdout.write("Must define a json defining edits to make");
      return;
    } else {
      editJob = JSON.parse(json);
    }
    const url = new URL(editJob.url);
    const projectId = url.searchParams.get("projectId");
    const iModelId = url.searchParams.get("iModelId");
    if (projectId === null || iModelId === null) {
      process.stdout.write(`Could not parse project and imodel id from URL ${url.toString()}`);
      return;
    }

    process.stdout.write(`Started opening iModel at latest revision (projectId=${projectId}, iModelId=${iModelId})\n`);
    const requestContext: AuthorizedClientRequestContext = new AuthorizedClientRequestContext(accessToken);

    const localBriefcases = BriefcaseManager.getCachedBriefcases(iModelId);
    process.stdout.write(`Found ${localBriefcases.length} cached briefcases\n`);
    let briefcaseProps: LocalBriefcaseProps;
    if (localBriefcases.length > 0) {
      briefcaseProps = localBriefcases[0];
      process.stdout.write(`Using cached briefcase:\n`);
    } else {
      // This will reserve a new briefcase id for the user, there are a limited number of available briefcase ids per user.
      process.stdout.write(`Downloading new briefcase\n`);
      const briefcaseRequest: RequestNewBriefcaseProps = {
        contextId: projectId,
        iModelId: iModelId,
        briefcaseId: editJob.briefcaseId,
      };
      briefcaseProps = await BriefcaseManager.downloadBriefcase(requestContext, briefcaseRequest);
      requestContext.enter();
      process.stdout.write(`Using briefcase:\n`);
    }

    const iModelDb =  await BriefcaseDb.open(requestContext, briefcaseProps);
    requestContext.enter();
    process.stdout.write(`Finished opening iModel\n`);
    try {
      // Set optimistic policy so no locking is required.
      iModelDb.concurrencyControl.setPolicy(new ConcurrencyControl.OptimisticPolicy());

      // Remove subject channels so that we can edit
      const subjectChannels: Array<{ id: GuidString, json: string }> = [];
      iModelDb.withPreparedStatement("select ECInstanceId from bis.subject where json_extract(jsonproperties, '$.Subject.Job') IS NOT NULL", (stmt: ECSqlStatement) => {
        while (stmt.step() === DbResult.BE_SQLITE_ROW) {
          const subject = iModelDb.elements.getElementProps(stmt.getValue(0).getId());
          subjectChannels.push({ id: stmt.getValue(0).getId(), json: subject.jsonProperties });
          subject.jsonProperties = "";
          iModelDb.elements.updateElement(subject);
        }
        iModelDb.saveChanges();
      });

      const elementEdits = editJob?.edits?.elements;
      if (elementEdits) {
        for (const elEdit of elementEdits) {
          switch (elEdit.operation) {
            case "modify":
              const element = iModelDb.elements.tryGetElementProps(elEdit.id);
              if (!element) {
                process.stdout.write(`Could not find element with id: ${elEdit.id}\n`);
                continue;
              }
              for (const [name, value] of Object.entries(elEdit.properties)) {
                if (name.toUpperCase() === "CODEVALUE") {
                  element.code.value = value as string;
                } else {
                  element[name as keyof ElementProps] = value;
                }
              }
              iModelDb.elements.updateElement(element);
              break;
            default:
              process.stdout.write(`Unsupported operation: ${elEdit.operation}`);
          }
        }
      }

      // push subject channels back into db to be nice
      // for (const subChan of subjectChannels) {
      //   const subject = iModelDb.elements.getElementProps(subChan.id);
      //   subject.jsonProperties = subChan.json;
      //   iModelDb.elements.updateElement(subject);
      // }

      // Save and push changes to the hub
      await iModelDb.concurrencyControl.request(requestContext);
      requestContext.enter();
      iModelDb.saveChanges();
      await iModelDb.pushChanges(requestContext, editJob.description);
      requestContext.enter();
    } catch (error) {
      requestContext.enter();
     // process.stdout.write(`Edit ${editJob.name} failed, abandoning changes. Error: ${error}\n`);
      iModelDb.abandonChanges();
      await iModelDb.concurrencyControl.abandonResources(requestContext);
      requestContext.enter();
    } finally {
      await iModelDb.close();
    }

    IModelHost.shutdown();

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
