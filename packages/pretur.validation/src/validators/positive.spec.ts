import { expect } from 'chai';
import { positive } from './positive';

describe('validator:positive', () => {

  it('should return null for valid input', () => {
    const validator = positive('A');
    expect(validator(1)).to.be.null;
    expect(validator(Number.POSITIVE_INFINITY)).to.be.null;
    expect(validator(0.1)).to.be.null;
  });

  it('should return bundle with {VALUE} for invalid input', () => {
    const validator = positive('A');
    expect(validator(null!)).to.deep.equal({ data: { VALUE: null }, key: 'A' });
    expect(validator(undefined!)).to.deep.equal({ data: { VALUE: undefined }, key: 'A' });
    expect(validator(0)).to.deep.equal({ data: { VALUE: 0 }, key: 'A' });
    expect(validator(Number.NaN)).to.deep.equal({ data: { VALUE: Number.NaN }, key: 'A' });
    expect(validator(Number.NEGATIVE_INFINITY)).to.deep.equal({
      data: { VALUE: Number.NEGATIVE_INFINITY },
      key: 'A',
    });
  });

});
