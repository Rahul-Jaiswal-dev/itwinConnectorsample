// /*---------------------------------------------------------------------------------------------
//  * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
//  * See LICENSE.md in the project root for license terms and full copyright notice.
//  *--------------------------------------------------------------------------------------------*/

// import { ClassRegistry, Schema, Schemas } from "@bentley/imodeljs-backend";
// import * as elementsModule from "./Elements";
// import * as relationshipsModule from "./Relationships";

// export class SensorSchema extends Schema {
//   public static get schemaName(): string {
//     return "ConnectorDynamic";
//   }
//   public static registerSchema() {
//     if (this !== Schemas.getRegisteredSchema(this.schemaName)) {
//       Schemas.unregisterSchema(this.schemaName);
//       Schemas.registerSchema(this);
//       ClassRegistry.registerModule(elementsModule, this);
//       ClassRegistry.registerModule(relationshipsModule, this);
//     }
//   }
// }
