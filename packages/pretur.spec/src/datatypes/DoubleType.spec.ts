import { expect } from 'chai';
import DoubleType from './DoubleType';

describe('DoubleType', () => {

  it('should correctly instantiate and identify a double datatype', () => {
    const d = DoubleType.create();
    expect(d.typeName).to.be.equals('number');
    expect(DoubleType.is(d)).to.be.true;
  });

});
