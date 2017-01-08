import * as Bluebird from 'bluebird';
import { Validator, ValidationError } from '../validator';

export function numeric(key: string): Validator<string> {
  return async function numericValidator(str: string): Bluebird<ValidationError> {
    if (!str) {
      return;
    }

    const value = Number(str);

    if (isNaN(value)) {
      return { key, data: { VALUE: str } };
    }

    return;
  };
}
