/// <reference types="mocha" />

import { expect } from 'chai';
import { Action } from './action';
import {
  createAutoReducer,
  createMutatorReducer,
  createReducibleReducer,
  createConstantReducer,
  Reducible,
} from './reducer';

class ReduceMe implements Reducible {
  public changing: boolean;
  public initialized: boolean;
  public payload: any;

  constructor(initialized = false, changing = false, payload = null) {
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

describe('createAutoReducer', () => {

  it('should create an autoReducer that properly initializes state', () => {
    const initialState: { a: ReduceMe, [prop: string]: Reducible } = {
      a: new ReduceMe(false),
    };

    const reducer = createAutoReducer(initialState);
    const initial = reducer(undefined, { type: 'INIT' });

    expect(initialState.a.initialized).to.be.false;
    expect(initial.a.initialized).to.be.true;
  });

  it('should create an autoReducer that does not return a new object if input is unchanged', () => {
    const reducer = createAutoReducer({
      a: new ReduceMe(),
      b: new ReduceMe(),
      c: new ReduceMe(),
    });

    const initial = reducer(undefined, { type: 'INIT' });
    const second = reducer(initial, { type: 'OTHER' });
    const third = reducer(initial, { type: 'SOME_OTHER' });

    expect(initial).to.be.equals(second);
    expect(second).to.be.equals(third);
  });

  it('should create an autoReducer that should properly handle action payloads', () => {
    const reducer = createAutoReducer({
      a: new ReduceMe(),
    });

    const initial = reducer(undefined, { type: 'INIT' });
    const second = reducer(initial, { payload: true, type: 'OTHER' });
    expect(initial.a.payload).to.be.null;
    expect(second.a.payload).to.be.true;
  });

});

interface States {
  a: string;
  b: number;
  c?: any;
}

type Props = 'a' | 'b' | 'c';

describe('createMutatorReducer', () => {

  it('should create a mutatorReducer that properly initializes state', () => {
    const initialState = { a: ' ', b: 1 };

    const reducer = createMutatorReducer<States, Props>(initialState, () => null);

    const state = reducer(undefined, { type: 'INIT' });
    expect(state).to.be.equals(initialState);
  });

  it('should create a mutatorReducer that returns the same object if unmodified', () => {
    const initialState = { a: ' ', b: 1 };

    const reducer = createMutatorReducer<States, Props>(initialState, (_, __, set) => {
      set('a', ' ');
      set('b', 1);
    });

    const first = reducer(undefined, { type: 'INIT' });
    const second = reducer(first, { type: 'OTHER' });
    expect(first).to.be.equals(initialState);
    expect(second).to.be.equals(initialState);
  });

  it('should create a mutatorReducer that correctly sets the props', () => {
    const initialState = { a: ' ', b: 1 };

    const reducer = createMutatorReducer<States, Props>(initialState, (_, __, set) => {
      set('a', 'foo');
      set('b', 2);
    });

    const first = reducer(undefined, { type: 'INIT' });
    const second = reducer(first, { type: 'OTHER' });
    expect(first).not.to.be.equals(initialState);
    expect(second).to.be.equals(first);
    expect(second.a).to.be.equals('foo');
    expect(second.b).to.be.equals(2);
  });

  it('should create a mutatorReducer that correctly sets the props when not defined', () => {
    const initialState = { a: ' ', b: 1 };

    const reducer = createMutatorReducer<States, Props>(initialState, (_, __, set) => {
      set('c', true);
    });

    const state = reducer(undefined, { type: 'INIT' });
    expect(state).not.to.be.equals(initialState);
    expect(state.c).to.be.true;
  });

  it('should create a mutatorReducer that correctly unsets the props', () => {
    const initialState = { a: ' ', b: 1 };

    const reducer = createMutatorReducer<States, Props>(initialState, (_, __, set, unset) => {
      set('a', 1);
      unset('a');
    });

    const state = reducer(undefined, { type: 'INIT' });
    expect(state).not.to.be.equals(initialState);
    expect(state.b).to.be.equals(1);
    expect(state.a).to.be.undefined;
  });

  it('should create a mutatorReducer that correctly resets a prop after it was unset', () => {
    const initialState = { a: ' ', b: 1 };

    const reducer = createMutatorReducer<States, Props>(initialState, (_, __, set, unset) => {
      unset('a');
      set('a', 'foo');
    });

    const state = reducer(undefined, { type: 'INIT' });
    expect(state).not.to.be.equals(initialState);
    expect(state.b).to.be.equals(1);
    expect(state.a).to.be.equals('foo');
  });

  it('should create a mutatorReducer that correctly resets the state', () => {
    const initialState = { a: ' ', b: 1 };

    const reducer = createMutatorReducer<States, Props>(
      initialState,
      (_, action, set, __, reset) => {
        set('a', 'foo');
        if (action.type === 'RESET') {
          reset();
        }
      }
    );

    const first = reducer(undefined, { type: 'INIT' });
    const second = reducer(first, { type: 'RESET' });
    expect(first).not.to.be.equals(initialState);
    expect(second).not.to.be.equals(first);
    expect(second).to.be.equals(initialState);
  });

  it('should create a mutatorReducer that resets the state to the specified object', () => {
    const initialState = { a: ' ', b: 1 };
    const otherState = { a: 'bar', b: 2 };

    const reducer = createMutatorReducer<States, Props>(
      initialState,
      (_, action, set, __, reset) => {
        set('a', 'foo');
        if (action.type === 'RESET') {
          reset(otherState);
        }
      }
    );

    const first = reducer(undefined, { type: 'INIT' });
    const second = reducer(first, { type: 'RESET' });
    expect(second).not.to.be.equals(first);
    expect(second).to.be.equals(otherState);
    expect(second.a).to.be.equals('bar');
  });

});

describe('createReducibleReducer', () => {

  it('should create a reducibleReducer that properly initializes state', () => {
    const initialState = new ReduceMe(false);
    const reducer = createReducibleReducer(initialState);
    const initial = reducer(undefined, { type: 'INIT' });

    expect(initialState.initialized).to.be.false;
    expect(initial.initialized).to.be.true;
  });

  it('should create a reducibleReducer that only returns a new object if input is changed', () => {
    const reducer = createReducibleReducer(new ReduceMe());

    const initial = reducer(undefined, { type: 'INIT' });
    const second = reducer(initial, { type: 'OTHER' });
    const third = reducer(initial, { type: 'SOME_OTHER' });

    expect(initial).to.be.equals(second);
    expect(second).to.be.equals(third);
  });

  it('should create a reducibleReducer that should properly handle action payloads', () => {
    const reducer = createReducibleReducer(new ReduceMe());

    const initial = reducer(undefined, { type: 'INIT' });
    const second = reducer(initial, { payload: true, type: 'OTHER' });
    expect(initial.payload).to.be.null;
    expect(second.payload).to.be.true;
  });

});

describe('createConstantReducer', () => {

  it('should create a constantReducer that properly initializes state', () => {
    const reducer = createConstantReducer(1);
    const initial = reducer.reduce({ type: 'INIT' });
    expect(initial.value).to.be.equals(1);
  });

  it('should create a constantReducer that can act as auto reducer', () => {
    const reducer = createAutoReducer({ constant: createConstantReducer(1) });

    const initial = reducer(undefined, { type: 'TYPE' });

    expect(initial.constant.value).to.be.equals(1);
  });

});
