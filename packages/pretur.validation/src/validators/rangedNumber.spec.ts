/// <reference types="mocha" />

import { expect } from 'chai';
import { rangedNumber } from './rangedNumber';

describe('value-validator:rangedNumber', () => {

  it('should return undefined for valid input', async () => {
    const validator1 = rangedNumber('A', 1.5, 1.6);
    const validator2 = rangedNumber('A', 1.5, 1.6, false, false);
    const validator3 = rangedNumber('A', 3);
    expect(await validator1(1.5)).to.be.undefined;
    expect(await validator1(1.6)).to.be.undefined;
    expect(await validator2(1.51)).to.be.undefined;
    expect(await validator3(Number.POSITIVE_INFINITY)).to.be.undefined;
  });

  it(
    'should return bundle with {VALUE, FROM, TO, INCLUSIVE_FROM, INCLUSIVE_TO} for invalid input',
    async () => {
      const validator = rangedNumber('A', -10, 10, true, false);
      expect(await validator(undefined!)).to.deep.equal({
        data: {
          FROM: -10,
          INCLUSIVE_FROM: true,
          INCLUSIVE_TO: false,
          TO: 10,
          VALUE: undefined,
        },
        key: 'A',
      });
      expect(await validator(Number.NaN)).to.deep.equal({
        data: {
          FROM: -10,
          INCLUSIVE_FROM: true,
          INCLUSIVE_TO: false,
          TO: 10,
          VALUE: Number.NaN,
        },
        key: 'A',
      });
      expect(await validator(Number.POSITIVE_INFINITY)).to.deep.equal({
        data: {
          FROM: -10,
          INCLUSIVE_FROM: true,
          INCLUSIVE_TO: false,
          TO: 10,
          VALUE: Number.POSITIVE_INFINITY,
        },
        key: 'A',
      });
      expect(await validator(Number.NEGATIVE_INFINITY)).to.deep.equal({
        data: {
          FROM: -10,
          INCLUSIVE_FROM: true,
          INCLUSIVE_TO: false,
          TO: 10,
          VALUE: Number.NEGATIVE_INFINITY,
        },
        key: 'A',
      });
      expect(await validator(-10.1)).to.deep.equal({
        data: {
          FROM: -10,
          INCLUSIVE_FROM: true,
          INCLUSIVE_TO: false,
          TO: 10,
          VALUE: -10.1,
        },
        key: 'A',
      });
      expect(await validator(10)).to.deep.equal({
        data: {
          FROM: -10,
          INCLUSIVE_FROM: true,
          INCLUSIVE_TO: false,
          TO: 10,
          VALUE: 10,
        },
        key: 'A',
      });
    },
  );

});
