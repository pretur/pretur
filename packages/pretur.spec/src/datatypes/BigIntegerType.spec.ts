/// <reference types="mocha" />

import { expect } from 'chai';
import BigIntegerType from './BigIntegerType';

describe('BigIntegerType', () => {

  it('should correctly instantiate and identify a big integer datatype', () => {
    const i = BigIntegerType.create();
    expect(BigIntegerType.is(i)).to.be.true;
  });

});
