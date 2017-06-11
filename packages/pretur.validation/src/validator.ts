import { Bundle } from 'pretur.i18n';

export type ValidationError<B extends Bundle = Bundle> = undefined | B | B[];

export interface Validator<T, B extends Bundle = Bundle> {
  (value: T): Promise<ValidationError<B>>;
}

export function combineValidators<T, B extends Bundle = Bundle>(
  ...validators: Validator<T, B>[],
): Validator<T, B> {
  return async function combinedValidator(value: T) {
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
