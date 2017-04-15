import * as Bluebird from 'bluebird';
import { I18nBundle } from 'pretur.i18n';
import * as IBANValidator from 'iban';

export interface IbanBundleData {
  VALUE: string;
}

export type IbanError<K extends string> = undefined | I18nBundle<K, IbanBundleData>;

export function iban<K extends string>(key: K) {
  return async function ibanValidator(str: string): Bluebird<IbanError<K>> {
    if (!str) {
      return;
    }

    if (!IBANValidator.isValid(str)) {
      return { key, data: { VALUE: str } };
    }

    return;
  };
}
