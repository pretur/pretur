import AbstractType from './AbstractType';

export default class DateType extends AbstractType {
  public static is(obj: any): obj is DateType {
    return obj instanceof DateType;
  }

  public static create(): DateType {
    return new DateType();
  }
}
