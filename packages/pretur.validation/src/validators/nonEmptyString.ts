import * as Bluebird from 'bluebird';
import { Validator, ValidationError } from '../validator';

export function nonEmptyString(key: string): Validator<string> {
  return async function nonEmptyStringValidator(str: string): Bluebird<ValidationError> {
    if (!str || !/\S/.test(str)) {
      return {
        key,
        data: { VALUE: str },
      };
    }
    return;
  };
}
