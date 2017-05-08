import { createStore as reduxCreateStore, applyMiddleware } from 'redux';
import { Reducer } from './reducer';
import { Dispatch } from './action';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';

export interface Store<TState> {
  dispatch: Dispatch;
  getState(): TState;
  subscribe(listener: () => any): () => void;
  replaceReducer(nextReducer: Reducer<TState>): void;
}

export function createStore<TState>(topLevelReducer: Reducer<TState>, log = false): Store<TState> {
  if (log) {
    return reduxCreateStore(
      topLevelReducer,
      applyMiddleware(thunk, createLogger()),
    );
  }
  return reduxCreateStore(
    topLevelReducer,
    applyMiddleware(thunk),
  );
}
