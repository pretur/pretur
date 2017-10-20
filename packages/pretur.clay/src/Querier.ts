import { isEqual, omit, compact, flatten, zip, fill, get, setWith, cloneDeep } from 'lodash';
import { SpecType, AnySpec } from 'pretur.spec';
import { Reducible, Action, Dispatch } from 'reducible-node';
import { Query, SubQuery, Filter, Ordering } from 'pretur.sync';
import {
  CLAY_REFRESH,
  CLAY_SET_QUERY_ATTRIBUTES,
  CLAY_SET_QUERY_FILTERS,
  CLAY_SET_QUERY_PAGINATION,
  CLAY_SET_QUERY_ORDER,
  CLAY_SET_QUERY_EXTRA,
  CLAY_SET_QUERIEIR_COUNT,
  CLAY_RESET_QUERIEIR,
} from './actions';

function isPath(path?: string[]): boolean {
  return Array.isArray(path) && path.length > 0;
}

export function getFilters(query: Query<any>, path?: string[]): Filter<any> {
  const target = isPath(path) ? getInclude(query, path) : query;
  if (!target || !target.filters) {
    return {};
  }

  return target.filters;
}

export function getInclude(query: Query<any>, path?: string[]): SubQuery<any> | undefined {
  if (!isPath(path)) {
    return;
  }

  const include = get(query, flatten(zip(fill(compact(path), 'include'), compact(path))));

  if (include === true) {
    return {};
  }

  if (!include) {
    return;
  }

  return include;
}

export function setInclude<T extends SpecType, S extends SpecType = SpecType>(
  query: Query<T>,
  include: SubQuery<S>,
  path?: string[],
): void {
  if (isPath(path)) {
    setWith(query, flatten(zip(fill(compact(path), 'include'), compact(path))), include, Object);
  }
}

export class Querier<T extends SpecType> implements Reducible<Querier<T>> {
  public readonly identifier: symbol;
  public readonly count?: number;
  public readonly model: T['name'];
  public readonly query: Query<T>;

  constructor(model: T['name'], query: Query<T>, count?: number, identifier?: symbol) {
    this.identifier = typeof identifier === 'symbol' ? identifier : Symbol();
    this.count = count;
    this.model = model;
    this.query = query;
  }

  public reduce(action: Action<any>): this {
    if (CLAY_SET_QUERY_ATTRIBUTES.is(this.identifier, action)) {
      if (isEqual(this.query.attributes, action.payload)) {
        return this;
      }

      const newQuery = omit(this.query, 'attributes');

      if (Array.isArray(action.payload)) {
        const attributes = <(keyof T['fields'])[]>compact(action.payload);
        if (attributes.length > 0) {
          newQuery.attributes = attributes;
        }
      }

      if (newQuery.pagination) {
        newQuery.pagination = { skip: 0, take: newQuery.pagination.take };
      }

      return <this>new Querier(this.model, newQuery, this.count, this.identifier);
    }

    if (CLAY_SET_QUERY_FILTERS.is(this.identifier, action)) {
      if (!action.payload) {
        return this;
      }

      const { path, filters } = action.payload;

      const target = isPath(path) ? getInclude(this.query, path) : this.query;

      if (target && isEqual(target.filters, filters)) {
        return this;
      }

      let newQuery: Query<T>;

      if (isPath(path)) {
        const include = omit(getInclude(this.query, path), 'filters');
        if (filters) {
          include.filters = filters;
        }
        newQuery = cloneDeep(this.query);
        setInclude<AnySpec>(newQuery, <any>include, path);
      } else {
        newQuery = omit(this.query, 'filters');
        if (filters) {
          newQuery.filters = filters;
        }
      }

      if (newQuery.pagination) {
        newQuery.pagination = { skip: 0, take: newQuery.pagination.take };
      }

      return <this>new Querier(this.model, newQuery, this.count, this.identifier);
    }

    if (CLAY_SET_QUERY_PAGINATION.is(this.identifier, action)) {
      if (isEqual(this.query.pagination, action.payload)) {
        return this;
      }

      const newQuery = omit(this.query, 'pagination');

      if (action.payload) {
        newQuery.pagination = action.payload;
      }

      return <this>new Querier(this.model, newQuery, this.count, this.identifier);
    }

    if (CLAY_SET_QUERY_ORDER.is(this.identifier, action)) {
      if (isEqual(this.query.order, action.payload)) {
        return this;
      }

      const newQuery = omit(this.query, 'order');

      if (action.payload) {
        newQuery.order = action.payload;
      }

      if (newQuery.pagination) {
        newQuery.pagination = { skip: 0, take: newQuery.pagination.take };
      }

      return <this>new Querier(this.model, newQuery, this.count, this.identifier);
    }

    if (CLAY_SET_QUERY_EXTRA.is(this.identifier, action)) {
      if (!action.payload || isEqual(this.query.extra, action.payload.extra)) {
        return this;
      }

      const newQuery = { ...this.query, extra: action.payload.extra };

      if (action.payload.resetPagination && newQuery.pagination) {
        newQuery.pagination = { skip: 0, take: newQuery.pagination.take };
      }

      return <this>new Querier(this.model, newQuery, this.count, this.identifier);
    }

    if (CLAY_SET_QUERIEIR_COUNT.is(this.identifier, action)) {
      if (this.count === action.payload) {
        return this;
      }

      return <this>new Querier(this.model, this.query, action.payload, this.identifier);
    }

    if (CLAY_RESET_QUERIEIR.is(this.identifier, action)) {
      if (!action.payload) {
        return this;
      }

      return <this>new Querier(this.model, action.payload, undefined, this.identifier);
    }

    if (CLAY_REFRESH.is(this.identifier, action)) {
      if (!action.payload || this.count === action.payload.count) {
        return this;
      }

      return <this>new Querier(this.model, this.query, action.payload.count, this.identifier);
    }

    return this;
  }

  public setAttributes(dispatch: Dispatch, attributes?: (keyof T['fields'])[]): void {
    dispatch(CLAY_SET_QUERY_ATTRIBUTES.create.unicast(this.identifier, attributes));
  }

  public resetFilters(
    dispatch: Dispatch,
    filters?: Filter<T>,
    path?: string[],
  ): void {
    dispatch(CLAY_SET_QUERY_FILTERS.create.unicast(this.identifier, { filters, path }));
  }

  public setFilter(
    dispatch: Dispatch,
    field: keyof T['fields'],
    filter: any,
    path?: string[],
  ): void {
    const target = isPath(path) ? getInclude(this.query, path) : this.query;
    const filters: any = target ? { ...target.filters } : {};

    filters[field] = filter;

    dispatch(CLAY_SET_QUERY_FILTERS.create.unicast(this.identifier, { filters, path }));
  }

  public clearFilter(dispatch: Dispatch, field: keyof T['fields'], path?: string[]): void {
    const target = isPath(path) ? getInclude(this.query, path) : this.query;

    if (!target || !target.filters) {
      return;
    }

    const filters = omit(target.filters, field);

    dispatch(CLAY_SET_QUERY_FILTERS.create.unicast(this.identifier, { filters, path }));
  }

  public setPagination(dispatch: Dispatch, skip = 0, take = 0): void {
    dispatch(CLAY_SET_QUERY_PAGINATION.create.unicast(this.identifier, { skip, take }));
  }

  public setOrder(dispatch: Dispatch, field: string, ordering?: Ordering, chain?: string[]): void {
    let targetOrdering: Ordering | undefined = ordering;

    if (typeof targetOrdering !== 'string') {
      if (!this.query.order || this.query.order.field !== field) {
        targetOrdering = 'ASC';
      } else {
        switch (this.query.order.ordering) {
          case 'NONE':
            targetOrdering = 'ASC';
            break;
          case 'ASC':
            targetOrdering = 'DESC';
            break;
          default:
            targetOrdering = 'NONE';
            break;
        }
      }
    }

    dispatch(CLAY_SET_QUERY_ORDER.create.unicast(this.identifier, {
      chain,
      field,
      ordering: targetOrdering,
    }));
  }

  public setExtra(dispatch: Dispatch, extra?: any, resetPagination = false): void {
    dispatch(CLAY_SET_QUERY_EXTRA.create.unicast(this.identifier, { extra, resetPagination }));
  }

  public setCount(dispatch: Dispatch, count?: number): void {
    dispatch(CLAY_SET_QUERIEIR_COUNT.create.unicast(this.identifier, count));
  }

  public reset(dispatch: Dispatch, query: Query<T>): void {
    dispatch(CLAY_RESET_QUERIEIR.create.unicast(this.identifier, query));
  }
}
