import { Action, Dispatch } from 'pretur.redux';
import { QueryFilters } from 'pretur.sync';
import { CLAY_QUERY_SET_FILTERS } from './actions';
import UniqueReducible from '../UniqueReducible';

export default class Filterer extends UniqueReducible {
  private queryFilters: QueryFilters;

  constructor(filters?: QueryFilters) {
    super();
    if (filters) {
      this.queryFilters = {};
      Object.keys(filters).forEach(key => {
        this.queryFilters[key] = filters[key];
      });
    }
  }

  public get filters(): QueryFilters {
    return this.queryFilters || {};
  }

  public get(field: string): any {
    if (!this.queryFilters) {
      return;
    }
    return this.queryFilters[field];
  }

  public get plain(): QueryFilters | null {
    if (!this.queryFilters) {
      return null;
    }

    const keys = Object.keys(this.queryFilters);

    if (keys.length === 0) {
      return null;
    }

    const filters: QueryFilters = {};

    keys.forEach(key => {
      filters[key] = this.queryFilters[key];
    });

    return filters;
  }

  public reduce(action: Action<any, any>): this {
    if (CLAY_QUERY_SET_FILTERS.is(this.uniqueId, action)) {
      const clone = this.clone();
      clone.queryFilters = <QueryFilters>action.payload;
      return clone;
    }

    return this;
  }

  public setAll(dispatch: Dispatch, filters: QueryFilters): void {
    const newFilters = <QueryFilters>{};

    if (this.queryFilters) {
      Object.keys(this.queryFilters).forEach(key => {
        newFilters[key] = this.queryFilters[key];
      });
    }

    dispatch(CLAY_QUERY_SET_FILTERS.create.unicast(this.uniqueId, filters));
  }

  public setFilter(dispatch: Dispatch, field: string, filter: any): void {
    const newFilters = <QueryFilters>{};

    if (this.queryFilters) {
      Object.keys(this.queryFilters).forEach(key => {
        newFilters[key] = this.queryFilters[key];
      });
    }

    newFilters[field] = filter;

    dispatch(CLAY_QUERY_SET_FILTERS.create.unicast(this.uniqueId, newFilters));
  }

  public clearFilter(dispatch: Dispatch, field: string): void {
    const newFilters = <QueryFilters>{};

    if (this.queryFilters) {
      Object.keys(this.queryFilters).forEach(key => {
        newFilters[key] = this.queryFilters[key];
      });
    }

    delete newFilters[field];

    dispatch(CLAY_QUERY_SET_FILTERS.create.unicast(this.uniqueId, newFilters));
  }

  protected cloneOverride(clone: this): void {
    super.cloneOverride(clone);
    clone.queryFilters = this.queryFilters;
  }

  protected createInstance(): this {
    return <this>new Filterer();
  }
}
