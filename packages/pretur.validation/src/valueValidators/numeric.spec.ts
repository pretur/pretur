/// <reference types="mocha" />

import { expect } from 'chai';
import { numeric } from './numeric';

describe('value-validator:numeric', () => {

  it('should return null for valid input', () => {
    const validator = numeric('A');
    expect(validator('123')).to.be.null;
    expect(validator('')).to.be.null;
    expect(validator('0')).to.be.null;
    expect(validator('0x11')).to.be.null;
    expect(validator('0b11')).to.be.null;
    expect(validator('0o11')).to.be.null;
    expect(validator('1.0')).to.be.null;
    expect(validator('1e-2')).to.be.null;
    expect(validator('1.999e2')).to.be.null;
    expect(validator(null!)).to.be.null;
    expect(validator(undefined!)).to.be.null;
  });

  it('should return bundle with {VALUE} for invalid input', () => {
    const validator = numeric('A');
    expect(validator('blah')).to.deep.equal({ data: { VALUE: 'blah' }, key: 'A' });
  });

});
