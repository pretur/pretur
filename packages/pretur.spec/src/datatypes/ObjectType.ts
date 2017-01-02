import AbstractType from './AbstractType';

export default class ObjectType extends AbstractType {
  private _typeName: string;

  public get typeName(): string {
    return this._typeName;
  }

  public static is(obj: any): obj is ObjectType {
    return obj instanceof ObjectType;
  }

  public static create(typeName?: string): ObjectType {
    return new ObjectType(typeName);
  }

  private constructor(typeName = 'Object') {
    super();
    this._typeName = typeName;
  }
}
