import AbstractType from './AbstractType';

export default class DoubleType extends AbstractType {
  public get typeName(): string {
    return 'number';
  }

  public static is(obj: any): obj is DoubleType {
    return obj instanceof DoubleType;
  }

  public static create(): DoubleType {
    return new DoubleType();
  }

  private constructor() {
    super();
  }
}
