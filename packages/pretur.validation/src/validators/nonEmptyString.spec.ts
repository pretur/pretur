import { expect } from 'chai';

import { nonEmptyString } from './nonEmptyString';

describe('validator:nonEmptyString', () => {

  it('should return null for valid input', () => {
    const validator = nonEmptyString('A');
    expect(validator('a')).to.be.null;
    expect(validator('1')).to.be.null;
  });

  it('should return bundle with {VALUE} for invalid input', () => {
    const validator = nonEmptyString('A');
    expect(validator(' ')).to.deep.equal({ key: 'A', data: { VALUE: ' ' } });
    expect(validator('    \n ')).to.deep.equal({ key: 'A', data: { VALUE: '    \n ' } });
    expect(validator('')).to.deep.equal({ key: 'A', data: { VALUE: '' } });
    expect(validator(null)).to.deep.equal({ key: 'A', data: { VALUE: null } });
    expect(validator(undefined)).to.deep.equal({ key: 'A', data: { VALUE: undefined } });
  });

});
