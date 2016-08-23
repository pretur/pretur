import { Validator } from '../validator';

export function positive(key: string): Validator<number> {
  return function positiveValidator(num: number) {
    if (typeof num !== 'number' || isNaN(num) || num <= 0) {
      return {
        key,
        data: { VALUE: num },
      };
    }
    return null;
  };
}
