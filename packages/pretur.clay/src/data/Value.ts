import { isEqual } from 'lodash';
import { ValidationError } from 'pretur.validation';
import { Reducible, Action, Dispatch } from 'pretur.redux';
import nextId from '../nextId';
import {
  CLAY_DATA_CLEAR,
  CLAY_DATA_SET_VALUE,
  CLAY_DATA_SET_ERROR,
} from './actions';

export default class Value<T> implements Reducible {
  public readonly uniqueId: number;
  public readonly original: Value<T>;
  public readonly value: T;
  public readonly error: ValidationError;

  constructor(
    value: T,
    error?: ValidationError,
    original?: Value<T>,
    uniqueId?: number,
  ) {
    this.uniqueId = typeof uniqueId === 'number' ? uniqueId : nextId();
    this.original = original ? original : this;
    this.value = value;
    this.error = error;
  }

  public get modified(): boolean {
    if (!this.original) {
      return false;
    }
    return this.original !== this;
  }

  public reduce(action: Action<any, any>): this {
    if (CLAY_DATA_CLEAR.is(this.uniqueId, action)) {
      if (!this.original) {
        return this;
      }

      return <this>this.original;
    }

    if (CLAY_DATA_SET_VALUE.is(this.uniqueId, action)) {
      if (isEqual(this.value, action.payload)) {
        return this;
      }

      if (this.original && isEqual(this.original.value, action.payload)) {
        return <this>this.original;
      }

      return <this>new Value(action.payload, this.error, this, this.uniqueId);
    }

    if (CLAY_DATA_SET_ERROR.is(this.uniqueId, action)) {
      return <this>new Value(this.value, action.payload, this, this.uniqueId);
    }

    return this;
  }

  public clear(dispatch: Dispatch): void {
    dispatch(CLAY_DATA_CLEAR.create.unicast(this.uniqueId));
  }

  public set(dispatch: Dispatch, value: T): void {
    dispatch(CLAY_DATA_SET_VALUE.create.unicast(this.uniqueId, value));
  }

  public setError(dispatch: Dispatch, error: ValidationError): void {
    dispatch(CLAY_DATA_SET_ERROR.create.unicast(this.uniqueId, error));
  }
}
