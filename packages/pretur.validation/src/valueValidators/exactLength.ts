import * as Bluebird from 'bluebird';
import { ValueValidator, ValueValidationError } from '../validator';

export function exactLength(
  key: string,
  length: number,
  acceptEmpty = false,
): ValueValidator<string> {
  return async function exactLengthValidator(str: string): Bluebird<ValueValidationError> {

    if (acceptEmpty && !str) {
      return;
    }

    if (typeof str !== 'string' || str.length !== length) {
      return { key, data: { ACCEPT_EMPTY: acceptEmpty, EXPECTED_LENGTH: length, VALUE: str } };
    }

    return;
  };
}
