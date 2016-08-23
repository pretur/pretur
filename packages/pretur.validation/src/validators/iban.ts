import { Validator } from '../validator';
const IBANValidator = require('iban');

export function iban(key: string): Validator<string> {
  return function ibanValidator(str: string) {
    if (!str) {
      return null;
    }

    if (!IBANValidator.isValid(str)) {
      return {
        key,
        data: { VALUE: str },
      };
    }

    return null;
  };
}
