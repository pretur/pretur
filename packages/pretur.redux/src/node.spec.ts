/// <reference types="mocha" />

import { expect } from 'chai';
import { Action } from './action';
import { buildNode } from './node';

class ReduceMe {
  public changing: boolean;
  public initialized: boolean;
  public payload?: string;

  constructor(initialized = false, changing = false, payload?: string) {
    this.changing = changing;
    this.initialized = initialized;
    this.payload = payload;
  }

  public reduce(action: Action<string>): this {
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

describe('node', () => {

  it('should build node that properly initializes state', () => {
    const node = buildNode(() => ({
      bar: new ReduceMe(false, false, 'hello'),
      foo: new ReduceMe(false),
    }));

    const reducer = node();

    expect(reducer.bar.payload).to.be.equals('hello');
    expect(reducer.foo.payload).to.be.equals(undefined);

    const initialized = reducer.reduce({ type: 'INIT' });

    expect(initialized.bar.initialized).to.be.true;
    expect(initialized.foo.initialized).to.be.true;

    const reduced = initialized.reduce({ payload: 'world', type: ' ' });

    expect(reduced.bar.payload).to.be.equals('world');
    expect(reduced.foo.payload).to.be.equals('world');
  });

});
