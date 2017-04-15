import * as Bluebird from 'bluebird';
import { I18nBundle } from 'pretur.i18n';

export interface MinimumLengthBundleData {
  ACCEPT_EMPTY: boolean;
  MINIMUM_LENGTH: number;
  VALUE: string;
}

export type MinimumLengthError<K extends string>
  = undefined | I18nBundle<K, MinimumLengthBundleData>;

export function minimumLength<K extends string>(key: K, minLength: number, acceptEmpty = false) {
  return async function minimumLengthValidator(str: string): Bluebird<MinimumLengthError<K>> {

    if (acceptEmpty && !str) {
      return;
    }

    if (typeof str !== 'string' || str.length < minLength) {
      return {
        key,
        data: {
          ACCEPT_EMPTY: acceptEmpty,
          MINIMUM_LENGTH: minLength,
          VALUE: str,
        },
      };
    }

    return;
  };
}
