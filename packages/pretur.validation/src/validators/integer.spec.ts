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
    expect(validator(0.1)).to.deep.equal({ key: 'A', data: { VALUE: 0.1 } });
    expect(validator(null)).to.deep.equal({ key: 'A', data: { VALUE: null } });
    expect(validator(undefined)).to.deep.equal({ key: 'A', data: { VALUE: undefined } });
    expect(validator(Number.NaN)).to.deep.equal({ key: 'A', data: { VALUE: Number.NaN } });
    expect(validator('blah' as any)).to.deep.equal({ key: 'A', data: { VALUE: 'blah' } });
    expect(validator(Number.NEGATIVE_INFINITY)).to.deep.equal({
      key: 'A',
      data: { VALUE: Number.NEGATIVE_INFINITY },
    });
    expect(validator(Number.POSITIVE_INFINITY)).to.deep.equal({
      key: 'A',
      data: { VALUE: Number.POSITIVE_INFINITY },
    });
  });

});
