import { expect } from 'chai';
import IntegerType from './IntegerType';

describe('IntegerType', () => {

  it('should correctly instantiate and identify an integer datatype', () => {
    const i = IntegerType.create();
    expect(i.typeName).to.be.equals('number');
    expect(IntegerType.is(i)).to.be.true;
  });

});
