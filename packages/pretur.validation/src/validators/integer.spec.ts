/// <reference types="mocha" />

import { expect } from 'chai';
import { integer } from './integer';

describe('validator:integer', () => {

  it('should return null for valid input', () => {
    const validator = integer('A');
    expect(validator(1)).to.be.null;
    expect(validator(-1)).to.be.null;
    expect(validator(0)).to.be.null;
    expect(validator(1000000)).to.be.null;
  });

  it('should return bundle with {VALUE} for invalid input', () => {
    const validator = integer('A');
    expect(validator(0.1)).to.deep.equal({ data: { VALUE: 0.1 }, key: 'A' });
    expect(validator(null!)).to.deep.equal({ data: { VALUE: null }, key: 'A' });
    expect(validator(undefined!)).to.deep.equal({ data: { VALUE: undefined }, key: 'A' });
    expect(validator(Number.NaN)).to.deep.equal({ data: { VALUE: Number.NaN }, key: 'A' });
    expect(validator(<any>'blah')).to.deep.equal({ data: { VALUE: 'blah' }, key: 'A' });
    expect(validator(Number.NEGATIVE_INFINITY)).to.deep.equal({
      data: { VALUE: Number.NEGATIVE_INFINITY },
      key: 'A',
    });
    expect(validator(Number.POSITIVE_INFINITY)).to.deep.equal({
      data: { VALUE: Number.POSITIVE_INFINITY },
      key: 'A',
    });
  });

});
