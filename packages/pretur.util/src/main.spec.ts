/// <reference types="mocha" />

import { expect } from 'chai';
import { get, getWithDefault, set, setCustomized } from './main';

interface A {
  a: {
    b: [{ c?: string }, { d: number }];
    c: string[];
  };
  b: [{ c: [{ d: boolean }] }];
  c: { [code: string]: { e: { f: { [code: string]: string } } } };
  e: { [code: string]: number };
  f: { [id: string]: string };
}

const objBuilder: () => A = () => ({
  a: {
    b: [{ c: 'foo' }, { d: 1 }],
    c: ['bar', 'baz'],
  },
  b: [{ c: [{ d: true }] }],
  c: { 1: { e: { f: { 10: '10' } } }, 2: { e: { f: { 20: '20' } } } },
  e: { a: 1, b: 2 },
  f: { 1: '1', 2: '2' },
});

describe('get', () => {

  it('should properly get', () => {
    const obj = objBuilder();
    expect(get(obj, 'a', 'b', '0')).to.deep.equal({ c: 'foo' });
    expect(get(obj, 'e', 'b')).to.be.equals(2);
    expect(get(obj, 'f', '2')).to.be.equals('2');
  });

});

describe('getWithDefault', () => {

  it('should properly get', () => {
    const obj = objBuilder();
    expect(getWithDefault(obj, 3, 'e', 'c')).to.be.equals(3);
    expect(getWithDefault(obj, '5', 'f', '3')).to.be.equals('5');
  });

});

describe('set', () => {

  it('should properly set value', () => {
    const obj = objBuilder();
    set(obj, { c: '1' }, 'a', 'b', '0');
    expect(obj.a.b[0]).to.deep.equal({ c: '1' });
  });

  it('should properly set primitive value', () => {
    const obj = objBuilder();
    set(obj, 2, 'e', 'b');
    set(obj, '2', 'f', '1');
    expect(obj.e['b']).to.be.equals(2);
    expect(obj.f['1']).to.be.equals('2');
  });

});

describe('setCustomized', () => {

  it('should properly set value with cutomizer', () => {
    const obj = objBuilder();
    setCustomized(obj, {}, Object, 'c');
    setCustomized(obj, '100', Object, 'c', '3', 'e', 'f', '1');
    expect(obj.c).to.deep.equal({ 3: { e: { f: { 1: '100' } } } });
  });

});
