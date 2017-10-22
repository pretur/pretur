/// <reference types="mocha" />

// tslint:disable:no-invalid-this
import { expect } from 'chai';
import { buildNode } from 'reducible-node';
import { PageInstance } from './pageInstance';
import { buildPage, Pages } from './pages';

interface Prop {
  A: number;
}

interface State {
  B: { value: number };
}

interface Params {
  rank: number;
}

let fail = false;

const component: any = () => (<any>{});
const node = buildNode(() => (fail ? undefined! : {
  B: {
    value: 1,

    reduce(action: any) {
      if (action.type === 'INC') {
        return { value: this.value + action.payload, reduce: this.reduce };
      }

      return this;
    },
  },
}));

const page = buildPage<Params, Prop, State>(component, node, { title: 'ADMIN_TITLE' });

new Pages({ admin: page });

const instance = new PageInstance(page, {
  mutex: '1',
  openedFrom: '3',
  parent: '2',
  path: 'admin',
  params: { rank: 1 },
});

describe('PageInstance', () => {

  it('should contain the correct mutex', () => {
    expect(instance.mutex).to.be.equals('1');
  });

  it('should contain the correct parent', () => {
    expect(instance.parent).to.be.equals('2');
  });

  it('should contain the correct path', () => {
    expect(instance.path).to.be.equals('admin');
  });

  it('should contain the correct openedFrom', () => {
    expect(instance.openedFrom).to.be.equals('3');
  });

  it('should contain the correct title', () => {
    expect(instance.title).to.be.equals('ADMIN_TITLE');
  });

  it('should contain the correct params', () => {
    expect(instance.params.rank).to.be.equals(1);
  });

  it('should throw if the reducer is faulty', () => {
    fail = true;
    expect(() => new PageInstance(page, { mutex: '1', path: 'admin' })).to.throw();
    fail = false;
  });

  it('should correctly calculate the initial state', () => {
    expect(instance.state.B.value).to.be.equals(1);
  });

  it('should return the same object if state is unchanged after reduction', () => {
    const page2 = instance.reduce({ type: 'BLAH' });
    expect(page2).to.be.equals(instance);
  });

  it('should return the another object if state is changed after reduction', () => {
    const page2 = instance.reduce({ payload: 2, type: 'INC' });
    expect(page2).not.to.be.equals(instance);
    expect(page2.state.B.value).to.be.equals(3);
  });

});
