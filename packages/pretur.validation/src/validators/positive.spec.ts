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
    expect(validator(null)).to.deep.equal({ key: 'A', data: { VALUE: null } });
    expect(validator(undefined)).to.deep.equal({ key: 'A', data: { VALUE: undefined } });
    expect(validator(0)).to.deep.equal({ key: 'A', data: { VALUE: 0 } });
    expect(validator(Number.NaN)).to.deep.equal({ key: 'A', data: { VALUE: Number.NaN } });
    expect(validator(Number.NEGATIVE_INFINITY)).to.deep.equal({
      key: 'A',
      data: { VALUE: Number.NEGATIVE_INFINITY },
    });
  });

});
