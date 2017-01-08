import * as Bluebird from 'bluebird';
import { Validator, ValidationError } from '../validator';

export function integer(key: string): Validator<number> {
  return async function integerValidator(num: number): Bluebird<ValidationError> {

    if (typeof num !== 'number' || !isFinite(num) || Math.floor(num) !== num) {
      return { key, data: { VALUE: num } };
    }

    return;
  };
}
