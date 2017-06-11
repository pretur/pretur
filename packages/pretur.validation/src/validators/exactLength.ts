import { Bundle } from 'pretur.i18n';

export interface ExactLengthBundleData {
  ACCEPT_EMPTY: boolean;
  EXPECTED_LENGTH: number;
  VALUE: string;
}

export type ExactLengthError<K extends string> = undefined | Bundle<K, ExactLengthBundleData>;

export function exactLength<K extends string>(key: K, length: number, acceptEmpty = false) {
  return async function exactLengthValidator(str: string): Promise<ExactLengthError<K>> {

    if (acceptEmpty && !str) {
      return;
    }

    if (typeof str !== 'string' || str.length !== length) {
      return { key, data: { ACCEPT_EMPTY: acceptEmpty, EXPECTED_LENGTH: length, VALUE: str } };
    }

    return;
  };
}
