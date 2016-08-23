import AbstractType from './AbstractType';

export default class DateType extends AbstractType {
  private dateTypeName: string;

  public get typeName(): string {
    return this.dateTypeName;
  }

  public static is(obj: any): obj is DateType {
    return obj instanceof DateType;
  }

  public static create(typeName?: string): DateType {
    return new DateType(typeName);
  }

  private constructor(typeName = 'Date') {
    super();
    this.dateTypeName = typeName;
  }
}
