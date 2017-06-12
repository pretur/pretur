import { Bundle, Formatter } from 'pretur.i18n';
import { Requester, ValidateResult } from 'pretur.sync';

export type ValidationError = undefined | Bundle | Bundle[];

export interface Validator<T> {
  (value: T): Promise<ValidationError>;
}

export interface Validation<T> {
  server: boolean;
  name: string;
  validate(requester: Requester, data: T): Promise<ValidateResult>;
}

export interface ServerOptions<T> {
  catchEarly?: Validator<T>;
}

export function combineValidators<T>(...validators: Validator<T>[]): Validator<T> {
  return async function combinedValidator(value: T) {
    let result: Bundle[] | undefined = undefined;
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

export function formatValidationError(
  formatter: Formatter<any>,
  error: ValidationError,
  join = ', ',
): string {
  if (!error) {
    return '';
  }

  if (!Array.isArray(error)) {
    return formatter(error);
  }

  return error.map(bundle => formatter(bundle)).filter(Boolean).join(join);
}

export function buildValidation<T>(
  name: string,
  server: true,
  options?: ServerOptions<T>,
): Validation<T>;
export function buildValidation<T>(
  name: string,
  server: false,
  validate: Validator<T>,
): Validation<T>;
export function buildValidation<T>(
  name: string,
  server: boolean,
  validate?: Validator<T> | ServerOptions<T>,
): Validation<T> {
  if (server) {
    return {
      name,
      server: true,
      async validate(requester: Requester, data: T) {
        if (validate && typeof validate === 'object' && typeof validate.catchEarly === 'function') {
          const error = await validate.catchEarly(data);
          if (error) {
            return {
              cancelled: false,
              name,
              ok: false,
              status: 0,
              statusText: 'UNKNOWN_ERROR',
              type: 'validate',
              validationError: error,
            };
          }
        }
        return requester.validate(name, data);
      },
    };
  }

  return {
    name,
    server: false,
    async validate(_requester: Requester, data: T) {
      if (!validate || typeof validate !== 'function') {
        return {
          cancelled: false,
          name,
          ok: false,
          status: 0,
          statusText: 'UNKNOWN_ERROR',
          type: 'validate',
          validationError: undefined,
        };
      }

      const error = await validate(data);

      return {
        cancelled: false,
        name,
        ok: false,
        status: 0,
        statusText: 'UNKNOWN_ERROR',
        type: 'validate',
        validationError: error,
      };
    },
  };
}
