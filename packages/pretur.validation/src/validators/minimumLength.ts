import * as Bluebird from 'bluebird';
import { Validator, ValidationError } from '../validator';

export function minimumLength(
  key: string,
  minimumLength: number,
  acceptEmpty = false,
): Validator<string> {
  return async function minimumLengthValidator(str: string): Bluebird<ValidationError> {

    if (acceptEmpty && !str) {
      return;
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

    return;
  };
}
