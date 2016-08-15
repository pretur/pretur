import {expect} from 'chai';

import {rangedNumber} from './rangedNumber';

describe('validator:rangedNumber', () => {

  it('should return null for valid input', () => {
    const validator1 = rangedNumber('A', 1.5, 1.6);
    const validator2 = rangedNumber('A', 1.5, 1.6, false, false);
    const validator3 = rangedNumber('A', 3);
    expect(validator1(1.5)).to.be.null;
    expect(validator1(1.6)).to.be.null;
    expect(validator2(1.51)).to.be.null;
    expect(validator3(Number.POSITIVE_INFINITY)).to.be.null;
  });

  it('should return bundle with {VALUE, FROM, TO, INCLUSIVE_FROM, INCLUSIVE_TO} for invalid input', () => {
    const validator = rangedNumber('A', -10, 10, true, false);
    expect(validator(null)).to.deep.equal({
      key: 'A',
      data: { VALUE: null, FROM: -10, TO: 10, INCLUSIVE_FROM: true, INCLUSIVE_TO: false, },
    });
    expect(validator(undefined)).to.deep.equal({
      key: 'A',
      data: { VALUE: undefined, FROM: -10, TO: 10, INCLUSIVE_FROM: true, INCLUSIVE_TO: false, },
    });
    expect(validator(Number.NaN)).to.deep.equal({
      key: 'A',
      data: { VALUE: Number.NaN, FROM: -10, TO: 10, INCLUSIVE_FROM: true, INCLUSIVE_TO: false, },
    });
    expect(validator(Number.POSITIVE_INFINITY)).to.deep.equal({
      key: 'A',
      data: { VALUE: Number.POSITIVE_INFINITY, FROM: -10, TO: 10, INCLUSIVE_FROM: true, INCLUSIVE_TO: false, },
    });
    expect(validator(Number.NEGATIVE_INFINITY)).to.deep.equal({
      key: 'A',
      data: { VALUE: Number.NEGATIVE_INFINITY, FROM: -10, TO: 10, INCLUSIVE_FROM: true, INCLUSIVE_TO: false, },
    });
    expect(validator(-10.1)).to.deep.equal({
      key: 'A',
      data: { VALUE: -10.1, FROM: -10, TO: 10, INCLUSIVE_FROM: true, INCLUSIVE_TO: false, },
    });
    expect(validator(10)).to.deep.equal({
      key: 'A',
      data: { VALUE: 10, FROM: -10, TO: 10, INCLUSIVE_FROM: true, INCLUSIVE_TO: false, },
    });
  });

});
