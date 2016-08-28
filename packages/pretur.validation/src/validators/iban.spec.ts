/// <reference types="mocha" />

import { expect } from 'chai';
import { iban } from './iban';

describe('validator:iban', () => {

  it('should return null for valid input', () => {
    const validator = iban('A');
    expect(validator('AL47212110090000000235698741')).to.be.null;
    expect(validator('IE29AIBK93115212345678')).to.be.null;
    expect(validator('IR580540105180021273113007')).to.be.null;
  });

  it('should return bundle with {VALUE} for invalid input', () => {
    const validator = iban('A');
    expect(validator('blah')).to.deep.equal({ data: { VALUE: 'blah' }, key: 'A' });
  });

});
