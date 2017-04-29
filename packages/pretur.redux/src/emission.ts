import { Middleware, MiddlewareAPI } from 'redux';
import { Action, Dispatch } from './action';

export const EMISSION_DISPATCH = '@@EMISSION_DISPATCH';
export const EMISSION_GET_STATE = '@@EMISSION_GET_STATE';

export interface EmissionSideEffect<T> {
  (dispatch: Dispatch, getState: () => any): T;
}

function delay(duration: number) {
  return new Promise<void>(resolve => setTimeout(resolve, duration));
}

export async function emit<T>(action: Action<any, any>, sideEffect: EmissionSideEffect<T>) {
  const dispatch = (<any>action)[EMISSION_DISPATCH];
  const getState = (<any>action)[EMISSION_GET_STATE];
  if (dispatch && getState) {
    await delay(0);

    return sideEffect(dispatch, getState);
  } else {
    throw new Error('The emission middleware was not applied to the store. ' +
      'Or you have called emit in reducer initialization call.');
  }
}

export const emissionMiddleware: Middleware = ({ dispatch, getState }: MiddlewareAPI<any>) =>
  (next: Dispatch) =>
    (action: any) => {
      (<any>action)[EMISSION_DISPATCH] = dispatch;
      (<any>action)[EMISSION_GET_STATE] = getState;
      return next(action);
    };
