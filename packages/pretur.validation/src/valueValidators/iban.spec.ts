/// <reference types="mocha" />

import * as Bluebird from 'bluebird';
import { expect } from 'chai';
import { iban } from './iban';

describe('value-validator:iban', () => {

  it('should return null for valid input', async (): Bluebird<void> => {
    const validator = iban('A');
    expect(await validator('AL47212110090000000235698741')).to.be.null;
    expect(await validator('IE29AIBK93115212345678')).to.be.null;
    expect(await validator('IR580540105180021273113007')).to.be.null;
  });

  it('should return bundle with {VALUE} for invalid input', async (): Bluebird<void> => {
    const validator = iban('A');
    expect(await validator('blah')).to.deep.equal({ data: { VALUE: 'blah' }, key: 'A' });
  });

});
