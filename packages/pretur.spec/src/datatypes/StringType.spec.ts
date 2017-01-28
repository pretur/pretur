/// <reference types="mocha" />

import { expect } from 'chai';
import StringType from './StringType';

describe('StringType', () => {

  it('should correctly instantiate and identify a string datatype', () => {
    const s = StringType.create();
    expect(StringType.is(s)).to.be.true;
  });

});
