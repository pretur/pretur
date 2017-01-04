import * as Bluebird from 'bluebird';
import { I18nBundle } from 'pretur.i18n';

export type PropertyPath = number | string | (number | string)[];

export type ValueValidationError = undefined | I18nBundle | I18nBundle[];
export interface ArrayValidationError extends Array<ValidationError> { }
export interface ObjectValidationError {
  [prop: string]: ValidationError;
}

export type ValidationError = ValueValidationError | ArrayValidationError | ObjectValidationError;

function getNestedError(error: ValidationError, path: PropertyPath): ValidationError {
  if (!error) {
    return;
  }

  if (process.env.NODE_ENV !== 'production' && path === undefined) {
    throw new Error(`path must be provided`);
  }

  if (typeof path === 'number' || typeof path === 'string') {
    return (<any>error)[path];
  }

  if (process.env.NODE_ENV !== 'production' && !Array.isArray(path)) {
    throw new Error(`path ${path} is invalid.`);
  }

  let currentValue = error;
  for (let i = 0; i < path.length; i++) {
    currentValue = (<any>currentValue)[path[i]];
    if (!currentValue) {
      return;
    }
  }

  return currentValue;
}

export function getError(error: ValidationError, path: PropertyPath): ValueValidationError {
  const result = getNestedError(error, path);

  if (process.env.NODE_ENV !== 'production') {
    const validateBundle = (bundle: I18nBundle) => {
      if (!bundle || typeof bundle.key !== 'string' || Object.keys(bundle).length > 2) {
        throw new Error(`Validation error is structured incorrectly:` +
          `\n\n  structure: ${JSON.stringify(error)}` +
          `\n\n  path: ${JSON.stringify(path)}` +
          `\n\n  result: ${JSON.stringify(result)}`);
      }
    };

    if (Array.isArray(result)) {
      if (result.length === 0) {
        validateBundle(<any>{});
      }
      (<any[]>result).forEach(validateBundle);
    } else if (result) {
      validateBundle(<I18nBundle>result);
    }
  }

  return <ValueValidationError>result;
}

export interface Validator<T> {
  (value: T): Bluebird<ValidationError>;
}

export interface ValueValidator<T> {
  (value: T): Bluebird<ValueValidationError>;
}

export interface PropValidator<T, K extends keyof T> {
  (value: T[K], key: K, obj: T): Bluebird<ValidationError>;
}

export type DeepValidatorMap<T> = {
  [P in keyof T]?: PropValidator<T, P>;
};

export function deepValidator<T>(
  self: Validator<T>,
  props: PropValidator<T, keyof T>,
  map: DeepValidatorMap<T>,
): Validator<T>;
export function deepValidator<T>(
  self: Validator<T>,
  props: PropValidator<T, keyof T>,
): Validator<T>;
export function deepValidator<T>(self: Validator<T>, map: DeepValidatorMap<T>): Validator<T>;
export function deepValidator<T>(props: PropValidator<T, keyof T>): Validator<T>;
export function deepValidator<T>(map: DeepValidatorMap<T>): Validator<T>;
export function deepValidator<T>(
  selfOrPropOrMap?: Validator<T> | PropValidator<T, keyof T> | DeepValidatorMap<T>,
  propOrMap?: PropValidator<T, keyof T> | DeepValidatorMap<T>,
  lastMap?: DeepValidatorMap<T>,
): Validator<T> {
  let self: Validator<T> | undefined = undefined;
  let prop: PropValidator<T, keyof T> | undefined = undefined;
  let map: DeepValidatorMap<T> | undefined = undefined;

  if (selfOrPropOrMap && typeof selfOrPropOrMap === 'object') {
    map = selfOrPropOrMap;
  } else if (typeof selfOrPropOrMap === 'function') {

    if (propOrMap === undefined && lastMap === undefined) {
      prop = <PropValidator<T, keyof T>>selfOrPropOrMap;
    } else if (propOrMap && typeof propOrMap === 'object') {
      self = <Validator<T>>selfOrPropOrMap;
      map = propOrMap;
    } else if (typeof propOrMap === 'function') {
      self = <Validator<T>>selfOrPropOrMap;
      prop = propOrMap;
      if (lastMap && typeof lastMap === 'object') {
        map = lastMap;
      }
    }

  }

  return async function deepValidator(value: T): Bluebird<ValidationError> {
    if (self) {
      const error = await self(value);
      if (error) {
        return error;
      }
    }

    if (value) {
      let result: ObjectValidationError | undefined = undefined;

      if (map) {
        for (const mapKey of Object.keys(map)) {
          const key = <keyof T>mapKey;
          const validator = map[key];

          if (validator) {
            const error = await validator(value[key], key, value);
            if (error) {
              if (!result) {
                result = {};
              }
              result[key] = error;
            }
          }
        }
      }

      if (prop) {
        const mapKeys = map && Object.keys(map);

        for (const valueKey of Object.keys(value)) {
          const key = <keyof T>valueKey;

          if (mapKeys && mapKeys.indexOf(key) !== -1) {
            continue;
          }

          const error = await prop(value[key], key, value);
          if (error) {
            if (!result) {
              result = {};
            }
            result[key] = error;
          }
        }
      }

      return result;
    }

    return;
  };

}

export function combineValueValidator<T>(...validators: ValueValidator<T>[]): ValueValidator<T> {
  return async function combinedValidator(value: T): Bluebird<ValueValidationError> {
    let result: I18nBundle[] | undefined = undefined;
    for (const validator of validators) {
      if (typeof validator === 'function') {
        const error = await validator(value);
        if (error) {
          if (!result) {
            result = [];
          }
          if (Array.isArray(error)) {
            result.push(...error);
          } else {
            result.push(error);
          }
        }
      }
    }
    return result;
  };
}
