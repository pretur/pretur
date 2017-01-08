import * as Bluebird from 'bluebird';
import { Validator, ValidationError } from '../validator';
import * as IBANValidator from 'iban';

export function iban(key: string): Validator<string> {
  return async function ibanValidator(str: string): Bluebird<ValidationError> {
    if (!str) {
      return;
    }

    if (!IBANValidator.isValid(str)) {
      return { key, data: { VALUE: str } };
    }

    return;
  };
}
