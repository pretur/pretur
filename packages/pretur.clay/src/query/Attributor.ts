import { isEqual } from 'lodash';
import { Action, Dispatch } from 'pretur.redux';
import { CLAY_QUERY_SET_ATTRIBUTES } from './actions';
import UniqueReducible from '../UniqueReducible';

export default class Attributor extends UniqueReducible {
  private queryAttributes: string[];

  constructor(attributes?: string[]) {
    super();
    if (Array.isArray(attributes)) {
      this.queryAttributes = attributes.slice();
    } else {
      this.queryAttributes = [];
    }
  }

  public get attributes(): string[] {
    return this.queryAttributes;
  }

  public get plain(): string[] | undefined {
    if (!Array.isArray(this.queryAttributes) || this.queryAttributes.length === 0) {
      return;
    }
    return this.queryAttributes.slice();
  }

  public reduce(action: Action<any, any>): this {
    if (CLAY_QUERY_SET_ATTRIBUTES.is(this.uniqueId, action) && action.payload) {
      if (isEqual(this.queryAttributes, action.payload)) {
        return this;
      }
      const clone = this.clone();
      clone.queryAttributes = action.payload;
      return clone;
    }

    return this;
  }

  public set(dispatch: Dispatch, attributes?: string[]): void {
    if (Array.isArray(attributes)) {
      dispatch(CLAY_QUERY_SET_ATTRIBUTES.create.unicast(this.uniqueId, attributes.slice()));
    } else {
      dispatch(CLAY_QUERY_SET_ATTRIBUTES.create.unicast(this.uniqueId, []));
    }
  }

  protected cloneOverride(clone: this): void {
    super.cloneOverride(clone);
    clone.queryAttributes = this.queryAttributes;
  }

  protected createInstance(): this {
    return <this>new Attributor();
  }
}
