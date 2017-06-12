import { trim, castArray, intersection } from 'lodash';
import { createAttributeBuilder, AttributeBuilder, Attribute } from './attribute';
import { Relation, RelationsBuilder, createRelationBuilder } from './relation';

export type Scope = string | string[];

export interface Indexes<F> {
  unique: (keyof F)[][];
}

export type Records = { [alias: string]: SpecType };
export type Sets = { [alias: string]: SpecType };

export type SpecType<
  F = {},
  R extends Records = Records,
  S extends Sets = Sets,
  N extends string = string> = { name: N; fields: F; records: R; sets: S };

export type EmptySpec = SpecType<{}, {}, {}, string>;
export type AnySpec = SpecType<any, any, any, string>;

export type Model<T extends SpecType> =
  & T['fields']
  & {[P in keyof T['records']]: Model<T['records'][P]>}
  & {[P in keyof T['sets']]: Model<T['sets'][P]>[]};

export interface Spec<T extends SpecType = SpecType> {
  model: Model<T>;
  type: T;
  name: T['name'];
  scope: Scope;
  join: boolean;
  attributes: Attribute<T['fields']>[];
  indexes: Indexes<T['fields']>;
  relations: Relation<T>[];
  initialize: () => void;
}

export interface CreateSpecOptions<N extends string> {
  name: N;
  scope: Scope;
}

export interface SpecBuilder<T extends SpecType> {
  attribute: AttributeBuilder<T['fields']>;
  relation: RelationsBuilder<T>;
  multicolumnUniqueIndex(...fields: (keyof T['fields'])[]): void;
}

export function createSpec<T extends SpecType>(
  options: CreateSpecOptions<T['name']>,
  initializer?: (specBuilder: SpecBuilder<T>) => void,
): Spec<T> {
  const spec = <Spec<T>>{
    attributes: [],
    indexes: { unique: [] },
    initialize,
    join: false,
    model: undefined!,
    name: options.name,
    relations: [],
    scope: options.scope,
    type: undefined!,
  };

  const builder = <SpecBuilder<T>>{
    attribute: createAttributeBuilder(spec),
    relation: createRelationBuilder(spec),

    multicolumnUniqueIndex(...fields: (keyof T['fields'])[]) {
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

function validateScope(scope: Scope): boolean {
  if (typeof scope !== 'string') {
    return false;
  }

  return trim(scope) !== '';
}

export function collide(first: Scope, second: Scope): boolean {
  const firstAsArray = castArray(first || undefined);
  const secondAsArray = castArray(second || undefined);

  return intersection(firstAsArray, secondAsArray).filter(validateScope).length > 0;
}
