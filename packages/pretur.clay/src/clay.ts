import { mapValues } from 'lodash';
import { ValidationError } from 'pretur.validation';
import { Reducible, Dispatch } from 'pretur.redux';
import { Value } from './Value';
import { Record } from './Record';
import { Set } from './Set';

let id = 0;
export function nextId() {
  id += 1;
  return id;
}

export type State = 'normal' | 'new' | 'removed';

export interface Clay extends Reducible {
  readonly uniqueId: number;
  readonly original: this;
  readonly state: State;
  readonly error: ValidationError;
  readonly modified: boolean;
  readonly valid: boolean;
  setError(dispatch: Dispatch, error: ValidationError): void;
  setState(dispatch: Dispatch, state: State): void;
}

export function from(value: any): Clay {
  if (value instanceof Value || value instanceof Record || value instanceof Set) {
    return value;
  }

  if (Array.isArray(value)) {
    return new Set(value.map(from));
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

export function toPlain(clay: Clay): any {
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
