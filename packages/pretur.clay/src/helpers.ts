import { Spec, SpecType, Model, SpecPool } from 'pretur.spec';
import { Dispatch } from 'pretur.redux';
import { Query, MutateRequest, Requester } from 'pretur.sync';
import { State, refresh } from './clay';
import { Querier } from './Querier';
import { Record } from './Record';
import { Set } from './Set';
import { Fields, buildFields, buildRecord, buildSet } from './fields';

export interface MutationGetter<T extends SpecType = SpecType> {
  (clay: Set<T> | Record<T>, model: T['name']): MutateRequest<T>[];
}

function buildGetMutations<T extends SpecType>(
  spec: Spec<T>,
  mutationGetter: MutationGetter<T>,
  clay: Set<T> | Record<T>,
): MutateRequest<T>[] {
  return mutationGetter(clay, spec.name);
}

function buildQuerier<T extends SpecType>(
  spec: Spec<T>,
  query: Query<T> = {},
): Querier<T> {
  return new Querier<T>(spec.name, query);
}

async function loadSimple<T extends SpecType>(
  spec: Spec<T>,
  requester: Requester,
  query: Query<T> = {},
) {
  const { data = [], count = 0 } = await requester.select<T>(spec.name, query);
  return { data, count };
}

async function loadIntoSet<T extends SpecType>(
  pool: SpecPool,
  spec: Spec<T>,
  requester: Requester,
  dispatch: Dispatch,
  set: Set<T>,
  query: Query<T> = {},
) {
  const { data = [] } = await requester.select<T>(spec.name, query);
  set.replace(dispatch, buildSet(pool, spec, data));
}

async function loadIntoRecord<T extends SpecType>(
  pool: SpecPool,
  spec: Spec<T>,
  requester: Requester,
  dispatch: Dispatch,
  record: Record<T>,
  query: Query<T> = {},
) {
  const { data } = await requester.select<T>(spec.name, query);
  const row = data && data[0];
  if (row) {
    record.replace(dispatch, buildRecord(pool, spec, row));
    return true;
  }
  return false;
}

export async function selectAndRefresh<T extends SpecType>(
  pool: SpecPool,
  spec: Spec<T>,
  requester: Requester,
  dispatch: Dispatch,
  set: Set<T>,
  querier: Querier<T>,
  extra: Query<T> = {},
) {
  const { data = [], count = 0 } = await requester.select<T>(spec.name, {
    ...querier.query,
    ...extra,
  });
  refresh(dispatch, set, querier, { data: buildSet<T>(pool, spec, data), count });
  return { data, count };
}

export interface Helpers<T extends SpecType> {
  fields(values?: Partial<Model<T>>): Fields<T>;

  record(state?: State, values?: Partial<Model<T>>): Record<T>;
  record(values?: Partial<Model<T>>): Record<T>;

  set(items?: Partial<Model<T>>[]): Set<T>;

  mutations(clay: Set<T> | Record<T>): MutateRequest<T>[];

  querier(query?: Query<T>): Querier<T>;

  load(query?: Query<T>): Promise<{ data: Model<T>[], count: number }>;
  load(dispatch: Dispatch, set: Set<T>, query?: Query<T>): Promise<void>;
  load(dispatch: Dispatch, record: Record<T>, query?: Query<T>): Promise<boolean>;

  select(
    dispatch: Dispatch,
    set: Set<T>,
    querier: Querier<T>,
    extra?: Query<T>,
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

    function record(state?: State, values?: Partial<Model<T>>): Record<T>;
    function record(fields?: Partial<Model<T>>): Record<T>;
    function record(
      stateOrFields?: Partial<Model<T>> | State,
      values?: Partial<Model<T>>,
    ): Record<T> {
      if (typeof stateOrFields === 'string') {
        return buildRecord<T>(pool, spec, values, stateOrFields);
      }
      return buildRecord<T>(pool, spec, stateOrFields);
    }

    function set(items: Partial<Model<T>>[] = []): Set<T> {
      return buildSet<T>(pool, spec, items);
    }

    function mutations(clay: Set<T> | Record<T>): MutateRequest<T>[] {
      return buildGetMutations(spec, mutationGetter, clay);
    }

    function querier(query: Query<T> = {}): Querier<T> {
      return buildQuerier(spec, query);
    }

    async function load(query?: Query<T>): Promise<{ data: Model<T>[], count: number }>;
    async function load(dispatch: Dispatch, set: Set<T>, query?: Query<T>): Promise<void>;
    async function load(dispatch: Dispatch, record: Record<T>, query?: Query<T>): Promise<boolean>;
    async function load(
      queryOrDispatch?: Query<T> | Dispatch,
      clay?: Set<T> | Record<T>,
      query?: Query<T>,
    ) {
      if (typeof queryOrDispatch === 'function' && clay) {
        if (clay instanceof Record) {
          return loadIntoRecord(pool, spec, requester, queryOrDispatch, clay, query);
        }

        return loadIntoSet(pool, spec, requester, queryOrDispatch, clay, query);
      }

      return loadSimple(spec, requester, <Query<T>>queryOrDispatch);
    }

    async function select(
      dispatch: Dispatch,
      targetSet: Set<T>,
      targetQuerier: Querier<T>,
      extra?: Query<T>,
    ) {
      return selectAndRefresh(pool, spec, requester, dispatch, targetSet, targetQuerier, extra);
    }

    return { fields, record, set, mutations, querier, load, select };
  };
}
