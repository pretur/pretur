import * as Bluebird from 'bluebird';
import { Validator, ValidationError } from '../validator';

export function positive(key: string): Validator<number> {
  return async function positiveValidator(num: number): Bluebird<ValidationError> {
    if (typeof num !== 'number' || isNaN(num) || num <= 0) {
      return {
        key,
        data: { VALUE: num },
      };
    }
    return;
  };
}
