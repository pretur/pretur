import { mapValues } from 'lodash';
import { SpecType, Model } from 'pretur.spec';
import { ValidationError } from 'pretur.validation';
import { Reducible, Dispatch } from 'pretur.redux';
import { Value } from './Value';
import { Record } from './Record';
import { Set } from './Set';
import { Querier } from './Querier';
import { CLAY_REFRESH } from './actions';

let id = 0;
export function nextId() {
  id += 1;
  return id;
}

export type State = 'normal' | 'new' | 'removed';

export type Clay<T extends Reducible<any>> = Reducible<T> & {
  readonly uniqueId: number;
  readonly original: Clay<T>;
  readonly state: State;
  readonly error: ValidationError;
  readonly modified: boolean;
  readonly valid: boolean;
  setError(dispatch: Dispatch, error: ValidationError): void;
  setState(dispatch: Dispatch, state: State): void;
};

export function refresh<T extends SpecType>(
  dispatch: Dispatch,
  set: Set<T>,
  querier: Querier<T>,
  payload: { data: Set<T>; count: number },
): void {
  dispatch(CLAY_REFRESH.create.multicast([set.uniqueId, querier.uniqueId], payload));
}

export function from<T extends SpecType>(list: Model<T>[] | Set<T>): Set<T>;
export function from<T extends SpecType>(model: Model<T> | Record<T>): Record<T>;
export function from<T>(value: T | Value<T>): Value<T>;
export function from(value: any): Clay<any> {
  if (value instanceof Value || value instanceof Record || value instanceof Set) {
    return value;
  }

  if (Array.isArray(value)) {
    return new Set(<any>value.map(from));
  }

  if (typeof value === 'object' && value) {
    const fields: any = {};
    for (const key of Object.keys(value)) {
      fields[key] = from(value[key]);
    }
    return new Record(fields);
  }

  return new Value(value);
}

export function toPlain<T extends SpecType>(set: Set<T>): Model<T>[];
export function toPlain<T extends SpecType>(record: Record<T>): Model<T>;
export function toPlain<T>(value: Value<T>): T;
export function toPlain(clay: Clay<any>): any {
  if (clay instanceof Value) {
    return clay.value;
  }

  if (clay instanceof Record) {
    return mapValues(clay.fields, toPlain);
  }

  if (clay instanceof Set) {
    return clay.items.map(toPlain);
  }
}
