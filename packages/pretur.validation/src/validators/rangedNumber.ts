import {Validator} from '../validator';

export function rangedNumber(
  key: string,
  from = Number.NEGATIVE_INFINITY,
  to = Number.POSITIVE_INFINITY,
  inclusiveFrom = true,
  inclusiveTo = true): Validator<number> {
  return function rangedNumberValidator(num: number) {
    if (
      typeof num !== 'number' ||
      isNaN(num) ||
      (inclusiveFrom ? num < from : num <= from) ||
      (inclusiveTo ? num > to : num >= to)
    ) {
      return {
        key,
        data: {
          VALUE: num,
          FROM: from,
          TO: to,
          INCLUSIVE_FROM: inclusiveFrom,
          INCLUSIVE_TO: inclusiveTo,
        },
      };
    }

    return null;
  };
}
