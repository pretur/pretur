import AbstractType from './AbstractType';
import EnumType, { EnumValue } from './EnumType';
import BooleanType from './BooleanType';
import DoubleType from './DoubleType';
import IntegerType from './IntegerType';
import StringType from './StringType';
import ObjectType from './ObjectType';
import DateType from './DateType';
import RangeType from './RangeType';

export {
  AbstractType,
  EnumValue,
  EnumType,
  BooleanType,
  DoubleType,
  IntegerType,
  StringType,
  ObjectType,
  DateType,
  RangeType,
};

export namespace DataTypes {
  export const ENUM = EnumType.create;
  export const BOOLEAN = BooleanType.create;
  export const DOUBLE = DoubleType.create;
  export const INTEGER = IntegerType.create;
  export const STRING = StringType.create;
  export const OBJECT = ObjectType.create;
  export const DATE = DateType.create;
  export const RANGE = RangeType.create;
}
