import * as Bluebird from 'bluebird';
import { Spec, SpecPool } from 'pretur.spec';
import { Dispatch } from 'pretur.redux';
import { Query, MutateRequest, Requester } from 'pretur.sync';
import { Clay, State, refresh } from './clay';
import { Querier } from './Querier';
import { Value } from './Value';
import { Record } from './Record';
import { Set } from './Set';

export type FieldMap<A> = {
  [P in keyof A]?: Clay;
};

function buildFields<A extends object, F extends FieldMap<A>>(
  pool: SpecPool,
  spec: Spec<A>,
  values: Partial<A> = {},
): F {
  const fields = <F>{};

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

function buildRecord<A extends object, F extends FieldMap<A>>(
  pool: SpecPool,
  spec: Spec<A>,
  values: Partial<A> = {},
  state: State = 'normal',
): Record<F> {
  return new Record<F>(buildFields<A, F>(pool, spec, values), undefined, state);
}

function buildSet<A extends object, F extends FieldMap<A>>(
  pool: SpecPool,
  spec: Spec<A>,
  items: Partial<A>[] = [],
): Set<Record<F>> {
  return new Set<Record<F>>(items.map(item => buildRecord<A, F>(pool, spec, item)));
}

function buildGetMutations<A extends object, F extends FieldMap<A>>(
  spec: Spec<A>,
  mutationGetter: (clay: Set<Record<any>> | Record<any>, model: string) => MutateRequest<any>[],
  clay: Set<Record<F>> | Record<F>,
): MutateRequest<any>[] {
  return mutationGetter(clay, spec.name);
}

function buildQuerier<A extends object>(
  spec: Spec<A>,
  query?: Partial<Query<A>>,
): Querier<A> {
  return new Querier<A>({ ...query, model: spec.name });
}

async function loadSimple<A extends object>(
  spec: Spec<A>,
  requester: Requester,
  query?: Partial<Query<A>>,
): Bluebird<{ data: A[], count: number }> {
  const { data = [], count = 0 } = await requester.select<A>({ ...query, model: spec.name });
  return { data, count };
}

async function loadIntoSet<A extends object, F extends FieldMap<A>>(
  pool: SpecPool,
  spec: Spec<A>,
  requester: Requester,
  dispatch: Dispatch,
  set: Set<Record<F>>,
  query?: Partial<Query<A>>,
): Bluebird<void> {
  const { data = [] } = await requester.select<A>({ ...query, model: spec.name });
  set.replace(dispatch, buildSet<A, F>(pool, spec, data));
}

async function loadIntoRecord<A extends object, F extends FieldMap<A>>(
  pool: SpecPool,
  spec: Spec<A>,
  requester: Requester,
  dispatch: Dispatch,
  record: Record<F>,
  query?: Partial<Query<A>>,
): Bluebird<boolean> {
  const { data } = await requester.select<A>({ ...query, model: spec.name });
  const row = data && data[0];
  if (row) {
    record.replace(dispatch, buildRecord<A, F>(pool, spec, row));
    return true;
  }
  return false;
}

export async function selectAndRefresh<A extends object, F extends FieldMap<A>>(
  pool: SpecPool,
  spec: Spec<A>,
  requester: Requester,
  dispatch: Dispatch,
  set: Set<Record<F>>,
  querier: Querier<A>,
  extra?: Partial<Query<A>>,
): Bluebird<{ data: A[], count: number }> {
  const { data = [], count = 0 } = await requester.select<A>({ ...querier.query, ...extra });
  refresh(dispatch, set, querier, { data: buildSet<A, F>(pool, spec, data), count });
  return { data, count };
}

export interface Helpers<A extends object, F extends FieldMap<A>> {
  fields(values?: Partial<A>): F;

  record(state?: State, values?: Partial<A>): Record<F>;
  record(values?: Partial<A>): Record<F>;

  set(items?: Partial<A>[]): Set<Record<F>>;

  mutations(clay: Set<Record<F>> | Record<F>): MutateRequest<any>[];

  querier(query?: Partial<Query<A>>): Querier<A>;

  load(query?: Partial<Query<A>>): Bluebird<{ data: A[], count: number }>;
  load(dispatch: Dispatch, set: Set<Record<F>>, query?: Partial<Query<A>>): Bluebird<void>;
  load(dispatch: Dispatch, record: Record<F>, query?: Partial<Query<A>>): Bluebird<boolean>;

  select(
    dispatch: Dispatch,
    set: Set<Record<F>>,
    querier: Querier<A>,
    extra?: Partial<Query<A>>,
  ): Bluebird<{ data: A[], count: number }>;
}

export interface HelperFactory {
  <A extends object, F extends FieldMap<A>>(spec: Spec<A>): Helpers<A, F>;
}

export function buildHelpersFactory(
  pool: SpecPool,
  requester: Requester,
  mutationGetter: (clay: Set<Record<any>> | Record<any>, model: string) => MutateRequest<any>[],
): HelperFactory {
  return function helperFactory<A extends object, F extends FieldMap<A>>(
    spec: Spec<A>,
  ): Helpers<A, F> {

    function fields(values?: Partial<A>): F {
      return buildFields<A, F>(pool, spec, values);
    }

    function record(state?: State, values?: Partial<A>): Record<F>;
    function record(fields?: Partial<A>): Record<F>;
    function record(stateOrFields?: Partial<A> | State, values?: Partial<A>): Record<F> {
      if (typeof stateOrFields === 'string') {
        return buildRecord<A, F>(pool, spec, values, stateOrFields);
      }
      return buildRecord<A, F>(pool, spec, stateOrFields);
    }

    function set(items: Partial<A>[] = []): Set<Record<F>> {
      return buildSet<A, F>(pool, spec, items);
    }

    function mutations(clay: Set<Record<F>> | Record<F>): MutateRequest<any>[] {
      return buildGetMutations(spec, mutationGetter, clay);
    }

    function querier(query?: Partial<Query<A>>): Querier<A> {
      return buildQuerier(spec, query);
    }

    async function load(query?: Partial<Query<A>>): Bluebird<{ data: A[], count: number }>;
    async function load(
      dispatch: Dispatch,
      set: Set<Record<F>>,
      query?: Partial<Query<A>>,
    ): Bluebird<void>;
    async function load(
      dispatch: Dispatch,
      record: Record<F>,
      query?: Partial<Query<A>>,
    ): Bluebird<boolean>;
    async function load(
      queryOrDispatch?: Partial<Query<A>> | Dispatch,
      clay?: Set<Record<F>> | Record<F>,
      query?: Partial<Query<A>>,
    ): Bluebird<{ data: A[], count: number } | void | boolean> {
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
      set: Set<Record<F>>,
      querier: Querier<A>,
      extra?: Partial<Query<A>>,
    ): Bluebird<{ data: A[], count: number }> {
      return selectAndRefresh(pool, spec, requester, dispatch, set, querier, extra);
    }

    return { fields, record, set, mutations, querier, load, select };
  };
}
