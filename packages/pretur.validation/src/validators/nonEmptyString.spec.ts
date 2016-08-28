/// <reference types="mocha" />

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
    expect(validator(' ')).to.deep.equal({ data: { VALUE: ' ' }, key: 'A' });
    expect(validator('    \n ')).to.deep.equal({ data: { VALUE: '    \n ' }, key: 'A' });
    expect(validator('')).to.deep.equal({ data: { VALUE: '' }, key: 'A' });
    expect(validator(null!)).to.deep.equal({ data: { VALUE: null }, key: 'A' });
    expect(validator(undefined!)).to.deep.equal({ data: { VALUE: undefined }, key: 'A' });
  });

});
