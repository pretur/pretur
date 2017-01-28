import AbstractType from './AbstractType';

export default class ObjectType extends AbstractType {
  public static is(obj: any): obj is ObjectType {
    return obj instanceof ObjectType;
  }

  public static create(): ObjectType {
    return new ObjectType();
  }
}
