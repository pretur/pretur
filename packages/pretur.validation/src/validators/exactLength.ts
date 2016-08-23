import { Validator } from '../validator';

export function exactLength(key: string, length: number, acceptEmpty = false): Validator<string> {
  return function exactLengthValidator(str: string) {

    if (acceptEmpty && !str) {
      return null;
    }

    if (typeof str !== 'string' || str.length !== length) {
      return { key, data: { VALUE: str, EXPECTED_LENGTH: length, ACCEPT_EMPTY: acceptEmpty } };
    }

    return null;
  };
}
