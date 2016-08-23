import AbstractType from './AbstractType';
import DateType from './DateType';
import IntegerType from './IntegerType';
import DoubleType from './DoubleType';

export default class RangeType extends AbstractType {
  private rangeTypeName: string;
  private rangeSubtype: AbstractType;

  public get typeName(): string {
    return this.rangeTypeName;
  }

  public get subType(): AbstractType {
    return this.rangeSubtype;
  }

  public static is(obj: any): obj is RangeType {
    return obj instanceof RangeType;
  }

  public static create(subType: AbstractType, typeName?: string): RangeType {
    return new RangeType(subType, typeName);
  }

  private constructor(subType: AbstractType, typeName?: string) {
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
            `${subType.typeName} cannot be used in a range.`);
      }

    }

    const defaultTypeName = `[${subType.typeName}, ${subType.typeName}]`;

    this.rangeSubtype = subType;
    this.rangeTypeName = typeName || defaultTypeName;
  }
}
