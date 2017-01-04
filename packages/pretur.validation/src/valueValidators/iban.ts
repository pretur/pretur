import * as Bluebird from 'bluebird';
import { ValueValidator, ValueValidationError } from '../validator';
import * as IBANValidator from 'iban';

export function iban(key: string): ValueValidator<string> {
  return async function ibanValidator(str: string): Bluebird<ValueValidationError> {
    if (!str) {
      return;
    }

    if (!IBANValidator.isValid(str)) {
      return { key, data: { VALUE: str } };
    }

    return;
  };
}
