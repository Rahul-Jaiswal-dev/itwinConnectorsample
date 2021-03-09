/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { Subject, DefinitionPartition, DefinitionModel, PhysicalPartition, PhysicalModel, SpatialLocationPartition, SpatialLocationModel, SpatialCategory,
  InformationRecordPartition, InformationRecordModel, DocumentPartition, DocumentListModel, GroupInformationPartition, GroupModel, FunctionalPartition, FunctionalModel, FunctionalComponentElement } from "@bentley/imodeljs-backend";
import * as ConnectorElements from "./Elements";
import * as ConnectorRelationships from "./Relationships";
import * as ConnectorRelatedElements from "./RelatedElements";

/*

ElementTree Syntax:

subjects: { <subject_name>: { partitions ... }, ... }
partitions: { <partition_name>: { models ... }, ... }
models: { <model_name>: { elements | elementClasses ... }, ... }
elements: { <element_name>: { element specifications ... }, ... } (# of elements created = Object.keys(elements).length)
elementClasses: { <element_class_name>: { element specifications ... }, ... } (# of elements created = # of rows in a database table)
relationshipClasses: { <relationship_class_name>: { relationship specifications ... }, ... } (# of elements created = # of rows in a database table)

elementClasses | elements: {
  <element_class_name> | <element_name>: {
    ref: reference to the element's corresponding TypeScript class
    (categoryName): globally unique name for a category. It is used to get the category
    typeDefinition: {
      ref: reference to the TypeDefinition Element's TS class
      modelName: the name of the model that contains the TypeDefinition element
      key: the foreign key of a table in the intermediary SQLite database. It is used to get the BIS codeValue of the related Element.
    }
  }
}

relationshipClasses: {
  <relationship_class_name>: {
    ref: reference to the relationship's corresponding TypeScript class
    sourceRef: reference to the source element's corresponding TypeScript class
    sourceModelName: the name of the model that contains the source element
    sourceKey: the foreign key value used to find source element
    targetRef: reference to the target element's corresponding TypeScript class
    targetModelName: the name of the model that contains the target element
    targetKey: the foreign key value used to find target element
  }
}

*/
export const SAMPLE_ELEMENT_TREE3: any = {
  subjects: {
    Subject1: {
      ref: Subject,
      partitions: {
        InformationRecordPartition1: {
          ref: InformationRecordPartition,
          models: {
            InformationRecordModel1: {
              ref: InformationRecordModel,
              elementClasses: {
                Device: {
                  ref: ConnectorElements.Device,
                },
              },
            },
          },
        },
      },
    },
  },
};

export const SAMPLE_ELEMENT_TREE4: any = {
  subjects: {
    Subject1: {
      ref: Subject,
      partitions: {
        FunctionalPartition1: {
          ref: FunctionalPartition,
          models: {
            FunctionalModel1: {
              ref: FunctionalModel,
              elements: {
                Device: {
                  ref: FunctionalComponentElement,
                },
              },
            },
          },
        },
      },
    },
  },
};

export const SAMPLE_ELEMENT_TREE: any = {
  subjects: {
    Subject1: {
      ref: Subject,
      partitions: {
        DefinitionPartition1: {
          ref: DefinitionPartition,
          models: {
            DefinitionModel1: {
              ref: DefinitionModel,
              elements: {
                SpatialCategory1: {
                  ref: SpatialCategory,
                },
              },
              elementClasses: {
                Type: {
                  ref: ConnectorElements.Type,
                },
              },
            },
          },
        },
        PhysicalPartition1: {
          ref: PhysicalPartition,
          models: {
            PhysicalModel1: {
              ref: PhysicalModel,
              elementClasses: {
                Component: {
                  ref: ConnectorElements.Component,
                  categoryName: "SpatialCategory1",
                  typeDefinition: {
                    ref: ConnectorElements.Type,
                    modelName: "DefinitionModel1",
                    key: "Component.typename",
                  },
                },
              },
              relationshipClasses: {
                ComponentConnectsToComponent: {
                  ref: ConnectorRelationships.ComponentConnectsToComponent,
                  sourceRef: ConnectorElements.Component,
                  sourceModelName: "PhysicalModel1",
                  sourceKey: "Connection.rowname1",
                  targetRef: ConnectorElements.Component,
                  targetModelName: "PhysicalModel1",
                  targetKey: "Connection.rowname2",
                },
                ComponentAssemblesComponents: {
                  ref: ConnectorRelatedElements.ComponentAssemblesComponents,
                  sourceRef: ConnectorElements.Component,
                  sourceModelName: "PhysicalModel1",
                  sourceKey: "Assembly.parentname",
                  targetRef: ConnectorElements.Component,
                  targetModelName: "PhysicalModel1",
                  targetKey: "Assembly.childnames",
                },
              },
            },
          },
        },
        SpatialLocationPartition1: {
          ref: SpatialLocationPartition,
          models: {
            SpatialLocationModel1: {
              ref: SpatialLocationModel,
              elementClasses: {
                Facility: {
                  ref: ConnectorElements.Facility,
                  categoryName: "SpatialCategory1",
                },
                Floor: {
                  ref: ConnectorElements.Floor,
                  categoryName: "SpatialCategory1",
                },
                Space: {
                  ref: ConnectorElements.Space,
                  categoryName: "SpatialCategory1",
                },
              },
              relationshipClasses: {
                FloorComposesSpaces: {
                  ref: ConnectorRelatedElements.FloorComposesSpaces,
                  sourceRef: ConnectorElements.Floor,
                  sourceModelName: "SpatialLocationModel1",
                  sourceKey: "Space.floorname",
                  targetRef: ConnectorElements.Space,
                  targetModelName: "SpatialLocationModel1",
                  targetKey: "Space.name",
                },
              },
            },
          },
        },
        InformationRecordPartition1: {
          ref: InformationRecordPartition,
          models: {
            InformationRecordModel1: {
              ref: InformationRecordModel,
              elementClasses: {
                Assembly: {
                  ref: ConnectorElements.Assembly,
                },
                Attribute: {
                  ref: ConnectorElements.Attribute,
                },
                Contact: {
                  ref: ConnectorElements.Contact,
                },
                Connection: {
                  ref: ConnectorElements.Connection,
                },
                Resource: {
                  ref: ConnectorElements.Resource,
                },
                Spare: {
                  ref: ConnectorElements.Spare,
                },
                Job: {
                  ref: ConnectorElements.Job,
                },
                Issue: {
                  ref: ConnectorElements.Issue,
                },
                Impact: {
                  ref: ConnectorElements.Impact,
                },
              },
            },
          },
        },
        GroupInformationPartition1: {
          ref: GroupInformationPartition,
          models: {
            GroupInformationModel1: {
              ref: GroupModel,
              elementClasses: {
                Zone: {
                  ref: ConnectorElements.Zone,
                },
                System: {
                  ref: ConnectorElements.System,
                },
              },
              relationshipClasses: {
                ZoneIncludesSpaces: {
                  ref: ConnectorRelationships.ZoneIncludesSpaces,
                  sourceRef: ConnectorElements.Zone,
                  sourceModelName: "GroupInformationModel1",
                  sourceKey: "Zone.id",
                  targetRef: ConnectorElements.Space,
                  targetModelName: "SpatialLocationModel1",
                  targetKey: "Zone.spacenames",
                },
                SystemGroupsComponents: {
                  ref: ConnectorRelationships.SystemGroupsComponents,
                  sourceRef: ConnectorElements.System,
                  sourceModelName: "GroupInformationModel1",
                  sourceKey: "System.id",
                  targetRef: ConnectorElements.Component,
                  targetModelName: "PhysicalModel1",
                  targetKey: "System.componentnames",
                },
              },
            },
          },
        },
        DocumentPartition1: {
          ref: DocumentPartition,
          models: {
            DocumentListModel1: {
              ref: DocumentListModel,
              elementClasses: {
                Document: {
                  ref: ConnectorElements.Document,
                },
              },
            },
          },
        },
      },
    },
  },
};
