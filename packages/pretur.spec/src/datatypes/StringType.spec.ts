/// <reference types="mocha" />

import { expect } from 'chai';
import StringType from './StringType';

describe('StringType', () => {

  it('should correctly instantiate and identify a string datatype', () => {
    const s = StringType.create();
    expect(s.typeName).to.be.equals('string');
    expect(StringType.is(s)).to.be.true;
  });

});
