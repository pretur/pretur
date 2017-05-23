import { trim, castArray, intersection } from 'lodash';
import { createAttributeBuilder, AttributeBuilder, Attribute } from './attribute';
import { Relation, RelationsBuilder, createRelationBuilder } from './relation';
import { Spec } from './spec';

export type Scope = string | string[];

export interface Indexes<F> {
  unique: (keyof F)[][];
}

export type ModelType<F = any, R = any, S = any, N = any> = {
  name: N;
  fields: F;
  records: R;
  sets: S;
};

export type Sets<S> = {[P in keyof S]: S[P][]};

export type Model<
  T extends ModelType<F, R, S, N> = ModelType,
  F = T['fields'],
  R = T['records'],
  S = T['sets'],
  N = T['name']> = F & R & Sets<S> & { $name: N; $type: T };

export interface Spec<
  M extends Model<ModelType<F, R, S, N>> = Model,
  F = M['$type']['fields'],
  R = M['$type']['records'],
  S = M['$type']['sets'],
  N extends string = M['$type']['name']> {
  $model: M;
  name: N;
  scope: Scope;
  join: boolean;
  attributes: Attribute<F>[];
  indexes: Indexes<F>;
  relations: Relation<R, S>[];
  initialize: () => void;
}

export interface CreateSpecOptions<N extends string> {
  name: N;
  scope: Scope;
}

export interface SpecBuilder<F, R, S> {
  attribute: AttributeBuilder<F>;
  relation: RelationsBuilder<F, R, S>;
  multicolumnUniqueIndex(...fields: (keyof F)[]): void;
}

export function createSpec<
  M extends Model<T>,
  T extends ModelType<F, R, S, N> = M['$type'],
  F = T['fields'],
  R = T['records'],
  S = T['sets'],
  N extends string = M['$type']['name']>(
  options: CreateSpecOptions<N>,
  initializer?: (specBuilder: SpecBuilder<F, R, S>) => void,
): Spec<M> {
  const spec: Spec<M> = {
    $model: undefined!,
    attributes: [],
    indexes: { unique: [] },
    join: false,
    name: options.name,
    relations: [],
    scope: options.scope,
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
