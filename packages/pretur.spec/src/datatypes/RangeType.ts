import AbstractType from './AbstractType';
import DateType from './DateType';
import IntegerType from './IntegerType';
import DoubleType from './DoubleType';

export default class RangeType extends AbstractType {
  public readonly subtype: AbstractType;

  public static is(obj: any): obj is RangeType {
    return obj instanceof RangeType;
  }

  public static create(subType: AbstractType): RangeType {
    return new RangeType(subType);
  }

  constructor(subType: AbstractType) {
    super();

    if (process.env.NODE_ENV !== 'production') {
      if (!(subType instanceof AbstractType)) {
        throw new Error(`${subType} is not a valid subtype for range.`);
      }

      switch (true) {
        case subType instanceof DateType:
        case subType instanceof IntegerType:
        case subType instanceof DoubleType:
          break;
        default:
          throw new Error(`Only Date, Integer and Double are allowed for Range types.` +
            `${subType.toString()} cannot be used in a range.`);
      }

    }

    this.subtype = subType;
  }
}
