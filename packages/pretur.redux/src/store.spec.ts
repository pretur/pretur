/// <reference types="mocha" />

import { expect } from 'chai';
import * as Bluebird from 'bluebird';
import { EMISSION_DISPATCH, EMISSION_GET_STATE, emit } from './emission';
import { Store, createStore } from './store';

describe('createStore', () => {

  it('should properly create normal store', () => {
    const obj = {};
    const store = createStore<any>((s = obj) => s);
    expect(store.getState()).to.be.equals(obj);
  });

  it('should properly create logger store', () => {
    const obj = {};
    const store = createStore<any>((s = obj) => s, true);
    expect(store.getState()).to.be.equals(obj);
  });

  it('should properly create store with thunk support', () => {
    const obj = {};
    const obj2 = {};
    const store = createStore<any>((s = obj, {type}) => type === 'T' ? obj2 : s);
    return store.dispatch(
      (dispatch) => Bluebird.delay(0).then(() => dispatch({ type: 'T' })),
    ).then(() => expect(store.getState()).to.be.equals(obj2));
  });

  it('should properly create store with emission support', () => {
    const obj = {};
    let emitIsWorking = false;
    let promise: Bluebird<void> = <any>null;
    let store: Store<any>;
    const reducer = (state = obj, action: any) => {
      if (action.type === 'A') {
        expect(action[EMISSION_GET_STATE]).to.be.equals(store.getState);
        expect(action[EMISSION_DISPATCH]).to.be.a('function');
      }
      if (action.type === 'B') {
        promise = emit(action, (dispatch, getState) => {
          expect(getState()).to.be.equals(obj);
          dispatch({ type: 'A' });
          dispatch({ type: 'C' });
        });
      }
      if (action.type === 'C') {
        emitIsWorking = true;
      }
      return state;
    };

    store = createStore(reducer);
    store.dispatch({ type: 'A' });
    store.dispatch({ type: 'B' });
    return promise.then(() => {
      expect(emitIsWorking).to.be.true;
    });
  });

});
