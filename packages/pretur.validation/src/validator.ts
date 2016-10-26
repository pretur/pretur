import { I18nBundle } from 'pretur.i18n';

export type PropertyPath = number | string | (number | string)[];

export type ValueValidationError = null | I18nBundle | I18nBundle[];
export interface ArrayValidationError extends Array<ValidationError> { }
export interface ObjectValidationError {
  [prop: string]: ValidationError;
}

export type ValidationError = ValueValidationError | ArrayValidationError | ObjectValidationError;

function getNestedError(error: ValidationError, path: PropertyPath): ValidationError {
  if (!error) {
    return null;
  }

  if (process.env.NODE_ENV !== 'production' && (path === null || path === undefined)) {
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
      return null;
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
    } else if (result !== null) {
      validateBundle(<I18nBundle>result);
    }
  }

  return <ValueValidationError>result;
}

export interface Validator<T> {
  (value: T): ValidationError;
}

export interface ValueValidator<T> {
  (value: T): ValueValidationError;
}

export interface PropValidator<T> {
  (value: T, prop: string, obj: any): ValidationError;
}

export interface DeepValidatorMap {
  [prop: string]: PropValidator<any>;
}

export function deepValidator<T>(map: DeepValidatorMap): Validator<T>;
export function deepValidator<T, U>(props: PropValidator<U>): Validator<T>;
export function deepValidator<T, U>(self: Validator<T>, props: PropValidator<U>): Validator<T>;
export function deepValidator<T, U>(self: Validator<T>, map: DeepValidatorMap): Validator<T>;
export function deepValidator<T, U>(
  self: Validator<T>,
  props: PropValidator<U>,
  map: DeepValidatorMap,
): Validator<T>;
export function deepValidator<T, U>(
  selfOrPropOrMap?: Validator<T> | PropValidator<U> | DeepValidatorMap,
  propOrMap?: PropValidator<U> | DeepValidatorMap,
  lastMap?: DeepValidatorMap,
): Validator<T> {
  let self: Validator<T> | null = null;
  let prop: PropValidator<U> | null = null;
  let map: DeepValidatorMap | null = null;

  if (selfOrPropOrMap && typeof selfOrPropOrMap === 'object') {
    map = selfOrPropOrMap;
  } else if (typeof selfOrPropOrMap === 'function') {

    if (propOrMap === undefined && lastMap === undefined) {
      prop = <PropValidator<U>>selfOrPropOrMap;
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

  return function deepValidator(value: T): ValidationError {
    if (self) {
      const error = self(value);
      if (error) {
        return error;
      }
    }

    if (value) {
      let result: ObjectValidationError | null = null;
      const mapKeys = map ? Object.keys(map) : null;

      if (mapKeys) {
        mapKeys.forEach(key => {
          const error = map![key]((<any>value)[key], key, value);
          if (error) {
            if (!result) {
              result = {};
            }
            result[key] = error;
          }
        });
      }

      if (prop) {
        Object.keys(value).forEach(key => {
          if (mapKeys && mapKeys.indexOf(key) !== -1) {
            return;
          }

          const error = prop!((<any>value)[key], key, value);
          if (error) {
            if (!result) {
              result = {};
            }
            result[key] = error;
          }
        });
      }

      return result;
    }

    return null;
  };

}

export function combine<T>(...validators: ValueValidator<T>[]): ValueValidator<T> {
  return function combinedValidator(value: T): ValueValidationError {
    let result: I18nBundle[] | null = null;
    for (let i = 0; i < validators.length; i++) {
      if (typeof validators[i] === 'function') {
        const error = validators[i](value);
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
