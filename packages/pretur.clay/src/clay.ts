import { mapValues } from 'lodash';
import { SpecType, Model } from 'pretur.spec';
import { ValidationError } from 'pretur.validation';
import { Reducible, Dispatch } from 'reducible-node';
import { Value } from './Value';
import { Record } from './Record';
import { Set } from './Set';
import { Querier } from './Querier';
import { CLAY_REFRESH } from './actions';

export type State = 'normal' | 'new' | 'removed';

export type Clay<T extends Reducible<any>> = Reducible<T> & {
  readonly uniqueId: symbol;
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
