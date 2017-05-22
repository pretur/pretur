import { trim, castArray, intersection } from 'lodash';
import { createAttributeBuilder, AttributeBuilder, Attribute } from './attribute';
import { Relation, RelationsBuilder, createRelationBuilder } from './relation';
import { Spec } from './spec';

export type Owner = string | string[];

export interface Indexes<T> {
  unique: (keyof T)[][];
}

export type ModelType<F = any, R = any, S = any> = {
  fields: F;
  records: R;
  sets: S;
};

export type Sets<S> = {[P in keyof S]: S[P][]};

export type Model<
  T extends ModelType<F, R, S> = ModelType,
  F = T['fields'],
  R = T['records'],
  S = T['sets']> = F & R & Sets<S> & { $type: T };

export interface Spec<
  M extends Model<ModelType<F, R, S>> = Model,
  F = M['$type']['fields'],
  R = M['$type']['records'],
  S = M['$type']['sets'],
  N extends string = string> {
  name: N;
  owner: Owner;
  join: boolean;
  attributes: Attribute<F, keyof F>[];
  indexes: Indexes<F>;
  relations: Relation<R, S>[];
  initialize: () => void;
}

export interface CreateSpecOptions {
  name: string;
  owner: Owner;
}

export interface SpecBuilder<F, R, S> {
  attribute: AttributeBuilder<F>;
  relation: RelationsBuilder<F, R, S>;
  multicolumnUniqueIndex(...fields: (keyof F)[]): void;
}

export function createSpec<
  M extends Model<T>,
  T extends ModelType<F, R, S> = M['$type'],
  F = T['fields'],
  R = T['records'],
  S = T['sets']>(
  options: CreateSpecOptions,
  initializer?: (specBuilder: SpecBuilder<F, R, S>) => void,
): Spec<M> {
  const spec: Spec<M> = {
    attributes: [],
    indexes: { unique: [] },
    join: false,
    name: options.name,
    owner: options.owner,
    relations: [],
    initialize,
  };

  const builder = <SpecBuilder<F, R, S>>{
    attribute: createAttributeBuilder(spec),
    relation: createRelationBuilder(spec),

    multicolumnUniqueIndex(...fields: (keyof F)[]) {
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
