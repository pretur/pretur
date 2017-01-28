/// <reference types="mocha" />

import { expect } from 'chai';
import EnumType from './EnumType';

describe('EnumType', () => {

  it('should correctly instantiate and identify an enum datatype', () => {
    const d = EnumType.create<'a'>('A', [['a', 'A']]);
    expect(EnumType.is(d)).to.be.true;
    expect(d.values[0].name).to.be.equals('a');
    expect(d.values[0].i18nKey).to.be.equals('A');
  });

  it('should throw if no values are specified', () => {
    expect(() => EnumType.create<'a'>('A', [])).to.throw();
    expect(() => EnumType.create<'a'>('A', [<any>0])).to.throw();
    expect(() => EnumType.create<'a'>('A', [<any>false])).to.throw();
    expect(() => EnumType.create<'a'>('A', [undefined!])).to.throw();
  });

  it('should throw if any of the values have invalid name', () => {
    expect(() => EnumType.create<'a'>('A', [[undefined!, 'A'], ['a', 'A']])).to.throw();
  });

  it('should throw if any of the values have the same name', () => {
    expect(() => EnumType.create<'a'>('A', [['a', 'A'], ['a', 'A']])).to.throw();
    expect(() => EnumType.create<'a'>('A', [['a', 'A'], ['a', 'B']])).to.throw();
  });

});
