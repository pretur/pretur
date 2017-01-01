import * as Bluebird from 'bluebird';
import { ValueValidator, ValueValidationError } from '../validator';

export function numeric(key: string): ValueValidator<string> {
  return async function numericValidator(str: string): Bluebird<ValueValidationError> {
    if (!str) {
      return null;
    }

    const value = Number(str);

    if (isNaN(value)) {
      return { key, data: { VALUE: str } };
    }

    return null;
  };
}
