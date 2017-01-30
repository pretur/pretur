import AbstractType from './AbstractType';

export default class DoubleType extends AbstractType {
  public static is(obj: AbstractType): obj is DoubleType {
    return obj instanceof DoubleType;
  }

  public static create(): DoubleType {
    return new DoubleType();
  }
}
