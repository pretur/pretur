/// <reference types="mocha" />

import { expect } from 'chai';
import { createHomingAction } from './action';

describe('createHomingAction', () => {

  it('should create a homingActionDefinition with correct type', () => {
    const ACTION = createHomingAction('ACTION');
    expect(ACTION.type).to.be.equals('ACTION');
  });

  it('should create a homingActionDefinition with functional create unicast function', () => {
    const ACTION = createHomingAction<{ a: string }>('ACTION');
    const act = ACTION.create.unicast(1, { a: 'hello' });
    expect(act.payload!.a).to.be.equals('hello');
    expect(act.broadcast).to.be.false;
    expect(act.target).to.be.equals(1);
  });

  it('should create a homingActionDefinition with functional create multicast function', () => {
    const ACTION = createHomingAction<{ a: string }>('ACTION');
    const act = ACTION.create.multicast([1, '2'], { a: 'hello' });
    expect(act.payload!.a).to.be.equals('hello');
    expect(act.broadcast).to.be.false;
    expect(act.target).to.be.deep.equal([1, '2']);
  });

  it('should create a homingActionDefinition with functional create broadcast function', () => {
    const ACTION = createHomingAction<{ a: string }>('ACTION');
    const act = ACTION.create.broadcast({ a: 'hello' });
    expect(act.payload!.a).to.be.equals('hello');
    expect(act.broadcast).to.be.true;
    expect(act.target).to.be.undefined;
  });

  describe('is', () => {

    it('should pass for unicast when target is id', () => {
      const ACTION = createHomingAction<{ a: string }>('ACTION');
      const act = ACTION.create.unicast(2, { a: 'hello' });
      expect(ACTION.is(2, act)).to.be.true;
    });

    it('should fail for unicast when target is not id', () => {
      const ACTION = createHomingAction<{ a: string }>('ACTION');
      const act = ACTION.create.unicast(2, { a: 'hello' });
      expect(ACTION.is(1, act)).to.be.false;
    });

    it('should pass for multicast when id is in targets', () => {
      const ACTION = createHomingAction<{ a: string }>('ACTION');
      const act = ACTION.create.multicast([1, 2], { a: 'hello' });
      expect(ACTION.is(2, act)).to.be.true;
    });

    it('should fail for multicast when id is not in targets', () => {
      const ACTION = createHomingAction<{ a: string }>('ACTION');
      const act = ACTION.create.multicast([1, 2], { a: 'hello' });
      expect(ACTION.is(3, act)).to.be.false;
    });

    it('should pass for broadcast whatever the id is', () => {
      const ACTION = createHomingAction<{ a: string }>('ACTION');
      const act = ACTION.create.broadcast({ a: 'hello' });
      expect(ACTION.is(2, act)).to.be.true;
    });

    it('should fail for type mismatch', () => {
      const ACTION = createHomingAction<{ a: string }>('ACTION');

      const act1 = ACTION.create.unicast(2, { a: 'hello' });
      act1.type = 'STUFF1';
      expect(ACTION.is(2, act1)).to.be.false;

      const act2 = ACTION.create.multicast([1, 2], { a: 'hello' });
      act2.type = 'STUFF2';
      expect(ACTION.is(2, act2)).to.be.false;

      const act3 = ACTION.create.broadcast({ a: 'hello' });
      act3.type = 'STUFF3';
      expect(ACTION.is(2, act3)).to.be.false;
    });

  });

});
