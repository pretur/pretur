import { isEqual } from 'lodash';
import { ValidationError } from 'pretur.validation';
import { Action, Dispatch } from 'pretur.redux';
import { nextId, Clay, State } from './clay';
import {
  CLAY_CLEAR,
  CLAY_REPLACE,
  CLAY_SET_VALUE,
  CLAY_SET_ERROR,
  CLAY_SET_STATE,
} from './actions';

export class Value<T> implements Clay {
  public readonly uniqueId: number;
  public readonly original: this;
  public readonly state: State;
  public readonly value: T;
  public readonly error: ValidationError;

  constructor(
    value: T,
    error?: ValidationError,
    state: State = 'normal',
    original?: Value<T>,
    uniqueId?: number,
  ) {
    if (value instanceof Value) {
      return value;
    }
    this.uniqueId = typeof uniqueId === 'number' ? uniqueId : nextId();
    this.original = original ? <this>original : this;
    this.state = state;
    this.value = value;
    this.error = error;
  }

  public get modified(): boolean {
    return this.original !== this;
  }

  public get valid(): boolean {
    return !this.error;
  }

  public reduce(action: Action<any, any>): this {
    if (CLAY_CLEAR.is(this.uniqueId, action)) {
      return <this>this.original;
    }

    if (CLAY_REPLACE.is(this.uniqueId, action)) {
      return action.payload;
    }

    if (CLAY_SET_VALUE.is(this.uniqueId, action)) {
      if (!action.payload || this.value === action.payload.value) {
        return this;
      }

      const error = action.payload.resetError ? undefined : this.error;

      if (
        isEqual(this.original.value, action.payload.value) &&
        this.original.state === this.state &&
        isEqual(this.original.error, error)
      ) {
        return <this>this.original;
      }

      return <this>new Value(action.payload.value, error, this.state, this.original, this.uniqueId);
    }

    if (CLAY_SET_ERROR.is(this.uniqueId, action)) {
      if (isEqual(this.error, action.payload)) {
        return this;
      }

      if (
        isEqual(this.original.value, this.value) &&
        this.original.state === this.state &&
        isEqual(this.original.error, action.payload)
      ) {
        return <this>this.original;
      }

      return <this>new Value(this.value, action.payload, this.state, this.original, this.uniqueId);
    }

    if (CLAY_SET_STATE.is(this.uniqueId, action)) {
      if (this.state === action.payload) {
        return this;
      }

      if (
        isEqual(this.original.value, this.value) &&
        this.original.state === action.payload &&
        isEqual(this.original.error, action.payload)
      ) {
        return <this>this.original;
      }

      return <this>new Value(this.value, this.error, action.payload, this.original, this.uniqueId);
    }

    return this;
  }

  public clear(dispatch: Dispatch): void {
    dispatch(CLAY_CLEAR.create.unicast(this.uniqueId));
  }

  public replace(dispatch: Dispatch, by: this): void {
    dispatch(CLAY_REPLACE.create.unicast(this.uniqueId, by));
  }

  public setValue(dispatch: Dispatch, value: T, resetError = true): void {
    dispatch(CLAY_SET_VALUE.create.unicast(this.uniqueId, { value, resetError }));
  }

  public setError(dispatch: Dispatch, error: ValidationError): void {
    dispatch(CLAY_SET_ERROR.create.unicast(this.uniqueId, error));
  }

  public setState(dispatch: Dispatch, state: State): void {
    dispatch(CLAY_SET_STATE.create.unicast(this.uniqueId, state));
  }
}
