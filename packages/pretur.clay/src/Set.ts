import { isEqual, findIndex } from 'lodash';
import { SpecType, Model } from 'pretur.spec';
import { Action, Dispatch } from 'pretur.redux';
import { ValidationError } from 'pretur.validation';
import { nextId, from, Clay, State } from './clay';
import { Record } from './Record';
import {
  CLAY_CLEAR,
  CLAY_REPLACE,
  CLAY_SET_ERROR,
  CLAY_SET_STATE,
  CLAY_ADD,
  CLAY_REMOVE,
  CLAY_REFRESH,
} from './actions';

function itemsEqual<T extends SpecType>(items1: Record<T>[], items2: Record<T>[]): boolean {
  if (items1.length !== items2.length) {
    return false;
  }

  if (items1.length === 0) {
    return true;
  }

  for (let i = 0; i < items1.length; i++) {
    if (items1[i] !== items2[i]) {
      return false;
    }
  }

  return true;
}

export class Set<T extends SpecType> implements Clay {
  public readonly uniqueId: number;
  public readonly original: this;
  public readonly state: State;
  public readonly items: Record<T>[];
  public readonly error: ValidationError;

  constructor(
    items?: Record<T>[] | Model<T>[],
    error?: ValidationError,
    state: State = 'normal',
    original?: Set<T>,
    uniqueId?: number,
  ) {
    if (items instanceof Set) {
      return items;
    }
    this.uniqueId = typeof uniqueId === 'number' ? uniqueId : nextId();
    this.original = original ? <this>original : this;
    this.state = state;
    this.items = Array.isArray(items) ? (<any>items).map(from) : [];
    this.error = error;
  }

  public get modified(): boolean {
    return this.original !== this;
  }

  public get valid(): boolean {
    for (const item of this.items) {
      if (!item.valid) {
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

    if (CLAY_REFRESH.is(this.uniqueId, action)) {
      return action.payload && action.payload.data;
    }

    if (CLAY_SET_ERROR.is(this.uniqueId, action)) {
      if (isEqual(this.error, action.payload)) {
        return this;
      }

      if (
        itemsEqual(this.original.items, this.items) &&
        this.original.state === this.state &&
        isEqual(this.original.error, action.payload)
      ) {
        return this.original;
      }

      return <this>new Set(
        this.items,
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
        itemsEqual(this.original.items, this.items) &&
        this.original.state === action.payload &&
        isEqual(this.original.error, this.error)
      ) {
        return this.original;
      }

      return <this>new Set(
        this.items,
        this.error,
        action.payload,
        this.original,
        this.uniqueId,
      );
    }

    if (CLAY_ADD.is(this.uniqueId, action)) {
      return <this>new Set(
        [...this.items, <any>from(action.payload)],
        this.error,
        this.state,
        this.original,
        this.uniqueId,
      );
    }

    if (CLAY_REMOVE.is(this.uniqueId, action)) {
      const index = findIndex(this.items, item => item.uniqueId === action.payload);
      if (index !== -1) {
        const newItems = [...this.items];
        newItems.splice(index, 1);

        if (
          itemsEqual(this.original.items, newItems) &&
          this.original.state === this.state &&
          isEqual(this.original.error, this.error)
        ) {
          return <this>this.original;
        }

        return <this>new Set(newItems, this.error, this.state, this.original, this.uniqueId);
      }
    }

    let original = true;
    let modified = false;
    const newItems: Record<T>[] = [];

    for (let i = 0; i < this.items.length; i++) {
      const newItem = this.items[i].reduce(action);

      if (this.items[i] !== newItem) {
        modified = true;
      }

      if (newItem !== this.original.items[i]) {
        original = false;
      }

      newItems.push(newItem);
    }

    if (modified) {
      if (
        original &&
        this.original.state === this.state &&
        isEqual(this.original.error, this.error)
      ) {
        return this.original;
      }

      return <this>new Set(newItems, this.error, this.state, this.original, this.uniqueId);
    }

    return this;
  }

  public clear(dispatch: Dispatch): void {
    dispatch(CLAY_CLEAR.create.unicast(this.uniqueId));
  }

  public replace(dispatch: Dispatch, by: this): void {
    dispatch(CLAY_REPLACE.create.unicast(this.uniqueId, by));
  }

  public setError(dispatch: Dispatch, error: ValidationError): void {
    dispatch(CLAY_SET_ERROR.create.unicast(this.uniqueId, error));
  }

  public setState(dispatch: Dispatch, state: State): void {
    dispatch(CLAY_SET_STATE.create.unicast(this.uniqueId, state));
  }

  public add(dispatch: Dispatch, item: Model<T> | Record<T>): void {
    dispatch(CLAY_ADD.create.unicast(this.uniqueId, from(item)));
  }
}
