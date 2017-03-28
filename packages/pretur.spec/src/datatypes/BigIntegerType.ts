import AbstractType from './AbstractType';

export default class BigIntegerType extends AbstractType {
  public static is(obj: AbstractType): obj is BigIntegerType {
    return obj instanceof BigIntegerType;
  }

  public static create(): BigIntegerType {
    return new BigIntegerType();
  }
}
