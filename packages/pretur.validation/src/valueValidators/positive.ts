import * as Bluebird from 'bluebird';
import { ValueValidator, ValueValidationError } from '../validator';

export function positive(key: string): ValueValidator<number> {
  return async function positiveValidator(num: number): Bluebird<ValueValidationError> {
    if (typeof num !== 'number' || isNaN(num) || num <= 0) {
      return {
        key,
        data: { VALUE: num },
      };
    }
    return null;
  };
}
