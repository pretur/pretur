/// <reference types="mocha" />

import { expect } from 'chai';
import { combine, getError, deepValidator } from './validator';

const noop = () => null;

describe('combine', () => {

  it('should return always-valid validator if non provided', () => {
    const validator = combine();
    expect(validator({})).to.be.null;
  });

  it('should return bail out with the first failed validation', () => {
    const validator = combine(
      (v: number) => v > 1 ? null : { key: 'A' },
      (v: number) => v > 2 ? null : { key: 'B' },
      (v: number) => v > 3 ? null : [{ key: 'C' }, { key: 'D' }],
      (v: number) => v > 4 ? null : { key: 'E' }
    );
    expect(validator(3)).to.deep.equal([{ key: 'C' }, { key: 'D' }, { key: 'E' }]);
  });

});

describe('getError', () => {

  it('should throw error when provided invalid path', () => {
    expect(() => getError([], <any>{})).to.throw();
    expect(() => getError([], <any>false)).to.throw();
    expect(() => getError([], <any>true)).to.throw();
    expect(() => getError([], null!)).to.throw();
    expect(() => getError([], null!)).to.throw();
    expect(() => getError([], undefined!)).to.throw();
  });

  it('should return null when there is no error', () => {
    expect(getError(null, 1)).to.be.null;
    expect((<any>getError)(null)).to.be.null;
    expect((<any>getError)(undefined)).to.be.null;
  });

  it('should throw when path does not point to a valid error set', () => {
    expect(() => getError([{ b: [{}] }], [0, 'b', 0])).to.throw();
    expect(() => getError([{ b: [{}] }], 0)).to.throw();
    expect(() => getError({ b: [] }, 'b')).to.throw();
    expect(() => getError([null, [{ key: 'V' }, null]], [1])).to.throw();
  });

  it('should properly return the error set when path is valid', () => {
    expect(getError(null, [0, 'b', 0])).to.be.null;
    expect(getError({ a: [{}, {}, [{ b: [null] }], {}] }, ['a', 2, 'b', 0])).to.be.null;
    expect(getError({ a: [[{ c: { key: 'A' } }]] }, ['a', 0, 0, 'c'])).to.deep.equal({ key: 'A' });
    expect(getError({ a: null }, ['a'])).to.be.null;
    expect(getError({ a: null }, 'a')).to.be.null;
    expect(getError([null, { key: 'V' }], 1)).to.deep.equal({ key: 'V' });
    expect(getError([null, [{ key: 'V' }, { key: 'U' }]], [1]))
      .to.deep.equal([{ key: 'V' }, { key: 'U' }]);
  });

});

describe('deepValidator', () => {

  it('should properly validate passing proper arguments when provided only a map', () => {
    expect(
      deepValidator<{ a: number }>(
        { a: (v: number, k, o) => ({ data: { k, o, v }, key: 'A' }) }
      )({ a: 1 })
    ).to.deep.equal({ a: { data: { k: 'a', o: { a: 1 }, v: 1 }, key: 'A' } });

    expect(
      deepValidator<{ a: number, b?: number }>(
        { a: () => ({ key: 'A' }), b: v => v ? { key: 'B' } : null }
      )({ a: 1 })
    ).to.deep.equal({ a: { key: 'A' } });

    expect(
      deepValidator<{ a: number, b: number }>(
        { a: () => ({ key: 'A' }), b: v => v ? { key: 'B' } : null }
      )({ a: 1, b: 2 })
    ).to.deep.equal({ a: { key: 'A' }, b: { key: 'B' } });

  });

  it('should properly validate passing proper arguments to prop validator', () => {
    expect(deepValidator((value, key, obj) => {
      expect(value).to.be.oneOf([1, 2]);
      expect(key).to.be.oneOf(['a', 'b']);
      expect(obj).to.deep.equal({ a: 1, b: 2 });
      return { data: value, key: 'E' };
    })({ a: 1, b: 2 })).to.deep.equal({ a: { data: 1, key: 'E' }, b: { data: 2, key: 'E' } });
  });

  it('should properly validate when provided a self and prop validator', () => {
    expect(deepValidator(() => ({ key: 'A' }), noop)({ a: 1 })).to.deep.equal({ key: 'A' });
    expect(deepValidator(({ a }) => ({ key: a }), noop)({ a: 'A' })).to.deep.equal({ key: 'A' });
    expect(deepValidator(noop, noop)({ a: 1 })).to.be.null;
    expect(
      deepValidator(noop, (_, k) => ({ key: k }))({ a: 'A' })
    ).to.deep.equal({ a: { key: 'a' } });
  });

  it('should properly validate when provided a self validator with a map', () => {
    expect(deepValidator(({ a }) => ({ key: a }), {})({ a: 'A' })).to.deep.equal({ key: 'A' });
    expect(
      deepValidator<{ a: string, b: string }>(
        noop,
        { a: v => ({ key: v }), b: v => ({ key: v }) },
      )({ a: 'A', b: 'B' })
    ).to.deep.equal({ a: { key: 'A' }, b: { key: 'B' } });
  });

  it('should properly validate when provided a self and prop validator with a map', () => {
    expect(deepValidator(({ a }) => ({ key: a }), noop, {})({ a: 'A' })).to.deep.equal({ key: 'A' });
    expect(
      deepValidator<{ a: string, b: string }>(
        noop,
        () => ({ key: 'C' }),
        { a: v => ({ key: v }) },
      )({ a: 'A', b: 'B' })
    ).to.deep.equal({ a: { key: 'A' }, b: { key: 'C' } });
  });

  it('should be properly nested', () => {
    deepValidator<{ a: any, b: { fail: boolean, c: any, d: any }, e: null }>({
      a: () => ({ key: 'A' }),
      b: deepValidator<{ fail: boolean, c: any, d: any }>(
        ({ fail }) => fail ? { key: 'FAIL' } : null,
        {
          c: () => ({ key: 'C' }),
          d: (v, key, obj) => [{ key: v }, { key }, { data: obj, key: 'D' }],
        },
      ),
      e: deepValidator<null>(noop, v => ({ key: v }))
    });
  });

});
