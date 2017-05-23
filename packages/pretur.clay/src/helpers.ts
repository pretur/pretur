import { Spec, SpecType, Model, SpecPool } from 'pretur.spec';
import { Dispatch } from 'pretur.redux';
import { Query, MutateRequest, Requester } from 'pretur.sync';
import { State, refresh } from './clay';
import { Querier } from './Querier';
import { Value } from './Value';
import { Record } from './Record';
import { Set } from './Set';

export type Fields<T extends SpecType> =
  & {[P in keyof T['fields']]: Value<T['fields'][P]>}
  & {[P in keyof T['records']]: Record<T['records'][P]>}
  & {[P in keyof T['sets']]: Set<Record<T['sets'][P]>>};

function buildFields<T extends SpecType>(
  pool: SpecPool,
  spec: Spec<T>,
  values: Partial<Model<T>> = {},
): Fields<T> {
  const fields: any = {};

  for (const attribute of spec.attributes) {
    fields[attribute.name] = new Value(values[attribute.name]);
  }

  for (const relation of spec.relations) {
    const target = pool[relation.model];
    if (values[relation.alias]) {
      switch (relation.type) {
        case 'DETAIL':
        case 'MANY_TO_MANY':
          fields[relation.alias] = buildSet(pool, target, values[relation.alias]);
          break;
        default:
          fields[relation.alias] = buildRecord(pool, target, values[relation.alias]);
      }
    }
  }

  return fields;
}

function buildRecord<T extends SpecType>(
  pool: SpecPool,
  spec: Spec<T>,
  values: Partial<Model<T>> = {},
  state: State = 'normal',
): Record<Fields<T>> {
  return new Record(buildFields(pool, spec, values), undefined, state);
}

function buildSet<T extends SpecType>(
  pool: SpecPool,
  spec: Spec<T>,
  items: Partial<Model<T>>[] = [],
): Set<Record<Fields<T>>> {
  return new Set(items.map(item => buildRecord(pool, spec, item)));
}

export interface MutationGetter<T extends SpecType = SpecType> {
  (clay: Set<Record<Fields<T>>> | Record<Fields<T>>, model: T['name']): MutateRequest<T>[];
}

function buildGetMutations<T extends SpecType>(
  spec: Spec<T>,
  mutationGetter: MutationGetter<T>,
  clay: Set<Record<Fields<T>>> | Record<Fields<T>>,
): MutateRequest<T>[] {
  return mutationGetter(clay, spec.name);
}

function buildQuerier<T extends SpecType>(
  spec: Spec<T>,
  query?: Partial<Query<T>>,
): Querier<T> {
  return new Querier<T>({ ...query, model: spec.name });
}

async function loadSimple<T extends SpecType>(
  spec: Spec<T>,
  requester: Requester,
  query?: Partial<Query<T>>,
) {
  const { data = [], count = 0 } = await requester.select<T>({ ...query, model: spec.name });
  return { data, count };
}

async function loadIntoSet<T extends SpecType>(
  pool: SpecPool,
  spec: Spec<T>,
  requester: Requester,
  dispatch: Dispatch,
  set: Set<Record<Fields<T>>>,
  query?: Partial<Query<T>>,
) {
  const { data = [] } = await requester.select<T>({ ...query, model: spec.name });
  set.replace(dispatch, buildSet<T>(pool, spec, data));
}

async function loadIntoRecord<T extends SpecType>(
  pool: SpecPool,
  spec: Spec<T>,
  requester: Requester,
  dispatch: Dispatch,
  record: Record<Fields<T>>,
  query?: Partial<Query<T>>,
) {
  const { data } = await requester.select<T>({ ...query, model: spec.name });
  const row = data && data[0];
  if (row) {
    record.replace(dispatch, buildRecord<T>(pool, spec, row));
    return true;
  }
  return false;
}

export async function selectAndRefresh<T extends SpecType>(
  pool: SpecPool,
  spec: Spec<T>,
  requester: Requester,
  dispatch: Dispatch,
  set: Set<Record<Fields<T>>>,
  querier: Querier<T>,
  extra?: Partial<Query<T>>,
) {
  const { data = [], count = 0 } = await requester.select<T>({
    ...querier.query,
    ...extra,
    model: spec.name,
  });
  refresh(dispatch, set, querier, { data: buildSet<T>(pool, spec, data), count });
  return { data, count };
}

export interface Helpers<T extends SpecType> {
  fields(values?: Partial<Model<T>>): Fields<T>;

  record(state?: State, values?: Partial<Model<T>>): Record<Fields<T>>;
  record(values?: Partial<Model<T>>): Record<Fields<T>>;

  set(items?: Partial<Model<T>>[]): Set<Record<Fields<T>>>;

  mutations(clay: Set<Record<Fields<T>>> | Record<Fields<T>>): MutateRequest<T>[];

  querier(query?: Partial<Query<T>>): Querier<T>;

  load(query?: Partial<Query<T>>): Promise<{ data: Model<T>[], count: number }>;
  load(dispatch: Dispatch, set: Set<Record<Fields<T>>>, query?: Partial<Query<T>>): Promise<void>;
  load(dispatch: Dispatch, record: Record<Fields<T>>, query?: Partial<Query<T>>): Promise<boolean>;

  select(
    dispatch: Dispatch,
    set: Set<Record<Fields<T>>>,
    querier: Querier<T>,
    extra?: Partial<Query<T>>,
  ): Promise<{ data: Model<T>[], count: number }>;
}

export interface HelperFactory {
  <T extends SpecType>(spec: Spec<T>): Helpers<T>;
}

export function buildHelpersFactory(
  pool: SpecPool,
  requester: Requester,
  mutationGetter: MutationGetter<any>,
): HelperFactory {
  return function helperFactory<T extends SpecType>(spec: Spec<T>): Helpers<T> {
    function fields(values?: Partial<Model<T>>): Fields<T> {
      return buildFields<T>(pool, spec, values);
    }

    function record(state?: State, values?: Partial<Model<T>>): Record<Fields<T>>;
    function record(fields?: Partial<Model<T>>): Record<Fields<T>>;
    function record(
      stateOrFields?: Partial<Model<T>> | State,
      values?: Partial<Model<T>>,
    ): Record<Fields<T>> {
      if (typeof stateOrFields === 'string') {
        return buildRecord<T>(pool, spec, values, stateOrFields);
      }
      return buildRecord<T>(pool, spec, stateOrFields);
    }

    function set(items: Partial<Model<T>>[] = []): Set<Record<Fields<T>>> {
      return buildSet<T>(pool, spec, items);
    }

    function mutations(clay: Set<Record<Fields<T>>> | Record<Fields<T>>): MutateRequest<T>[] {
      return buildGetMutations(spec, mutationGetter, clay);
    }

    function querier(query?: Partial<Query<T>>): Querier<T> {
      return buildQuerier(spec, query);
    }

    async function load(query?: Partial<Query<T>>): Promise<{ data: Model<T>[], count: number }>;
    async function load(
      dispatch: Dispatch,
      set: Set<Record<Fields<T>>>,
      query?: Partial<Query<T>>,
    ): Promise<void>;
    async function load(
      dispatch: Dispatch,
      record: Record<Fields<T>>,
      query?: Partial<Query<T>>,
    ): Promise<boolean>;
    async function load(
      queryOrDispatch?: Partial<Query<T>> | Dispatch,
      clay?: Set<Record<Fields<T>>> | Record<Fields<T>>,
      query?: Partial<Query<T>>,
    ) {
      if (typeof queryOrDispatch === 'function' && clay) {
        if (clay instanceof Record) {
          return loadIntoRecord(pool, spec, requester, queryOrDispatch, clay, query);
        }

        return loadIntoSet(pool, spec, requester, queryOrDispatch, clay, query);
      }

      return loadSimple(spec, requester, queryOrDispatch);
    }

    async function select(
      dispatch: Dispatch,
      set: Set<Record<Fields<T>>>,
      querier: Querier<T>,
      extra?: Partial<Query<T>>,
    ) {
      return selectAndRefresh(pool, spec, requester, dispatch, set, querier, extra);
    }

    return { fields, record, set, mutations, querier, load, select };
  };
}
