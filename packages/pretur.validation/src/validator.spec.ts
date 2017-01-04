/// <reference types="mocha" />

import * as Bluebird from 'bluebird';
import { expect } from 'chai';
import {
  combineValueValidator,
  getError,
  deepValidator,
  ValueValidationError,
  ValidationError,
} from './validator';

const noop = () => undefined;
const asyncNoop = () => Bluebird.resolve(undefined);

describe('combine', () => {

  it('should return always-valid validator if non provided', async (): Bluebird<void> => {
    const validator = combineValueValidator();
    expect(await validator({})).to.be.undefined;
  });

  it('should return bail out with the first failed validation', async (): Bluebird<void> => {
    const validator = combineValueValidator(
      async (v: number): Bluebird<ValueValidationError> => v > 1 ? undefined : { key: 'A' },
      async (v: number): Bluebird<ValueValidationError> => v > 2 ? undefined : { key: 'B' },
      async (v: number): Bluebird<ValueValidationError> => v > 3 ? undefined : [
        { key: 'C' },
        { key: 'D' },
      ],
      async (v: number): Bluebird<ValueValidationError> => v > 4 ? undefined : { key: 'E' },
    );
    expect(await validator(3)).to.deep.equal([{ key: 'C' }, { key: 'D' }, { key: 'E' }]);
  });

});

describe('getError', () => {

  it('should throw error when provided invalid path', () => {
    expect(() => getError([], <any>{})).to.throw();
    expect(() => getError([], <any>false)).to.throw();
    expect(() => getError([], <any>true)).to.throw();
    expect(() => getError([], undefined!)).to.throw();
  });

  it('should return undefined when there is no error', () => {
    expect(getError(undefined, 1)).to.be.undefined;
    expect((<any>getError)(undefined)).to.be.undefined;
  });

  it('should throw when path does not point to a valid error set', () => {
    expect(() => getError([{ b: [{}] }], [0, 'b', 0])).to.throw();
    expect(() => getError([{ b: [{}] }], 0)).to.throw();
    expect(() => getError({ b: [] }, 'b')).to.throw();
    expect(() => getError([undefined, [{ key: 'V' }, undefined]], [1])).to.throw();
  });

  it('should properly return the error set when path is valid', () => {
    expect(getError(undefined, [0, 'b', 0])).to.be.undefined;
    expect(getError({ a: [{}, {}, [{ b: [undefined] }], {}] }, ['a', 2, 'b', 0])).to.be.undefined;
    expect(getError({ a: [[{ c: { key: 'A' } }]] }, ['a', 0, 0, 'c'])).to.deep.equal({ key: 'A' });
    expect(getError({ a: undefined }, ['a'])).to.be.undefined;
    expect(getError({ a: undefined }, 'a')).to.be.undefined;
    expect(getError([undefined, { key: 'V' }], 1)).to.deep.equal({ key: 'V' });
    expect(getError([undefined, [{ key: 'V' }, { key: 'U' }]], [1]))
      .to.deep.equal([{ key: 'V' }, { key: 'U' }]);
  });

});

describe('deepValidator', () => {

  it(
    'should properly validate passing proper arguments when provided only a map',
    async (): Bluebird<void> => {
      expect(
        await deepValidator<{ a: number }>(
          {
            a: async (v, k, o): Bluebird<ValueValidationError> => ({
              data: { k, o, v },
              key: 'A',
            }),
          },
        )({ a: 1 }),
      ).to.deep.equal({ a: { data: { k: 'a', o: { a: 1 }, v: 1 }, key: 'A' } });

      expect(
        await deepValidator<{ a: number, b?: number }>(
          {
            a: async (): Bluebird<ValidationError> => ({ key: 'A' }),
            b: async (v): Bluebird<ValidationError> => v ? { key: 'B' } : undefined,
          },
        )({ a: 1 }),
      ).to.deep.equal({ a: { key: 'A' } });

      expect(
        await deepValidator<{ a: number, b: number }>(
          {
            a: async (): Bluebird<ValidationError> => ({ key: 'A' }),
            b: async (v): Bluebird<ValidationError> => v ? { key: 'B' } : undefined,
          },
        )({ a: 1, b: 2 }),
      ).to.deep.equal({ a: { key: 'A' }, b: { key: 'B' } });
    },
  );

  it(
    'should properly validate passing proper arguments to prop validator',
    async (): Bluebird<void> => {
      expect(await deepValidator((value, key, obj) => {
        expect(value).to.be.oneOf([1, 2]);
        expect(key).to.be.oneOf(['a', 'b']);
        expect(obj).to.deep.equal({ a: 1, b: 2 });
        return { data: value, key: 'E' };
      })({ a: 1, b: 2 })).to.deep.equal({ a: { data: 1, key: 'E' }, b: { data: 2, key: 'E' } });
    },
  );

  it(
    'should properly validate when provided a self and prop validator',
    async (): Bluebird<void> => {
      expect(await deepValidator(
        async (): Bluebird<ValidationError> => ({ key: 'A' }),
        noop,
      )({ a: 1 })).to.deep.equal({ key: 'A' });
      expect(await deepValidator(
        ({ a }) => Bluebird.resolve({ key: a }),
        noop,
      )({ a: 'A' })).to.deep.equal({ key: 'A' });
      expect(await deepValidator(asyncNoop, noop)({ a: 1 })).to.be.undefined;
      expect(
        await deepValidator(asyncNoop, (_, k) => ({ key: k }))({ a: 'A' }),
      ).to.deep.equal({ a: { key: 'a' } });
    },
  );

  it(
    'should properly validate when provided a self validator with a map',
    async (): Bluebird<void> => {
      expect(await deepValidator(
        ({ a }) => Bluebird.resolve({ key: a }),
        {},
      )({ a: 'A' })).to.deep.equal({ key: 'A' });
      expect(
        await deepValidator<{ a: string, b: string }>(asyncNoop, {
          a: async (v): Bluebird<ValidationError> => ({ key: v }),
          b: async (v): Bluebird<ValidationError> => ({ key: v }),
        })({ a: 'A', b: 'B' }),
      ).to.deep.equal({ a: { key: 'A' }, b: { key: 'B' } });
    },
  );

  it(
    'should properly validate when provided a self and prop validator with a map',
    async (): Bluebird<void> => {
      expect(await deepValidator(
        ({ a }) => Bluebird.resolve({ key: a }),
        asyncNoop,
        {},
      )({ a: 'A' })).to.deep.equal({ key: 'A' });
      expect(
        await deepValidator<{ a: string, b: string }>(
          asyncNoop,
          async (): Bluebird<ValidationError> => ({ key: 'C' }),
          { a: async (v): Bluebird<ValidationError> => ({ key: v }) },
        )({ a: 'A', b: 'B' }),
      ).to.deep.equal({ a: { key: 'A' }, b: { key: 'C' } });
    },
  );

  it('should be properly nested', async (): Bluebird<void> => {
    await deepValidator<{ a: any, b: { fail: boolean, c: any, d: any }, e: undefined }>({
      a: async (): Bluebird<ValidationError> => ({ key: 'A' }),
      b: deepValidator<{ fail: boolean, c: any, d: any }>(
        async ({ fail }): Bluebird<ValidationError> => fail ? { key: 'FAIL' } : undefined,
        {
          c: async (): Bluebird<ValidationError> => ({ key: 'C' }),
          d: async (v, key, obj): Bluebird<ValidationError> => [
            { key: v },
            { key },
            { data: obj, key: 'D' },
          ],
        },
      ),
      e: deepValidator<undefined>(asyncNoop, async (v): Bluebird<ValidationError> => ({ key: v })),
    });
  });

});
