/// <reference types="mocha" />

import { expect } from 'chai';
import DateType from './DateType';

describe('DateType', () => {

  it('should correctly instantiate and identify a date datatype', () => {
    const d = DateType.create();
    expect(DateType.is(d)).to.be.true;
  });

});
