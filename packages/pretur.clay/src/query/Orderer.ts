import { isEqual } from 'lodash';
import { Action, Dispatch } from 'pretur.redux';
import { QueryOrder, Ordering } from 'pretur.sync';
import UniqueReducible from '../UniqueReducible';
import { CLAY_QUERY_SET_ORDER } from './actions';

export default class Orderer extends UniqueReducible {
  private queryOrderField: string;
  private queryOrderOrdering: Ordering = 'NONE';
  private queryOrderChain: string[] | undefined;

  constructor(order?: QueryOrder) {
    super();
    if (order) {
      this.queryOrderField = order.field;
      this.queryOrderOrdering = order.ordering;
      this.queryOrderChain = order.chain || undefined;
    }
  }

  public get field(): string {
    return this.queryOrderField;
  }

  public get ordering(): Ordering {
    return this.queryOrderOrdering;
  }

  public get chain(): string[] | undefined {
    return this.queryOrderChain;
  }

  public get plain(): QueryOrder | undefined {
    if (!this.queryOrderField) {
      return;
    }
    const order = <QueryOrder>{
      field: this.queryOrderField,
      ordering: this.queryOrderOrdering,
    };
    if (Array.isArray(this.queryOrderChain)) {
      order.chain = this.queryOrderChain.slice();
    }
    return order;
  }

  public reduce(action: Action<any, any>): this {
    if (CLAY_QUERY_SET_ORDER.is(this.uniqueId, action) && action.payload) {
      if (
        this.queryOrderField === action.payload.field &&
        this.queryOrderOrdering === action.payload.ordering &&
        isEqual(this.queryOrderChain, action.payload.chain)
      ) {
        return this;
      }

      const clone = this.clone();
      clone.queryOrderField = action.payload.field;
      clone.queryOrderOrdering = action.payload.ordering;
      clone.queryOrderChain = action.payload.chain || undefined;
      return clone;
    }

    return this;
  }

  public set(dispatch: Dispatch, field: string, ordering?: Ordering, chain?: string[]): void {
    if (typeof ordering !== 'string') {
      if (this.field !== field) {
        ordering = 'ASC';
      } else {
        switch (this.ordering) {
          case 'NONE':
            ordering = 'ASC';
            break;
          case 'ASC':
            ordering = 'DESC';
            break;
          default:
            ordering = 'NONE';
            break;
        }
      }
    }
    dispatch(CLAY_QUERY_SET_ORDER.create.unicast(this.uniqueId, { field, ordering, chain }));
  }

  protected cloneOverride(clone: this): void {
    super.cloneOverride(clone);
    clone.queryOrderField = this.queryOrderField;
    clone.queryOrderOrdering = this.queryOrderOrdering;
    clone.queryOrderChain = this.queryOrderChain;
  }

  protected createInstance(): this {
    return <this>new Orderer();
  }
}
