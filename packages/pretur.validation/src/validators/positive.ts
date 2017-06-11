import { Bundle } from 'pretur.i18n';

export interface PositiveBundleData {
  VALUE: number;
}

export type PositiveError<K extends string> = undefined | Bundle<K, PositiveBundleData>;

export function positive<K extends string>(key: K) {
  return async function positiveValidator(num: number): Promise<PositiveError<K>> {
    if (typeof num !== 'number' || isNaN(num) || num <= 0) {
      return { key, data: { VALUE: num } };
    }
    return;
  };
}
