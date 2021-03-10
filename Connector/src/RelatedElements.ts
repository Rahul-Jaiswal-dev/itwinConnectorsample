/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { PhysicalElementAssemblesElements } from "@bentley/imodeljs-backend";
import { RelatedElement, RelatedElementProps } from "@bentley/imodeljs-common";
import { Id64String } from "@bentley/bentleyjs-core";
import * as ConnectorElements from "./Elements";
import * as ConnectorRelatedElements from "./RelatedElements";

export class ComponentAssemblesComponents extends PhysicalElementAssemblesElements {
  public static get className(): string { return "ComponentAssemblesComponents"; }
  public static get tableName(): string { return "Assembly"; }
  public static get classFullName(): string { return "ConnectorDynamic:ComponentAssemblesComponents"; }
  public static addRelatedElement(parentComponentElement: ConnectorElements.Component, childComponentElement: ConnectorElements.Component, relatedElement: ConnectorRelatedElements.ComponentAssemblesComponents) {
    (childComponentElement as any).parent = relatedElement;
    console.log(parentComponentElement);
    return childComponentElement;
  }
  constructor(parentId: Id64String, childId: Id64String, relClassName: string) {
    console.log(childId);
    super(parentId, relClassName);
  }
}

export class FloorComposesSpaces extends RelatedElement {
  public static get className(): string { return "FloorComposesSpaces"; }
  public static get tableName(): string { return "Space"; }
  public static get classFullName(): string { return "ConnectorDynamic:FloorComposesSpaces"; }
  public static addRelatedElement(floorElement: ConnectorElements.Floor, spaceElement: ConnectorElements.Space, relatedElement: ConnectorRelatedElements.FloorComposesSpaces) {
    (spaceElement as any).composingElement = relatedElement;
    console.log(floorElement);
    return spaceElement;
  }
  constructor(sourceId: Id64String, targetId: Id64String, relClassName: string) {
    console.log(targetId);
    super({ id: sourceId, relClassName } as RelatedElementProps);
  }
}
