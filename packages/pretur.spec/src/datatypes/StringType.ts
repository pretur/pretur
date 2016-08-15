import AbstractType from './AbstractType';

export default class StringType extends AbstractType {
  public get typeName(): string {
    return 'string';
  }

  public static is(obj: any): obj is StringType {
    return obj instanceof StringType;
  }

  public static create(): StringType {
    return new StringType();
  }

  private constructor() {
    super();
  }
}
