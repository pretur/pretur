/// <reference types="mocha" />

import * as Bluebird from 'bluebird';
import { expect } from 'chai';
import { integer } from './integer';

describe('value-validator:integer', () => {

  it('should return undefined for valid input', async (): Bluebird<void> => {
    const validator = integer('A');
    expect(await validator(1)).to.be.undefined;
    expect(await validator(-1)).to.be.undefined;
    expect(await validator(0)).to.be.undefined;
    expect(await validator(1000000)).to.be.undefined;
  });

  it('should return bundle with {VALUE} for invalid input', async (): Bluebird<void> => {
    const validator = integer('A');
    expect(await validator(0.1)).to.deep.equal({ data: { VALUE: 0.1 }, key: 'A' });
    expect(await validator(undefined!)).to.deep.equal({ data: { VALUE: undefined }, key: 'A' });
    expect(await validator(Number.NaN)).to.deep.equal({ data: { VALUE: Number.NaN }, key: 'A' });
    expect(await validator(<any>'blah')).to.deep.equal({ data: { VALUE: 'blah' }, key: 'A' });
    expect(await validator(Number.NEGATIVE_INFINITY)).to.deep.equal({
      data: { VALUE: Number.NEGATIVE_INFINITY },
      key: 'A',
    });
    expect(await validator(Number.POSITIVE_INFINITY)).to.deep.equal({
      data: { VALUE: Number.POSITIVE_INFINITY },
      key: 'A',
    });
  });

});
