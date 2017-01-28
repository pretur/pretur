import AbstractType from './AbstractType';

export default class BooleanType extends AbstractType {
  public static is(obj: any): obj is BooleanType {
    return obj instanceof BooleanType;
  }

  public static create(): BooleanType {
    return new BooleanType();
  }
}
