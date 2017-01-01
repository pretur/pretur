import * as Bluebird from 'bluebird';
import { ValueValidator, ValueValidationError } from '../validator';

export function nonEmptyString(key: string): ValueValidator<string> {
  return async function nonEmptyStringValidator(str: string): Bluebird<ValueValidationError> {
    if (!str || !/\S/.test(str)) {
      return {
        key,
        data: { VALUE: str },
      };
    }
    return null;
  };
}
