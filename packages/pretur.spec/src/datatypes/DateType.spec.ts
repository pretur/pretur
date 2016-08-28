/// <reference types="mocha" />

import { expect } from 'chai';
import DateType from './DateType';

describe('DateType', () => {

  it('should correctly instantiate and identify a date datatype', () => {
    const d = DateType.create();
    expect(d.typeName).to.be.equals('Date');
    expect(DateType.is(d)).to.be.true;
  });

  it('should properly override the typeName', () => {
    const d = DateType.create('string');
    expect(d.typeName).to.be.equals('string');
  });

});
