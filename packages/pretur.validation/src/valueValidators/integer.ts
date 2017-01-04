import * as Bluebird from 'bluebird';
import { ValueValidator, ValueValidationError } from '../validator';

export function integer(key: string): ValueValidator<number> {
  return async function integerValidator(num: number): Bluebird<ValueValidationError> {

    if (typeof num !== 'number' || !isFinite(num) || Math.floor(num) !== num) {
      return { key, data: { VALUE: num } };
    }

    return;
  };
}
