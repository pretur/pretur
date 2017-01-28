import AbstractType from './AbstractType';

export default class IntegerType extends AbstractType {
  public static is(obj: any): obj is IntegerType {
    return obj instanceof IntegerType;
  }

  public static create(): IntegerType {
    return new IntegerType();
  }
}
