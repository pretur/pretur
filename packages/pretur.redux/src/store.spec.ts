/// <reference types="mocha" />

import { expect } from 'chai';
import { createStore } from './store';

function delay(duration: number) {
  return new Promise<void>(resolve => setTimeout(resolve, duration));
}

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

  it('should properly create store with thunk support', async () => {
    const obj = {};
    const obj2 = {};
    const store = createStore<any>((s = obj, { type }) => type === 'T' ? obj2 : s);

    await store.dispatch(dispatch => delay(0).then(() => dispatch({ type: 'T' })));

    expect(store.getState()).to.be.equals(obj2);
  });

});
