import { Bundle } from 'pretur.i18n';

export interface IntegerBundleData {
  VALUE: number;
}

export type IntegerError<K extends string> = undefined | Bundle<K, IntegerBundleData>;

export function integer<K extends string>(key: K) {
  return async function integerValidator(num: number): Promise<IntegerError<K>> {

    if (typeof num !== 'number' || !isFinite(num) || Math.floor(num) !== num) {
      return { key, data: { VALUE: num } };
    }

    return;
  };
}
