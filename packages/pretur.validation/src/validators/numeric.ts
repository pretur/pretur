import { I18nBundle } from 'pretur.i18n';

export interface NumericBundleData {
  VALUE: string;
}

export type NumericError<K extends string> = undefined | I18nBundle<K, NumericBundleData>;

export function numeric<K extends string>(key: K) {
  return async function numericValidator(str: string): Promise<NumericError<K>> {
    if (!str) {
      return;
    }

    const value = Number(str);

    if (isNaN(value)) {
      return { key, data: { VALUE: str } };
    }

    return;
  };
}
