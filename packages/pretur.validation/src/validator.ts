import { I18nBundle } from 'pretur.i18n';

export interface ValidatorDescriptor {
  name: string;
  key: string;
  params: any[];
}

export interface Validator<T> {
  (value: T): I18nBundle;
}

export function compose<T>(...validators: Validator<T>[]): Validator<T> {
  return function compositeValidator(value: T): I18nBundle {
    for (let i = 0; i < validators.length; i++) {
      if (typeof validators[i] === 'function') {
        const result = validators[i](value);
        if (result !== null) {
          return result;
        }
      }
    }
    return null;
  };
}
