/// <reference types="mocha" />

import { expect } from 'chai';
import EnumType from './EnumType';

describe('EnumType', () => {

  it('should correctly instantiate and identify an enum datatype', () => {
    const d = EnumType.create<'a'>('A', [['a', 'A']]);
    expect(d.typeName).to.be.equals('string');
    expect(EnumType.is(d)).to.be.true;
    expect(d.values[0].name).to.be.equals('a');
    expect(d.values[0].i18nKey).to.be.equals('A');
  });

  it('should properly override the typeName', () => {
    const d = EnumType.create<'a'>('A', [['a', 'A']], `'a'`);
    expect(d.typeName).to.be.equals(`'a'`);
  });

  it('should throw if no values are specified', () => {
    expect(() => EnumType.create<'a'>('A', [], `'a'`)).to.throw();
    expect(() => EnumType.create<'a'>('A', [<any>0], `'a'`)).to.throw();
    expect(() => EnumType.create<'a'>('A', [<any>false], `'a'`)).to.throw();
    expect(() => EnumType.create<'a'>('A', [undefined!], `'a'`)).to.throw();
  });

  it('should throw if any of the values have invalid name', () => {
    expect(() => EnumType.create<'a'>('A', [[undefined!, 'A'], ['a', 'A']], `'a'`)).to.throw();
  });

  it('should throw if any of the values have the same name', () => {
    expect(() => EnumType.create<'a'>('A', [['a', 'A'], ['a', 'A']], `'a'`)).to.throw();
    expect(() => EnumType.create<'a'>('A', [['a', 'A'], ['a', 'B']], `'a'`)).to.throw();
  });

});
