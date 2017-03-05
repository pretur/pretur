import { isEqual, omit, compact, flatten, zip, fill, get, setWith, cloneDeep } from 'lodash';
import { Reducible, Action, Dispatch } from 'pretur.redux';
import { Query, SubQuery, QueryFilters, Ordering } from 'pretur.sync';
import { nextId } from './clay';
import {
  CLAY_REFRESH,
  CLAY_SET_QUERY_ATTRIBUTES,
  CLAY_SET_QUERY_FILTERS,
  CLAY_SET_QUERY_PAGINATION,
  CLAY_SET_QUERY_ORDER,
  CLAY_SET_QUERY_EXTRA,
  CLAY_SET_QUERIEIR_COUNT,
} from './actions';

function isPath(path?: string[]): boolean {
  return Array.isArray(path) && path.length > 0;
}

export function getFilters(query: Query<any>, path?: string[]): QueryFilters<any> {
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

export function setInclude<T>(query: Query<T>, include: SubQuery<any>, path?: string[]): void {
  if (isPath(path)) {
    setWith(query, flatten(zip(fill(compact(path), 'include'), compact(path))), include, Object);
  }
}

export class Querier<T> implements Reducible {
  public readonly uniqueId: number;
  public readonly count?: number;
  public readonly query: Query<T>;

  constructor(query: Query<T>, count?: number, uniqueId?: number) {
    this.uniqueId = typeof uniqueId === 'number' ? uniqueId : nextId();
    this.count = count;
    this.query = query;
  }

  public reduce(action: Action<any, any>): this {
    if (CLAY_SET_QUERY_ATTRIBUTES.is(this.uniqueId, action)) {
      if (isEqual(this.query.attributes, action.payload)) {
        return this;
      }

      const newQuery = omit<Query<T>, Query<T>>(this.query, 'attributes');

      if (Array.isArray(action.payload)) {
        const attributes = <(keyof T)[]>compact(action.payload);
        if (attributes.length > 0) {
          newQuery.attributes = attributes;
        }
      }

      if (newQuery.pagination) {
        newQuery.pagination = { skip: 0, take: newQuery.pagination.take };
      }

      return <this>new Querier(newQuery, this.count, this.uniqueId);
    }

    if (CLAY_SET_QUERY_FILTERS.is(this.uniqueId, action)) {
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
        const include = omit<SubQuery<any>, any>(getInclude(this.query, path), 'filters');
        if (filters) {
          include.filters = filters;
        }
        newQuery = cloneDeep(this.query);
        setInclude(newQuery, include, path);
      } else {
        newQuery = omit<Query<T>, Query<T>>(this.query, 'filters');
        if (filters) {
          newQuery.filters = filters;
        }
      }

      if (newQuery.pagination) {
        newQuery.pagination = { skip: 0, take: newQuery.pagination.take };
      }

      return <this>new Querier(newQuery, this.count, this.uniqueId);
    }

    if (CLAY_SET_QUERY_PAGINATION.is(this.uniqueId, action)) {
      if (isEqual(this.query.pagination, action.payload)) {
        return this;
      }

      const newQuery = omit<Query<T>, Query<T>>(this.query, 'pagination');

      if (action.payload) {
        newQuery.pagination = action.payload;
      }

      return <this>new Querier(newQuery, this.count, this.uniqueId);
    }

    if (CLAY_SET_QUERY_ORDER.is(this.uniqueId, action)) {
      if (isEqual(this.query.order, action.payload)) {
        return this;
      }

      const newQuery = omit<Query<T>, Query<T>>(this.query, 'order');

      if (action.payload) {
        newQuery.order = action.payload;
      }

      if (newQuery.pagination) {
        newQuery.pagination = { skip: 0, take: newQuery.pagination.take };
      }

      return <this>new Querier(newQuery, this.count, this.uniqueId);
    }

    if (CLAY_SET_QUERY_EXTRA.is(this.uniqueId, action)) {
      if (!action.payload || isEqual(this.query.extra, action.payload.extra)) {
        return this;
      }

      const newQuery = { ...this.query, extra: action.payload.extra };

      if (action.payload.resetPagination && newQuery.pagination) {
        newQuery.pagination = { skip: 0, take: newQuery.pagination.take };
      }

      return <this>new Querier(newQuery, this.count, this.uniqueId);
    }

    if (CLAY_SET_QUERIEIR_COUNT.is(this.uniqueId, action)) {
      if (this.count === action.payload) {
        return this;
      }

      return <this>new Querier(this.query, action.payload, this.uniqueId);
    }

    if (CLAY_REFRESH.is(this.uniqueId, action)) {
      if (!action.payload || this.count === action.payload.count) {
        return this;
      }

      return <this>new Querier(this.query, action.payload.count, this.uniqueId);
    }

    return this;
  }

  public setAttributes(dispatch: Dispatch, attributes?: (keyof T)[]): void {
    dispatch(CLAY_SET_QUERY_ATTRIBUTES.create.unicast(this.uniqueId, attributes));
  }

  public resetFilters(dispatch: Dispatch, filters?: QueryFilters<T>, path?: string[]): void {
    dispatch(CLAY_SET_QUERY_FILTERS.create.unicast(this.uniqueId, { filters, path }));
  }

  public setFilter(dispatch: Dispatch, field: keyof T, filter: any, path?: string[]): void {
    const target = isPath(path) ? getInclude(this.query, path) : this.query;
    const filters = target ? { ...target.filters } : {};

    filters[field] = filter;

    dispatch(CLAY_SET_QUERY_FILTERS.create.unicast(this.uniqueId, { filters, path }));
  }

  public clearFilter(dispatch: Dispatch, field: keyof T, path?: string[]): void {
    const target = isPath(path) ? getInclude(this.query, path) : this.query;

    if (!target || !target.filters) {
      return;
    }

    const filters = omit(target.filters, field);

    dispatch(CLAY_SET_QUERY_FILTERS.create.unicast(this.uniqueId, { filters, path }));
  }

  public setPagination(dispatch: Dispatch, skip = 0, take = 0): void {
    dispatch(CLAY_SET_QUERY_PAGINATION.create.unicast(this.uniqueId, { skip, take }));
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

    dispatch(CLAY_SET_QUERY_ORDER.create.unicast(this.uniqueId, {
      field,
      ordering: targetOrdering,
      chain,
    }));
  }

  public setExtra(dispatch: Dispatch, extra?: any, resetPagination = false): void {
    dispatch(CLAY_SET_QUERY_EXTRA.create.unicast(this.uniqueId, { extra, resetPagination }));
  }

  public setCount(dispatch: Dispatch, count?: number): void {
    dispatch(CLAY_SET_QUERIEIR_COUNT.create.unicast(this.uniqueId, count));
  }
}
