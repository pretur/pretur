import { Bundle } from 'pretur.i18n';
import * as IBANValidator from 'iban';

export interface IbanBundleData {
  VALUE: string;
}

export type IbanError<K extends string> = undefined | Bundle<K, IbanBundleData>;

export function iban<K extends string>(key: K) {
  return async function ibanValidator(str: string) {
    if (!str) {
      return;
    }

    if (!IBANValidator.isValid(str)) {
      return { key, data: { VALUE: str } };
    }

    return;
  };
}
