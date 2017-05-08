/// <reference types="mocha" />

import { expect } from 'chai';
import {
  createActionDescriptor,
  createTargetedActionDescriptor,
} from './action';

describe('createActionDescriptor', () => {

  it('should create an actionDescriptor with correct type', () => {
    const ACTION = createActionDescriptor('ACTION');
    expect(ACTION.type).to.be.equals('ACTION');
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
