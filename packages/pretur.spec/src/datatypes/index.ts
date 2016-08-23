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

export const DataTypes = {
  BOOLEAN: BooleanType.create,
  DATE: DateType.create,
  DOUBLE: DoubleType.create,
  ENUM: EnumType.create,
  INTEGER: IntegerType.create,
  OBJECT: ObjectType.create,
  RANGE: RangeType.create,
  STRING: StringType.create,
};
