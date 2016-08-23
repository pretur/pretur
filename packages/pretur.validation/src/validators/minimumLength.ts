import { Validator } from '../validator';

export function minimumLength(
  key: string,
  minimumLength: number,
  acceptEmpty = false
): Validator<string> {
  return function minimumLengthValidator(str: string) {

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
