import { ValueValidator } from '../validator';

export function exactLength(
  key: string,
  length: number,
  acceptEmpty = false,
): ValueValidator<string> {
  return function exactLengthValidator(str: string) {

    if (acceptEmpty && !str) {
      return null;
    }

    if (typeof str !== 'string' || str.length !== length) {
      return { key, data: { ACCEPT_EMPTY: acceptEmpty, EXPECTED_LENGTH: length, VALUE: str } };
    }

    return null;
  };
}
