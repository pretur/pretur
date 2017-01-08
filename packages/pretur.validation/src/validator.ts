import * as Bluebird from 'bluebird';
import { I18nBundle } from 'pretur.i18n';

export type ValidationError = undefined | I18nBundle | I18nBundle[];

export interface Validator<T> {
  (value: T): Bluebird<ValidationError>;
}

export function combineValidators<T>(...validators: Validator<T>[]): Validator<T> {
  return async function combinedValidator(value: T): Bluebird<ValidationError> {
    let result: I18nBundle[] | undefined = undefined;
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
