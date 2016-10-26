import { ValueValidator } from '../validator';

export function nonEmptyString(key: string): ValueValidator<string> {
  return function nonEmptyStringValidator(str: string) {
    if (!str || !/\S/.test(str)) {
      return {
        key,
        data: { VALUE: str },
      };
    }
    return null;
  };
}
