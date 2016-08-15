import AbstractType from './AbstractType';

export default class DateType extends AbstractType {
  private _typeName: string;

  public get typeName(): string {
    return this._typeName;
  }

  public static is(obj: any): obj is DateType {
    return obj instanceof DateType;
  }

  public static create(typeName?: string): DateType {
    const newObj = new DateType(typeName);
    return newObj;
  }

  private constructor(typeName = 'Date') {
    super();
    this._typeName = typeName;
  }
}
