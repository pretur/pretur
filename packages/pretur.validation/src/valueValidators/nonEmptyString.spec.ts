/// <reference types="mocha" />

import * as Bluebird from 'bluebird';
import { expect } from 'chai';
import { nonEmptyString } from './nonEmptyString';

describe('value-validator:nonEmptyString', () => {

  it('should return undefined for valid input', async (): Bluebird<void> => {
    const validator = nonEmptyString('A');
    expect(await validator('a')).to.be.undefined;
    expect(await validator('1')).to.be.undefined;
  });

  it('should return bundle with {VALUE} for invalid input', async (): Bluebird<void> => {
    const validator = nonEmptyString('A');
    expect(await validator(' ')).to.deep.equal({ data: { VALUE: ' ' }, key: 'A' });
    expect(await validator('    \n ')).to.deep.equal({ data: { VALUE: '    \n ' }, key: 'A' });
    expect(await validator('')).to.deep.equal({ data: { VALUE: '' }, key: 'A' });
    expect(await validator(undefined!)).to.deep.equal({ data: { VALUE: undefined }, key: 'A' });
  });

});
