import { Bundle } from 'pretur.i18n';

export interface RangedNumberBundleData {
  FROM: number;
  INCLUSIVE_FROM: boolean;
  INCLUSIVE_TO: boolean;
  TO: number;
  VALUE: number;
}

export type RangedNumberError<K extends string> = undefined | Bundle<K, RangedNumberBundleData>;

export function rangedNumber<K extends string>(
  key: K,
  from = Number.NEGATIVE_INFINITY,
  to = Number.POSITIVE_INFINITY,
  inclusiveFrom = true,
  inclusiveTo = true,
) {
  return async function rangedNumberValidator(num: number): Promise<RangedNumberError<K>> {
    if (
      typeof num !== 'number' ||
      isNaN(num) ||
      (inclusiveFrom ? num < from : num <= from) ||
      (inclusiveTo ? num > to : num >= to)
    ) {
      return {
        data: {
          FROM: from,
          INCLUSIVE_FROM: inclusiveFrom,
          INCLUSIVE_TO: inclusiveTo,
          TO: to,
          VALUE: num,
        },
        key,
      };
    }

    return;
  };
}
