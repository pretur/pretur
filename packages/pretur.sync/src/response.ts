import { I18nBundle } from 'pretur.i18n';
import { ValidationError } from 'pretur.validation';

export interface ResponseBase {
  requestId: number;
}

export interface SelectResponse<T> extends ResponseBase {
  type: 'select';
  data?: T[];
  count?: number;
  warnings?: I18nBundle[];
  errors?: I18nBundle[];
}

export interface RefreshResponse<T> extends ResponseBase {
  type: 'refresh';
  data?: T[];
  count?: number;
  warnings?: I18nBundle[];
  errors?: I18nBundle[];
}

export interface OperateResponse<T> extends ResponseBase {
  type: 'operate';
  name: string;
  data?: T;
  warnings?: I18nBundle[];
  errors?: I18nBundle[];
}

export interface InsertResponse<T> extends ResponseBase {
  type: 'insert';
  transactionFailed: boolean;
  generatedId?: number | string | Partial<T>;
  validationError: ValidationError;
  warnings?: I18nBundle[];
  errors?: I18nBundle[];
}

export interface UpdateResponse extends ResponseBase {
  type: 'update';
  transactionFailed: boolean;
  validationError: ValidationError;
  warnings?: I18nBundle[];
  errors?: I18nBundle[];
}

export interface RemoveResponse extends ResponseBase {
  type: 'remove';
  transactionFailed: boolean;
  validationError: ValidationError;
  warnings?: I18nBundle[];
  errors?: I18nBundle[];
}

export interface ValidateResponse extends ResponseBase {
  type: 'validate';
  name: string;
  validationError: ValidationError;
  warnings?: I18nBundle[];
  errors?: I18nBundle[];
}

export type Response =
  | SelectResponse<any>
  | RefreshResponse<any>
  | OperateResponse<any>
  | InsertResponse<any>
  | UpdateResponse
  | RemoveResponse
  | ValidateResponse;
