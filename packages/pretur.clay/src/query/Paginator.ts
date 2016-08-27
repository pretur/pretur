import { Action, Dispatch } from 'pretur.redux';
import { QueryPagination } from 'pretur.sync';
import { CLAY_QUERY_SET_PAGINATION } from './actions';
import UniqueReducible from '../UniqueReducible';

export default class Paginator extends UniqueReducible {
  private skipItems?: number;
  private takeItems?: number;

  constructor(pagination?: QueryPagination) {
    super();
    if (pagination) {
      this.skipItems = pagination.skip;
      this.takeItems = pagination.take;
    }
  }

  public get skip(): number | null {
    return this.skipItems || null;
  }

  public get take(): number | null {
    return this.takeItems || null;
  }

  public get plain(): QueryPagination | null {
    if (typeof this.skipItems !== 'number' && typeof this.takeItems !== 'number') {
      return null;
    }
    const pagination = <QueryPagination>{};
    if (typeof this.skipItems === 'number') {
      pagination.skip = this.skipItems;
    }
    if (typeof this.takeItems === 'number') {
      pagination.take = this.takeItems;
    }
    return pagination;
  }

  public reduce(action: Action<any, any>): this {
    if (CLAY_QUERY_SET_PAGINATION.is(this.uniqueId, action)) {
      const clone = this.clone();
      clone.skipItems = action.payload!.skip;
      clone.takeItems = action.payload!.take;
      return clone;
    }

    return this;
  }

  public set(dispatch: Dispatch, skip?: number, take?: number): void {
    dispatch(CLAY_QUERY_SET_PAGINATION.create.unicast(this.uniqueId, { skip, take }));
  }

  protected cloneOverride(clone: this): void {
    super.cloneOverride(clone);
    clone.skipItems = this.skipItems;
    clone.takeItems = this.takeItems;
  }

  protected createInstance(): this {
    return <this>new Paginator();
  }
}
