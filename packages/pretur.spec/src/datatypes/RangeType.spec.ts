import { expect } from 'chai';
import RangeType from './RangeType';
import { DataTypes } from './index';

describe('RangeType', () => {

  it('should correctly instantiate and identify a range datatype', () => {
    const d = RangeType.create(DataTypes.DATE());
    expect(d.typeName).to.be.equals('[Date, Date]');
    expect(RangeType.is(d)).to.be.true;
  });

  it('should properly override the typeName', () => {
    const d = RangeType.create(DataTypes.DATE(), 'any[]');
    expect(d.typeName).to.be.equals('any[]');
  });

  it('should throw if subtype is not valid', () => {
    expect(() => RangeType.create(null)).to.throw();
    expect(() => RangeType.create(<any>{})).to.throw();
    expect(() => RangeType.create(<any>true)).to.throw();
    expect(() => RangeType.create(<any>[])).to.throw();
  });

  it('should throw if subtype is not a valid range', () => {
    expect(() => RangeType.create(DataTypes.ENUM('a', [['a', 'A']]))).to.throw();
    expect(() => RangeType.create(DataTypes.BOOLEAN())).to.throw();
    expect(() => RangeType.create(DataTypes.DOUBLE())).not.to.throw();
    expect(() => RangeType.create(DataTypes.INTEGER())).not.to.throw();
    expect(() => RangeType.create(DataTypes.STRING())).to.throw();
    expect(() => RangeType.create(DataTypes.OBJECT())).to.throw();
    expect(() => RangeType.create(DataTypes.DATE())).not.to.throw();
    expect(() => RangeType.create(DataTypes.RANGE(DataTypes.STRING()))).to.throw();
  });

});
