/// <reference types="mocha" />

import { expect } from 'chai';
import BooleanType from './BooleanType';

describe('BooleanType', () => {

  it('should correctly instantiate and identify a boolean datatype', () => {
    const b = BooleanType.create();
    expect(BooleanType.is(b)).to.be.true;
  });

});
