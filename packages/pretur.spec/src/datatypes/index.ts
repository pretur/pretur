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
  ENUM: EnumType.create,
  BOOLEAN: BooleanType.create,
  DOUBLE: DoubleType.create,
  INTEGER: IntegerType.create,
  STRING: StringType.create,
  OBJECT: ObjectType.create,
  DATE: DateType.create,
  RANGE: RangeType.create,
};
