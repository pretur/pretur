import { ValueValidator } from '../validator';
import * as IBANValidator from 'iban';

export function iban(key: string): ValueValidator<string> {
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
