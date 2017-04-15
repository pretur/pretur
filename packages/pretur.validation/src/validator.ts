import * as Bluebird from 'bluebird';
import { I18nBundle } from 'pretur.i18n';

export type ValidationError<B extends I18nBundle = I18nBundle> = undefined | B | B[];

export interface Validator<T, B extends I18nBundle = I18nBundle> {
  (value: T): Bluebird<ValidationError<B>>;
}

export function combineValidators<T, B extends I18nBundle = I18nBundle>(
  ...validators: Validator<T, B>[],
): Validator<T, B> {
  return async function combinedValidator(value: T): Bluebird<ValidationError<B>> {
    let result: B[] | undefined = undefined;
    for (const validator of validators) {
      if (typeof validator === 'function') {
        const error = await validator(value);
        if (error) {
          if (!result) {
            result = [];
          }
          if (Array.isArray(error)) {
            result.push(...error);
          } else {
            result.push(error);
          }
        }
      }
    }
    return result;
  };
}
