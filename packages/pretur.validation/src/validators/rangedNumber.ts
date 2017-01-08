import * as Bluebird from 'bluebird';
import { Validator, ValidationError } from '../validator';

export function rangedNumber(
  key: string,
  from = Number.NEGATIVE_INFINITY,
  to = Number.POSITIVE_INFINITY,
  inclusiveFrom = true,
  inclusiveTo = true): Validator<number> {
  return async function rangedNumberValidator(num: number): Bluebird<ValidationError> {
    if (
      typeof num !== 'number' ||
      isNaN(num) ||
      (inclusiveFrom ? num < from : num <= from) ||
      (inclusiveTo ? num > to : num >= to)
    ) {
      return {
        key,
        data: {
          FROM: from,
          INCLUSIVE_FROM: inclusiveFrom,
          INCLUSIVE_TO: inclusiveTo,
          TO: to,
          VALUE: num,
        },
      };
    }

    return;
  };
}
