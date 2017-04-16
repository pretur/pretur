import { trim, castArray, intersection } from 'lodash';
import { createAttributeBuilder, AttributeBuilder, Attribute } from './attribute';
import { Relation, RelationsBuilder, createRelationBuilder } from './relation';
import { Spec } from './spec';

export type Owner = string | string[];

export interface Indexes {
  unique: string[][];
}

export interface Spec<T extends object> {
  name: string;
  owner: Owner;
  join: boolean;
  attributes: Attribute<T, keyof T>[];
  indexes: Indexes;
  relations: Relation<T>[];
  initialize: () => void;
}

export interface CreateSpecOptions {
  name: string;
  owner: Owner;
}

export interface SpecBuilder<T extends object> {
  attribute: AttributeBuilder<T>;
  relation: RelationsBuilder<T>;
  multicolumnUniqueIndex(...fields: (keyof T)[]): void;
}

export function createSpec<T extends object>(
  options: CreateSpecOptions,
  initializer?: (specBuilder: SpecBuilder<T>) => void,
): Spec<T> {
  const spec: Spec<T> = {
    attributes: [],
    indexes: { unique: [] },
    join: false,
    name: options.name,
    owner: options.owner,
    relations: [],
    initialize,
  };

  const builder = <SpecBuilder<T>>{
    attribute: createAttributeBuilder(spec),
    relation: createRelationBuilder(spec),

    multicolumnUniqueIndex(...fields: string[]) {
      spec.indexes.unique.push(fields);
    },
  };

  function initialize() {
    if (typeof initializer === 'function') {
      initializer(builder);
    }
  }

  return spec;
}

export interface SpecPool {
  [model: string]: Spec<any>;
}

export function buildSpecPool(...specs: Spec<any>[]): SpecPool {
  const pool: SpecPool = {};

  for (const spec of specs) {
    pool[spec.name] = spec;
  }

  return pool;
}

function validateOwnder(owner: Owner): boolean {
  if (typeof owner !== 'string') {
    return false;
  }

  return trim(owner) !== '';
}

export function ownersIntersect(first: Owner, second: Owner): boolean {
  const firstAsArray = castArray(first || undefined);
  const secondAsArray = castArray(second || undefined);

  return intersection(firstAsArray, secondAsArray).filter(validateOwnder).length > 0;
}
