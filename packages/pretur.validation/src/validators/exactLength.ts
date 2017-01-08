import * as Bluebird from 'bluebird';
import { Validator, ValidationError } from '../validator';

export function exactLength(
  key: string,
  length: number,
  acceptEmpty = false,
): Validator<string> {
  return async function exactLengthValidator(str: string): Bluebird<ValidationError> {

    if (acceptEmpty && !str) {
      return;
    }

    if (typeof str !== 'string' || str.length !== length) {
      return { key, data: { ACCEPT_EMPTY: acceptEmpty, EXPECTED_LENGTH: length, VALUE: str } };
    }

    return;
  };
}
