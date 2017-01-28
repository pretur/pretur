/// <reference types="mocha" />

import { expect } from 'chai';
import ObjectType from './ObjectType';

describe('ObjectType', () => {

  it('should correctly instantiate and identify an object datatype', () => {
    const o = ObjectType.create();
    expect(ObjectType.is(o)).to.be.true;
  });

});
