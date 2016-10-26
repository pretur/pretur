import { ValueValidator } from '../validator';

export function numeric(key: string): ValueValidator<string> {
  return function numericValidator(str: string) {
    if (!str) {
      return null;
    }

    const value = Number(str);

    if (isNaN(value)) {
      return { key, data: { VALUE: str } };
    }

    return null;
  };
}
