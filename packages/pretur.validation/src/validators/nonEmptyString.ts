import { Bundle } from 'pretur.i18n';

export interface NonEmptyStringBundleData {
  VALUE: string;
}

export type NonEmptyStringError<K extends string>
  = undefined | Bundle<K, NonEmptyStringBundleData>;

export function nonEmptyString<K extends string>(key: K) {
  return async function nonEmptyStringValidator(str: string): Promise<NonEmptyStringError<K>> {
    if (!str || !/\S/.test(str)) {
      return { key, data: { VALUE: str } };
    }
    return;
  };
}
