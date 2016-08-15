import { Validator } from 'pretur.validation';
import { Indexes, RawModel } from './model';
import { Attribute } from './attribute';
import { Relation } from './relation';
import { uniq, find, assign, castArray, intersection } from 'lodash';

export interface AttributeMap {
  [name: string]: Attribute<any>;
}

export interface AliasModelMap {
  [alias: string]: string;
}

export interface AliasKeyMap {
  [alias: string]: string;
}

export interface Relations {
  superclass: Relation[];
  subclass: Relation[];
  master: Relation[];
  detail: Relation[];
  recursive: Relation[];
  manyToMany: Relation[];
  injective: Relation[];
  byAlias(alias: string): Relation;
}

export interface Model<T> {
  name: string;
  owner: string | string[];
  virtual: boolean;
  join: boolean;
  validator?: Validator<T>;
  attributes: AttributeMap;
  attributeArray: Attribute<any>[];
  indexes: Indexes;
  relations: Relations;
  relationArray: Relation[];
  nonVirtualRelations: Relations;
  nonVirtualRelationArray: Relation[];
  dependencies: string[];
  nonVirtualDependencies: string[];
  filterByOwner(owner: string | string[]): Model<T>;
}

function ownersIntersect(first: string | string[], second: string | string[]): boolean {
  const f = castArray(first);
  const s = castArray(second);

  return intersection(f, s).filter(i => i).length > 0;
}

export function buildModelFromRaw<T>(raw: RawModel<T>): Model<T> {
  const relations = () => raw.relations;
  const nonVirtualRelations = () => raw.relations.filter(r => !r.virtual);
  const attributes = () => raw.attributes;

  const model = <Model<T>>{
    get name() {
      return raw.name;
    },
    get owner() {
      return raw.owner;
    },
    get virtual() {
      return raw.virtual;
    },
    get join() {
      return raw.join;
    },
    get validator() {
      return raw.validator;
    },
    get attributes() {
      return attributes().reduce(
        (map, attrib) => {
          map[attrib.name] = attrib;
          return map;
        },
        <AttributeMap>{}
      );
    },
    get attributeArray() {
      return attributes();
    },
    get indexes() {
      return raw.indexes;
    },
    get relations() {
      return relations().reduce(
        (map, relation) => {
          switch (relation.type) {
            case 'SUPERCLASS':
              map.superclass.push(relation);
              break;
            case 'SUBCLASS':
              map.subclass.push(relation);
              break;
            case 'MASTER':
              map.master.push(relation);
              break;
            case 'DETAIL':
              map.detail.push(relation);
              break;
            case 'RECURSIVE':
              map.recursive.push(relation);
              break;
            case 'MANY_TO_MANY':
              map.manyToMany.push(relation);
              break;
            case 'INJECTIVE':
              map.injective.push(relation);
              break;
          }
          return map;
        },
        <Relations>{
          superclass: [],
          subclass: [],
          master: [],
          detail: [],
          recursive: [],
          manyToMany: [],
          injective: [],
          byAlias: alias => find(relations(), { alias }),
        }
      );
    },
    get relationArray() {
      return relations();
    },
    get nonVirtualRelations() {
      return nonVirtualRelations().reduce(
        (map, relation) => {
          switch (relation.type) {
            case 'SUPERCLASS':
              map.superclass.push(relation);
              break;
            case 'SUBCLASS':
              map.subclass.push(relation);
              break;
            case 'MASTER':
              map.master.push(relation);
              break;
            case 'DETAIL':
              map.detail.push(relation);
              break;
            case 'RECURSIVE':
              map.recursive.push(relation);
              break;
            case 'MANY_TO_MANY':
              map.manyToMany.push(relation);
              break;
            case 'INJECTIVE':
              map.injective.push(relation);
              break;
          }
          return map;
        },
        <Relations>{
          superclass: [],
          subclass: [],
          master: [],
          detail: [],
          recursive: [],
          manyToMany: [],
          injective: [],
          byAlias: alias => find(relations(), { alias }),
        }
      );
    },
    get nonVirtualRelationArray() {
      return nonVirtualRelations();
    },
    get dependencies() {
      const allRelations = relations();
      return uniq([].concat(
        allRelations.map(r => r.model),
        allRelations.filter(r => r.type === 'MANY_TO_MANY').map(r => r.through)
      )).sort();
    },
    get nonVirtualDependencies() {
      const allRelations = nonVirtualRelations();
      return uniq([].concat(
        allRelations.map(r => r.model),
        allRelations.filter(r => r.type === 'MANY_TO_MANY').map(r => r.through)
      )).sort();
    },
    filterByOwner: null,
  };

  model.filterByOwner = function filterByOwner(owner: string | string[]) {
    if (!owner || !raw.owner || owner.length === 0 || raw.owner.length === 0) {
      return model;
    }

    if (!ownersIntersect(owner, raw.owner)) {
      return null;
    }

    return buildModelFromRaw(assign<{}, RawModel<T>>({}, raw, {
      attributes: raw.attributes.filter(a => !a.owner || ownersIntersect(owner, a.owner)),
      relations: raw.relations.filter(r => !r.owner || ownersIntersect(owner, r.owner)),
    }));
  };

  return model;
}
