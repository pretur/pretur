import * as Bluebird from 'bluebird';
import { ValueValidator, ValueValidationError } from '../validator';

export function minimumLength(
  key: string,
  minimumLength: number,
  acceptEmpty = false
): ValueValidator<string> {
  return async function minimumLengthValidator(str: string): Bluebird<ValueValidationError> {

    if (acceptEmpty && !str) {
      return null;
    }

    if (typeof str !== 'string' || str.length < minimumLength) {
      return {
        key,
        data: {
          ACCEPT_EMPTY: acceptEmpty,
          MINIMUM_LENGTH: minimumLength,
          VALUE: str,
        },
      };
    }

    return null;
  };
}
