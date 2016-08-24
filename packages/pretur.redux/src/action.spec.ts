import { expect } from 'chai';
import * as Bluebird from 'bluebird';

import {
  composeTransformers,
  createActionDescriptor,
  createTargetedActionDescriptor,
  createAsyncAction,
  Action,
  Dispatch,
  hook,
} from './action';

describe('composeTransformers', () => {

  it('should throw if called with non falsy non function values', () => {
    expect(() => composeTransformers(<any>{})).to.throw();
  });

  it('should return identity function if no arguments or and empty array is provided', () => {
    const act = {};
    const identity = (<any>composeTransformers)();
    expect(act).to.be.equals(identity(act));

    const identity2 = (<any>composeTransformers)([]);
    expect(act).to.be.equals(identity2(act));
  });

  it('should return the single transformer only if one is provided', () => {
    const typeOnly = (a: Action<any, any>) => ({ type: a.type });
    const singular = composeTransformers(typeOnly);
    const singularByArray = composeTransformers([typeOnly]);
    expect(typeOnly).to.be.equals(singular);
    expect(typeOnly).to.be.equals(singularByArray);
  });

  it('should fail when a transformer is not valid', () => {
    expect(() => composeTransformers([<any>1])).to.throw();
    expect(() => composeTransformers([(a: Action<any, any>) => a, <any>1])).to.throw();
  });

  it('should properly compose transformers', () => {
    const t1 = (a: any) => { a['2'] = a['1'] + 1; return a; };
    const t2 = (a: any) => { a['3'] = a['2'] + 1; return a; };
    const t3 = (a: any) => { a['4'] = a['3'] + 1; return a; };
    const t4 = (a: any) => { a['5'] = a['4'] + 1; return a; };

    const composed = composeTransformers([t1, t2, t3, t4]);

    expect(composed(<any>{ type: 'A', 1: 1 })['5']).to.be.equals(5);
  });

});

describe('hook', () => {

  it('should properly dispatch a transformed action', () => {
    const t1 = (a: any) => { a['2'] = a['1'] + 1; return a; };
    const t2 = (a: any) => { a['3'] = a['2'] + 1; return a; };
    const t3 = (a: any) => { a['4'] = a['3'] + 1; return a; };
    const t4 = (a: any) => { a['5'] = a['4'] + 1; return a; };

    let action: any = null!;
    const enhancedDispatch = hook((a: any) => action = a, t1, t2, t3, t4);
    enhancedDispatch(<Action<any, any>>{ type: 'A', 1: 1 });
    expect(action['5']).to.be.equals(5);
  });

  it('should fail if provided a thunk', () => {
    const enhancedDispatch = hook(() => null!);
    expect(() => enhancedDispatch(() => null!)).to.throw();
  });

  it('should fail if provided an invalid action', () => {
    const enhancedDispatch = hook(() => null!);
    expect(() => enhancedDispatch(null!)).to.throw();
  });

});

describe('createActionDescriptor', () => {

  it('should create an actionDescriptor with correct type', () => {
    const ACTION = createActionDescriptor('ACTION');
    expect(ACTION.type).to.be.equals('ACTION');
  });

  it('should create an actionDescriptor with correct type and transformer', () => {
    const ACTION = createActionDescriptor('ACTION', [
      (a: any) => ({ type: a.type + '_1' }),
      (a: any) => ({ type: a.type + '_2' }),
      (a: any) => ({ type: a.type + '_3' }),
    ]);
    expect(ACTION.type).to.be.equals('ACTION');
    expect(ACTION.create().type).to.be.equals('ACTION_1_2_3');
  });

  it('should create an actionDescriptor with functional create function', () => {
    const ACTION = createActionDescriptor<{ a: string }, { b: string }>('ACTION');
    const act = ACTION.create({ a: 'hello' }, { b: 'world' });
    expect(act.payload!.a).to.be.equals('hello');
    expect(act.meta!.b).to.be.equals('world');
    expect(act.type).to.be.equals('ACTION');
  });

  it('should create an actionDescriptor with functional is function', () => {
    const ACTION = createActionDescriptor<{ a: string }, { b: string }>('ACTION');
    const act = ACTION.create({ a: 'hello' }, { b: 'world' });
    expect(ACTION.is(act)).to.be.true;
  });

});

describe('createTargetedActionDescriptor', () => {

  it('should create a targetedActionDescriptor with correct type', () => {
    const ACTION = createTargetedActionDescriptor('ACTION');
    expect(ACTION.type).to.be.equals('ACTION');
  });

  it('should create a targetedActionDescriptor with correct type and transformer', () => {
    const ACTION = createTargetedActionDescriptor('ACTION', [
      (a: any) => ({ type: a.type + '_1' }),
      (a: any) => ({ type: a.type + '_2' }),
      (a: any) => ({ type: a.type + '_3' }),
    ]);
    expect(ACTION.type).to.be.equals('ACTION');
    expect(ACTION.create.unicast(1).type).to.be.equals('ACTION_1_2_3');
    expect(ACTION.create.multicast([1]).type).to.be.equals('ACTION_1_2_3');
    expect(ACTION.create.broadcast().type).to.be.equals('ACTION_1_2_3');
  });

  it('should create a targetedActionDescriptor with functional create unicast function', () => {
    const ACTION = createTargetedActionDescriptor<{ a: string }, { b: string }>('ACTION');
    const act = ACTION.create.unicast(1, { a: 'hello' }, { b: 'world' });
    expect(act.payload!.a).to.be.equals('hello');
    expect(act.meta!.b).to.be.equals('world');
    expect(act.broadcast).to.be.false;
    expect(act.target).to.be.equals(1);
  });

  it('should create a targetedActionDescriptor with functional create multicast function', () => {
    const ACTION = createTargetedActionDescriptor<{ a: string }, { b: string }>('ACTION');
    const act = ACTION.create.multicast([1, '2'], { a: 'hello' }, { b: 'world' });
    expect(act.payload!.a).to.be.equals('hello');
    expect(act.meta!.b).to.be.equals('world');
    expect(act.broadcast).to.be.false;
    expect(act.target).to.be.deep.equal([1, '2']);
  });

  it('should create a targetedActionDescriptor with functional create broadcast function', () => {
    const ACTION = createTargetedActionDescriptor<{ a: string }, { b: string }>('ACTION');
    const act = ACTION.create.broadcast({ a: 'hello' }, { b: 'world' });
    expect(act.payload!.a).to.be.equals('hello');
    expect(act.meta!.b).to.be.equals('world');
    expect(act.broadcast).to.be.true;
    expect(act.target).to.be.undefined;
  });

  describe('is', () => {

    it('should pass for unicast when target is id', () => {
      const ACTION = createTargetedActionDescriptor<{ a: string }, { b: string }>('ACTION');
      const act = ACTION.create.unicast(2, { a: 'hello' }, { b: 'world' });
      expect(ACTION.is(2, act)).to.be.true;
    });

    it('should fail for unicast when target is not id', () => {
      const ACTION = createTargetedActionDescriptor<{ a: string }, { b: string }>('ACTION');
      const act = ACTION.create.unicast(2, { a: 'hello' }, { b: 'world' });
      expect(ACTION.is(1, act)).to.be.false;
    });

    it('should pass for multicast when id is in targets', () => {
      const ACTION = createTargetedActionDescriptor<{ a: string }, { b: string }>('ACTION');
      const act = ACTION.create.multicast([1, 2], { a: 'hello' }, { b: 'world' });
      expect(ACTION.is(2, act)).to.be.true;
    });

    it('should fail for multicast when id is not in targets', () => {
      const ACTION = createTargetedActionDescriptor<{ a: string }, { b: string }>('ACTION');
      const act = ACTION.create.multicast([1, 2], { a: 'hello' }, { b: 'world' });
      expect(ACTION.is(3, act)).to.be.false;
    });

    it('should pass for broadcast whatever the id is', () => {
      const ACTION = createTargetedActionDescriptor<{ a: string }, { b: string }>('ACTION');
      const act = ACTION.create.broadcast({ a: 'hello' }, { b: 'world' });
      expect(ACTION.is(2, act)).to.be.true;
    });

    it('should fail for type mismatch', () => {
      const ACTION = createTargetedActionDescriptor<{ a: string }, { b: string }>('ACTION');

      const act1 = ACTION.create.unicast(2, { a: 'hello' }, { b: 'world' });
      act1.type = 'STUFF1';
      expect(ACTION.is(2, act1)).to.be.false;

      const act2 = ACTION.create.multicast([1, 2], { a: 'hello' }, { b: 'world' });
      act2.type = 'STUFF2';
      expect(ACTION.is(2, act2)).to.be.false;

      const act3 = ACTION.create.broadcast({ a: 'hello' }, { b: 'world' });
      act3.type = 'STUFF3';
      expect(ACTION.is(2, act3)).to.be.false;
    });

  });

});

describe('createAsyncAction', () => {

  it('should create an async action with expected behavior', () => {
    const SUCCESS = createActionDescriptor<number, void>('SUCCESS');
    const ACTIONASYNC = createAsyncAction<void, number>(() => Bluebird.resolve(1), SUCCESS);
    const act = ACTIONASYNC.create();

    let successCalledWith = 0;

    const dispatch = <Dispatch>((action: Action<any, any>) => {
      if (SUCCESS.is(action)) {
        successCalledWith = action.payload!;
      }
    });

    return act(dispatch).then(() => expect(successCalledWith).to.be.equals(1));
  });

  it('should create an async action which properly calls attempt', () => {
    const SUCCESS = createActionDescriptor<number, void>('SUCCESS');
    const ATTEMPT = createActionDescriptor<void, void>('ATTEMPT');
    const ACTIONASYNC = createAsyncAction<void, number>(
      () => Bluebird.resolve(1), SUCCESS, null!, ATTEMPT
    );
    const act = ACTIONASYNC.create();

    let attemptCalled = false;

    const dispatch = <Dispatch>((action: Action<any, any>) => {
      if (ATTEMPT.is(action)) {
        attemptCalled = true;
      }
    });

    return act(dispatch).then(() => expect(attemptCalled).to.be.true);
  });

  it('should create an async action which properly calls fail', () => {
    const SUCCESS = createActionDescriptor<number, void>('SUCCESS');
    const FAIL = createActionDescriptor<Error, void>('FAIL');
    const ACTIONASYNC = createAsyncAction<void, number>(
      () => Bluebird.reject(new Error()), SUCCESS, FAIL
    );
    const act = ACTIONASYNC.create();

    let hasError = false;

    const dispatch = <Dispatch>((action: Action<any, any>) => {
      if (FAIL.is(action)) {
        hasError = true;
      }
    });

    return act(dispatch).catch(() => expect(hasError).to.be.true);
  });

});
