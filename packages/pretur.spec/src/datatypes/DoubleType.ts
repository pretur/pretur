import AbstractType from './AbstractType';

export default class DoubleType extends AbstractType {
  public static is(obj: any): obj is DoubleType {
    return obj instanceof DoubleType;
  }

  public static create(): DoubleType {
    return new DoubleType();
  }
}
