import { createStore as reduxCreateStore, applyMiddleware } from 'redux';
import { Reducer } from './reducer';
import { Dispatch } from './action';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';

export interface Store<T> {
  dispatch: Dispatch;
  getState(): T;
  subscribe(listener: () => any): () => void;
  replaceReducer(nextReducer: Reducer<T>): void;
}

export function createStore<T>(reducer: Reducer<T>, log = false): Store<T | undefined> {
  if (log) {
    return reduxCreateStore(
      reducer,
      applyMiddleware(thunk, createLogger()),
    );
  }
  return reduxCreateStore(
    reducer,
    applyMiddleware(thunk),
  );
}
