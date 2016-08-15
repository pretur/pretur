import { expect } from 'chai';
import ObjectType from './ObjectType';

describe('ObjectType', () => {

  it('should correctly instantiate and identify an object datatype', () => {
    const o = ObjectType.create();
    expect(o.typeName).to.be.equals('Object');
    expect(ObjectType.is(o)).to.be.true;
  });

  it('should properly override the typeName', () => {
    const d = ObjectType.create('any');
    expect(d.typeName).to.be.equals('any');
  });

});
