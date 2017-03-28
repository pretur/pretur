import { createStore as reduxCreateStore, applyMiddleware } from 'redux';
import { Reducer } from './reducer';
import { Dispatch } from './action';
import { emissionMiddleware } from './emission';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';

export interface Store<TState> {
  dispatch: Dispatch;
  getState(): TState;
  subscribe(listener: (state: TState) => any): () => void;
  replaceReducer(nextReducer: Reducer<TState>): void;
}

export function createStore<TState>(topLevelReducer: Reducer<TState>, log = false): Store<TState> {
  if (log) {
    return reduxCreateStore(
      topLevelReducer,
      applyMiddleware(
        thunk,
        emissionMiddleware,
        createLogger(),
      ),
    );
  }
  return reduxCreateStore(
    topLevelReducer,
    applyMiddleware(
      thunk,
      emissionMiddleware,
    ),
  );
}
