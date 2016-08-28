import { Middleware, MiddlewareAPI } from 'redux';
import * as Bluebird from 'bluebird';
import { Action, Dispatch } from './action';

export const EMISSION_DISPATCH = '@@EMISSION_DISPATCH';
export const EMISSION_GET_STATE = '@@EMISSION_GET_STATE';

export interface EmissionSideEffect<T> {
  (dispatch: Dispatch, getState: () => any): T;
}

export function emit<T>(action: Action<any, any>, sideEffect: EmissionSideEffect<T>): Bluebird<T> {
  const dispatch = (<any>action)[EMISSION_DISPATCH];
  const getState = (<any>action)[EMISSION_GET_STATE];
  if (dispatch && getState) {
    return Bluebird.delay(0).then(() => sideEffect(dispatch, getState));
  } else {
    throw new Error('The emission middleware was not applied to the store. ' +
      'Or you have called emit in reducer initialization call.');
  }
}

export const emissionMiddleware: Middleware = ({dispatch, getState}: MiddlewareAPI<any>) =>
  (next: Dispatch) =>
    (action: any) => {
      (<any>action)[EMISSION_DISPATCH] = dispatch;
      (<any>action)[EMISSION_GET_STATE] = getState;
      return next(action);
    };
