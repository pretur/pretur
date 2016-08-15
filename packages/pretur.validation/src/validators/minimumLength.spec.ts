import {expect} from 'chai';

import {minimumLength} from './minimumLength';

describe('validator:minimumLength', () => {

  it('should return null for valid input', () => {
    const validator1 = minimumLength('A', 2, false);
    const validator2 = minimumLength('A', 3, true);
    expect(validator1('12')).to.be.null;
    expect(validator1('1234')).to.be.null;
    expect(validator2('123')).to.be.null;
    expect(validator2('123456')).to.be.null;
    expect(validator2('')).to.be.null;
    expect(validator2(null)).to.be.null;
    expect(validator2(undefined)).to.be.null;
  });

  it('should return bundle with {VALUE, MINIMUM_LENGTH, ACCEPT_EMPTY} for invalid input', () => {
    const validator1 = minimumLength('A', 2, false);
    const validator2 = minimumLength('A', 3, true);
    expect(validator1('1')).to.deep.equal({
      key: 'A',
      data: { VALUE: '1', MINIMUM_LENGTH: 2, ACCEPT_EMPTY: false },
    });
    expect(validator1('')).to.deep.equal({
      key: 'A',
      data: { VALUE: '', MINIMUM_LENGTH: 2, ACCEPT_EMPTY: false },
    });
    expect(validator1(null)).to.deep.equal({
      key: 'A',
      data: { VALUE: null, MINIMUM_LENGTH: 2, ACCEPT_EMPTY: false },
    });
    expect(validator1(undefined)).to.deep.equal({
      key: 'A',
      data: { VALUE: undefined, MINIMUM_LENGTH: 2, ACCEPT_EMPTY: false },
    });
    expect(validator2('1')).to.deep.equal({
      key: 'A',
      data: { VALUE: '1', MINIMUM_LENGTH: 3, ACCEPT_EMPTY: true },
    });
    expect(validator2('12')).to.deep.equal({
      key: 'A',
      data: { VALUE: '12', MINIMUM_LENGTH: 3, ACCEPT_EMPTY: true },
    });
  });

});
