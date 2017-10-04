import { xor, isEqual, mapValues } from 'lodash';
import { SpecType, Model } from 'pretur.spec';
import { ValidationError } from 'pretur.validation';
import { Action, Dispatch } from 'pretur.redux';
import { nextId, from, Clay, State } from './clay';
import { Fields } from './fields';
import {
  CLAY_CLEAR,
  CLAY_REPLACE,
  CLAY_SET_FIELD,
  CLAY_SET_ERROR,
  CLAY_SET_STATE,
  CLAY_REMOVE,
} from './actions';

function FieldsEqual<T extends SpecType>(fields1: Fields<T>, fields2: Fields<T>): boolean {
  const fields1Keys = Object.keys(fields1);
  const fields2Keys = Object.keys(fields2);
  if (fields1Keys.length !== fields2Keys.length) {
    return false;
  }

  if (fields1Keys.length === 0) {
    return true;
  }

  if (xor(fields1Keys, fields2Keys).length !== 0) {
    return false;
  }

  for (const key of fields1Keys) {
    if (fields1[key] !== fields2[key]) {
      return false;
    }
  }
  return true;
}

export class Record<T extends SpecType> implements Clay<Record<T>> {
  public readonly uniqueId: number;
  public readonly original: this;
  public readonly state: State;
  public readonly fields: Fields<T>;
  public readonly error: ValidationError;

  constructor(
    fields?: Fields<T> | Model<T>,
    error?: ValidationError,
    state: State = 'normal',
    original?: Record<T>,
    uniqueId?: number,
  ) {
    if (fields instanceof Record) {
      return fields;
    }
    this.uniqueId = typeof uniqueId === 'number' ? uniqueId : nextId();
    this.original = original ? <this>original : this;
    this.state = state;
    this.fields = fields ? <any>mapValues(fields, from) : <Fields<T>>{};
    this.error = error;
  }

  public get modified(): boolean {
    return this.original !== this;
  }

  public get valid(): boolean {
    for (const key of Object.keys(this.fields)) {
      if (!this.fields[key].valid) {
        return false;
      }
    }

    return !this.error;
  }

  public reduce(action: Action<any, any>): this {
    if (CLAY_CLEAR.is(this.uniqueId, action)) {
      return this.original;
    }

    if (CLAY_REPLACE.is(this.uniqueId, action)) {
      return action.payload;
    }

    if (CLAY_SET_FIELD.is(this.uniqueId, action)) {
      if (!action.payload) {
        return this;
      }

      if (this.fields[action.payload.field] === action.payload.value) {
        return this;
      }

      const fieldsWithNew = <Fields<T>>{
        ...(<any>this.fields),
        [action.payload.field]: action.payload.value,
      };

      if (
        FieldsEqual(this.original.fields, fieldsWithNew) &&
        this.original.state === this.state &&
        isEqual(this.original.error, this.error)
      ) {
        return this.original;
      }

      return <this>new Record(fieldsWithNew, this.error, this.state, this.original, this.uniqueId);
    }

    if (CLAY_SET_ERROR.is(this.uniqueId, action)) {
      if (isEqual(this.error, action.payload)) {
        return this;
      }

      if (
        FieldsEqual(this.original.fields, this.fields) &&
        this.original.state === this.state &&
        isEqual(this.original.error, action.payload)
      ) {
        return this.original;
      }

      return <this>new Record(
        this.fields,
        action.payload,
        this.state,
        this.original,
        this.uniqueId,
      );
    }

    if (CLAY_SET_STATE.is(this.uniqueId, action)) {
      if (this.state === action.payload) {
        return this;
      }

      if (
        FieldsEqual(this.original.fields, this.fields) &&
        this.original.state === action.payload &&
        isEqual(this.original.error, this.error)
      ) {
        return this.original;
      }

      if (
        typeof action.meta === 'boolean' &&
        action.meta === true &&
        action.payload === 'removed'
      ) {
        return <this>new Record(
          this.original.fields,
          this.original.error,
          action.payload,
          this.original,
          this.uniqueId,
        );
      }

      return <this>new Record(
        this.fields,
        this.error,
        action.payload,
        this.original,
        this.uniqueId,
      );
    }

    const fieldKeys = Object.keys(this.fields);
    const newFields = <Fields<T>>{};
    let modified = false;
    let original = true;

    for (const key of fieldKeys) {
      newFields[key] = this.fields[key].reduce(action);

      if (newFields[key] !== this.fields[key]) {
        modified = true;
      }

      if (newFields[key] !== this.original.fields[key]) {
        original = false;
      }
    }

    if (modified) {
      if (
        original &&
        this.original.state === this.state &&
        isEqual(this.original.error, this.error)
      ) {
        return this.original;
      }

      return <this>new Record(
        newFields,
        this.error,
        this.state,
        this.original,
        this.uniqueId,
      );
    }

    return this;
  }

  public clear(dispatch: Dispatch): void {
    dispatch(CLAY_CLEAR.create.unicast(this.uniqueId));
  }

  public replace(dispatch: Dispatch, by: this): void {
    dispatch(CLAY_REPLACE.create.unicast(this.uniqueId, by));
  }

  public setField<K extends keyof Fields<T>>(dispatch: Dispatch, field: K, value: Fields<T>[K]) {
    dispatch(CLAY_SET_FIELD.create.unicast(this.uniqueId, { field, value: from(value) }));
  }

  public setError(dispatch: Dispatch, error: ValidationError): void {
    dispatch(CLAY_SET_ERROR.create.unicast(this.uniqueId, error));
  }

  public setState(dispatch: Dispatch, state: State): void {
    dispatch(CLAY_SET_STATE.create.unicast(this.uniqueId, state));
  }

  public remove(dispatch: Dispatch, reset = true): void {
    if (this.state === 'normal') {
      dispatch(CLAY_SET_STATE.create.unicast(this.uniqueId, 'removed', <any>reset));
    }

    if (this.state === 'new') {
      dispatch(CLAY_REMOVE.create.broadcast(this.uniqueId));
    }
  }

  public discard(dispatch: Dispatch): void {
    dispatch(CLAY_REMOVE.create.broadcast(this.uniqueId));
  }

  public unremove(dispatch: Dispatch): void {
    if (this.state === 'removed') {
      dispatch(CLAY_SET_STATE.create.unicast(this.uniqueId, 'normal'));
    }
  }
}
