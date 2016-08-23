import AbstractType from './AbstractType';

export default class ObjectType extends AbstractType {
  private objectTypeName: string;

  public get typeName(): string {
    return this.objectTypeName;
  }

  public static is(obj: any): obj is ObjectType {
    return obj instanceof ObjectType;
  }

  public static create(typeName?: string): ObjectType {
    return new ObjectType(typeName);
  }

  private constructor(typeName = 'Object') {
    super();
    this.objectTypeName = typeName;
  }
}
