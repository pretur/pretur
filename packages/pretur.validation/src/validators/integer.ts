import {Validator} from '../validator';

export function integer(key: string): Validator<number> {
  return function integerValidator(num: number) {

    if (typeof num !== 'number' || !isFinite(num) || Math.floor(num) !== num) {
      return { key, data: { VALUE: num } };
    }

    return null;
  };
}
