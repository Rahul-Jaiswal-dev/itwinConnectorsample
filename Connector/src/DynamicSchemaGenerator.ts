// /*---------------------------------------------------------------------------------------------
// * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
// * See LICENSE.md in the project root for license terms and full copyright notice.
// *--------------------------------------------------------------------------------------------*/

// import { IModelDb } from "@bentley/imodeljs-backend";
// import { Schema, PrimitiveType, SchemaContextEditor, SchemaContext, SchemaComparer, ISchemaCompareReporter, SchemaChanges, ISchemaChanges, AnyDiagnostic } from "@bentley/ecschema-metadata";
// import { IModelSchemaLoader } from "@bentley/imodeljs-backend/lib/IModelSchemaLoader";
// import { MutableSchema } from "@bentley/ecschema-metadata/lib/Metadata/Schema";
// import { ItemState } from "@bentley/imodel-bridge/lib/Synchronizer";
// import { DOMParser, XMLSerializer } from "xmldom";
// import { DataFetcher } from "./DataFetcher";
// import { PropertyRenameMap, PropertyTypeMap, ConnectorBaseEntityProps,  ConnectorEntityPropMap, ConnectorRelationshipProps } from "./schema/SchemaConfig";

// export class DynamicSchemaGenerator {
//   public dataFetcher: DataFetcher;

//   constructor(dataFetcher: DataFetcher) {
//     this.dataFetcher = dataFetcher;
//   }

//   public async synchronizeSchema(imodel: IModelDb): Promise<SchemaSyncResults> {
//     console.log(` Executing DynamicSchemaGenerator synchronizeSchema...`);
//     const createBaseClasses = async (editor: SchemaContextEditor, schema: Schema) => {
//       for (const entityProp of ConnectorBaseEntityProps) {
//         const baseInsertResult = await editor.entities.createFromProps(schema.schemaKey, entityProp);
//       }
//     };

//     const createProperties = async (editor: SchemaContextEditor, table: any, entityInsertResult: any) => {
//       const cols = await this.dataFetcher.fetchColumns(table.name);
//       for (const col of cols) {
//         const propertyName: string = PropertyRenameMap.hasOwnProperty(col.name) ? PropertyRenameMap[col.name] : col.name;
//         const propertyType: any = PropertyTypeMap.hasOwnProperty(propertyName) ? PropertyTypeMap[propertyName] : { typeName: "string", typeValue: PrimitiveType.String };
//         const property = { name: propertyName, type: "PrimitiveProperty", typeName: propertyType.typeName };
//         const propertyInsertResult = await editor.entities.createPrimitivePropertyFromProps(
//           entityInsertResult.itemKey!,
//           propertyName,
//           propertyType.typeValue,
//           property,
//         );
//       }
//     };

//     const createEntityclasses = async (editor: SchemaContextEditor, schema: Schema) => {
//       const tables = await this.dataFetcher.fetchTables();
//       console.log(schema.toJSON());
//       for (const table of tables) {
//         const entityClassProps = ConnectorEntityPropMap[table.name];
//         if (!entityClassProps) continue;
//         const entityInsertResult = await editor.entities.createFromProps(schema.schemaKey, entityClassProps);
//         await createProperties(editor, table, entityInsertResult);
//       }
//     };

//     const createRelationshipClasses = async (editor: SchemaContextEditor, schema: Schema) => {
//       for (const relationshipClassProps of ConnectorRelationshipProps) {
//         const relationshipInsertResult = await editor.relationships.createFromProps(schema.schemaKey, relationshipClassProps);
//       }
//     };

//     const createSchema = async (increaseVersion: boolean) => {
//       const schemaVersion = imodel.querySchemaVersion("ConnectorDynamic");
//       let [readVersion, writeVersion, minorVersion] = [1, 0, 0];
//       if (increaseVersion) {
//         [readVersion, writeVersion, minorVersion] = schemaVersion!.split(".").map((version) => parseInt(version, 10));
//         minorVersion += 1;
//       }

//       const context = new SchemaContext();
//       const editor = new SchemaContextEditor(context);
//       const newSchema = new Schema(context, "ConnectorDynamic", "cbd", readVersion, writeVersion, minorVersion);

//       const bisSchema = loader.getSchema("BisCore");
//       const funcSchema = loader.getSchema("Functional");
//       const buildingSpatialSchema = loader.getSchema("BuildingSpatial");
//       const spatialComppositionSchema = loader.getSchema("SpatialComposition");
//       const iotSchema = loader.getSchema("IoTDevice");

//       await context.addSchema(newSchema);
//       await context.addSchema(bisSchema);
//       await context.addSchema(funcSchema);
//       await context.addSchema(buildingSpatialSchema);
//       await context.addSchema(spatialComppositionSchema);
//       await context.addSchema(iotSchema);
//       await (newSchema as MutableSchema).addReference(bisSchema); // TODO remove this hack later
//       await (newSchema as MutableSchema).addReference(funcSchema);
//       await (newSchema as MutableSchema).addReference(buildingSpatialSchema);
//       await (newSchema as MutableSchema).addReference(spatialComppositionSchema);
//       await (newSchema as MutableSchema).addReference(iotSchema);

//       await createBaseClasses(editor, newSchema);
//       await createEntityclasses(editor, newSchema);
//       await createRelationshipClasses(editor, newSchema);
//       return newSchema;
//     };

//     const loader = new IModelSchemaLoader(imodel);
//     const existingSchema = loader.tryGetSchema("ConnectorDynamic");
//     const latestSchema = await createSchema(false);

//     let schemaState: ItemState = ItemState.New;
//     let dynamicSchema = latestSchema;

//     if (existingSchema) {
//       const reporter = new DynamicSchemaCompareReporter();
//       const comparer = new SchemaComparer(reporter);
//       await comparer.compareSchemas(latestSchema, existingSchema);
//       const schemaIsChanged = reporter.diagnostics.length > 0;
//       if (schemaIsChanged) {
//         schemaState = ItemState.Changed;
//         dynamicSchema = await createSchema(true);
//       } else {
//         schemaState = ItemState.Unchanged;
//         dynamicSchema = existingSchema;
//       }
//     }
//     return { schemaState, dynamicSchema } as SchemaSyncResults;
//   }

//   public async schemaToString(schema: Schema): Promise<string> {
//     let xmlDoc = new DOMParser().parseFromString(`<?xml version="1.0" encoding="UTF-8"?>`);
//     xmlDoc = await schema.toXml(xmlDoc);
//     const xmlString = new XMLSerializer().serializeToString(xmlDoc);
//     return xmlString;
//   }
// }

// export interface SchemaSyncResults {
//   schemaState: ItemState;
//   dynamicSchema: Schema;
// }

// class DynamicSchemaCompareReporter implements ISchemaCompareReporter {
//   public changes: SchemaChanges[] = [];

//   public report(schemaChanges: ISchemaChanges): void {
//     this.changes.push(schemaChanges as SchemaChanges);
//   }

//   public get diagnostics(): AnyDiagnostic [] {
//     let diagnostics: AnyDiagnostic [] = [];
//     for (const changes of this.changes) {
//       diagnostics = diagnostics.concat(changes.allDiagnostics);
//     }
//     return diagnostics;
//   }
// }
