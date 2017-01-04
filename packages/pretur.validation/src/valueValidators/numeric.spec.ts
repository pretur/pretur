/// <reference types="mocha" />

import * as Bluebird from 'bluebird';
import { expect } from 'chai';
import { numeric } from './numeric';

describe('value-validator:numeric', () => {

  it('should return undefined for valid input', async (): Bluebird<void> => {
    const validator = numeric('A');
    expect(await validator('123')).to.be.undefined;
    expect(await validator('')).to.be.undefined;
    expect(await validator('0')).to.be.undefined;
    expect(await validator('0x11')).to.be.undefined;
    expect(await validator('0b11')).to.be.undefined;
    expect(await validator('0o11')).to.be.undefined;
    expect(await validator('1.0')).to.be.undefined;
    expect(await validator('1e-2')).to.be.undefined;
    expect(await validator('1.999e2')).to.be.undefined;
    expect(await validator(undefined!)).to.be.undefined;
  });

  it('should return bundle with {VALUE} for invalid input', async (): Bluebird<void> => {
    const validator = numeric('A');
    expect(await validator('blah')).to.deep.equal({ data: { VALUE: 'blah' }, key: 'A' });
  });

});
