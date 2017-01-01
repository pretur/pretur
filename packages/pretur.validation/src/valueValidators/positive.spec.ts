/// <reference types="mocha" />

import * as Bluebird from 'bluebird';
import { expect } from 'chai';
import { positive } from './positive';

describe('value-validator:positive', () => {

  it('should return null for valid input', async (): Bluebird<void> => {
    const validator = positive('A');
    expect(await validator(1)).to.be.null;
    expect(await validator(Number.POSITIVE_INFINITY)).to.be.null;
    expect(await validator(0.1)).to.be.null;
  });

  it('should return bundle with {VALUE} for invalid input', async (): Bluebird<void> => {
    const validator = positive('A');
    expect(await validator(null!)).to.deep.equal({ data: { VALUE: null }, key: 'A' });
    expect(await validator(undefined!)).to.deep.equal({ data: { VALUE: undefined }, key: 'A' });
    expect(await validator(0)).to.deep.equal({ data: { VALUE: 0 }, key: 'A' });
    expect(await validator(Number.NaN)).to.deep.equal({ data: { VALUE: Number.NaN }, key: 'A' });
    expect(await validator(Number.NEGATIVE_INFINITY)).to.deep.equal({
      data: { VALUE: Number.NEGATIVE_INFINITY },
      key: 'A',
    });
  });

});
