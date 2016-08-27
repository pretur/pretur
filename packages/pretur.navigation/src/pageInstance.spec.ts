import { expect } from 'chai';
import { PageInstance } from '../src/pageInstance';

interface Prop {
  A: number;
}

interface State {
  B: number;
}

interface ReducerBuilderData {
  rank: number;
  fail: boolean;
}

const desciptor = {
  component: () => null!,
  path: 'admin',
  reducerBuilder: ({rank, fail}: ReducerBuilderData) => (s = { B: rank }, a: any): State => {
    if (!fail) {
      if (a.type === 'INC') {
        return { B: rank + (a.payload || 0) };
      }
      return s;
    }
    return undefined!;
  },
  titleKey: 'ADMIN_TITLE',
};

const instance = new PageInstance<Prop, State, ReducerBuilderData>(desciptor, {
  mutex: '1',
  path: 'admin',
  reducerBuilderData: <ReducerBuilderData>{ rank: 1 },
  titleData: { NAME: 'jim' },
});

describe('PageInstance', () => {

  it('should contain the correct mutex', () => {
    expect(instance.mutex).to.be.equals('1');
  });

  it('should contain the correct path', () => {
    expect(instance.path).to.be.equals('admin');
  });

  it('should contain the correct title', () => {
    expect(instance.title).to.be.deep.equal({ data: { NAME: 'jim' }, key: 'ADMIN_TITLE' });
  });

  it('should throw if the reducer is faulty', () => {
    expect(() => new PageInstance(desciptor, {
      mutex: '1',
      path: 'admin',
      reducerBuilderData: { fail: true, rank: 1 },
    })).to.throw();
  });

  it('should correctly calculate the initial state', () => {
    expect(instance.state.B).to.be.equals(1);
  });

  it('should return the same object if state is unchanged after reduction', () => {
    const page2 = instance.reduce({ type: 'BLAH' });
    expect(page2).to.be.equals(instance);
  });

  it('should return the another object if state is changed after reduction', () => {
    const page2 = instance.reduce({ payload: 2, type: 'INC' });
    expect(page2).not.to.be.equals(instance);
    expect(page2.state.B).to.be.equals(3);
  });

});
