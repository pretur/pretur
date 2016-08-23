import { expect } from 'chai';
import { exactLength } from './exactLength';

describe('validator:exactLength', () => {

  it('should return null for valid input', () => {
    const validator1 = exactLength('A', 2, false);
    const validator2 = exactLength('A', 3, true);
    expect(validator1('12')).to.be.null;
    expect(validator2('123')).to.be.null;
    expect(validator2('')).to.be.null;
    expect(validator2(null)).to.be.null;
    expect(validator2(undefined)).to.be.null;
  });

  it('should return bundle with {VALUE, EXPECTED_LENGTH, ACCEPT_EMPTY} for invalid input', () => {
    const validator1 = exactLength('A', 2, false);
    const validator2 = exactLength('A', 3, true);
    expect(validator1('123')).to.deep.equal({
      key: 'A',
      data: { VALUE: '123', EXPECTED_LENGTH: 2, ACCEPT_EMPTY: false },
    });
    expect(validator1('')).to.deep.equal({
      key: 'A',
      data: { VALUE: '', EXPECTED_LENGTH: 2, ACCEPT_EMPTY: false },
    });
    expect(validator1(null)).to.deep.equal({
      key: 'A',
      data: { VALUE: null, EXPECTED_LENGTH: 2, ACCEPT_EMPTY: false },
    });
    expect(validator1(undefined)).to.deep.equal({
      key: 'A',
      data: { VALUE: undefined, EXPECTED_LENGTH: 2, ACCEPT_EMPTY: false },
    });
    expect(validator2('12')).to.deep.equal({
      key: 'A',
      data: { VALUE: '12', EXPECTED_LENGTH: 3, ACCEPT_EMPTY: true },
    });
    expect(validator2('1233')).to.deep.equal({
      key: 'A',
      data: { VALUE: '1233', EXPECTED_LENGTH: 3, ACCEPT_EMPTY: true },
    });
  });

});
