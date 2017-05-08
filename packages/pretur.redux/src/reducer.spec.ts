/// <reference types="mocha" />

import { expect } from 'chai';
import { Action } from './action';
import { buildReducibleFactory } from './reducer';

class ReduceMe {
  public changing: boolean;
  public initialized: boolean;
  public payload: any;

  constructor(initialized = false, changing = false, payload?: any) {
    this.changing = changing;
    this.initialized = initialized;
    this.payload = payload;
  }

  public reduce(action: Action<any, any>): this {
    if (this.changing) {
      return <this>new ReduceMe(this.initialized, true);
    }

    if (action.type === 'INIT') {
      return <this>new ReduceMe(true, this.changing);
    }

    if (action.payload) {
      return <this>new ReduceMe(this.initialized, this.changing, action.payload);
    }

    return this;
  }
}

describe('buildReducibleFactory', () => {

  describe('buildReducer', () => {

    it('should create an autoReducer that properly initializes state', () => {
      const initialState = { a: new ReduceMe(false) };

      const reducer = buildReducibleFactory(() => initialState).buildReducer();
      const initial = reducer(undefined, { type: 'INIT' });

      expect(initialState.a.initialized).to.be.false;
      expect(initial.a.initialized).to.be.true;
    });

    it('should build a reducer that does not return a new object if input is unchanged', () => {
      const reducer = buildReducibleFactory(() => ({
        a: new ReduceMe(),
        b: new ReduceMe(),
        c: new ReduceMe(),
      })).buildReducer();

      const initial = reducer(undefined, { type: 'INIT' });
      const second = reducer(initial, { type: 'OTHER' });
      const third = reducer(initial, { type: 'SOME_OTHER' });

      expect(initial).to.be.equals(second);
      expect(second).to.be.equals(third);
    });

    it('should create an autoReducer that should properly handle action payloads', () => {
      const reducer = buildReducibleFactory(() => ({ a: new ReduceMe() })).buildReducer();

      const initial = reducer(undefined, { type: 'INIT' });
      const second = reducer(initial, { payload: true, type: 'OTHER' });

      expect(initial.a.payload).to.be.undefined;
      expect(second.a.payload).to.be.true;
    });

  });

  it('should build reducibleFactory that properly initializes state', () => {
    const factory = buildReducibleFactory(() => ({
      bar: new ReduceMe(false, false, 'hello'),
      foo: new ReduceMe(false),
    }));

    const reducer = factory();

    expect(reducer.bar.payload).to.be.equals('hello');
    expect(reducer.foo.payload).to.be.equals(undefined);

    const initialized = reducer.reduce({ type: 'INIT' });

    expect(initialized.bar.initialized).to.be.true;
    expect(initialized.foo.initialized).to.be.true;

    const reduced = initialized.reduce({ payload: 'world', type: ' ' });

    expect(reduced.bar.payload).to.be.equals('world');
    expect(reduced.foo.payload).to.be.equals('world');
  });

  it('should build a reducibleFactory that can act as reducer', () => {
    const factory = buildReducibleFactory((str: string) => ({
      bar: new ReduceMe(false, false, str),
      foo: new ReduceMe(false),
    }));

    const reducer = buildReducibleFactory(() => ({ bar: factory('hello') })).buildReducer();

    const initialized = reducer(undefined, { type: 'INIT' });

    expect(initialized.bar.foo.initialized).to.be.true;

    const reduced = reducer(initialized, { payload: 'YOLO', type: 'Blah!' });

    expect(reduced.bar.foo.payload).to.be.equals('YOLO');
  });

});
