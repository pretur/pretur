import { I18nBundle } from 'pretur.i18n';
import { ValidationError } from 'pretur.validation';

export interface ResultBase {
  ok?: boolean;
  status?: number;
  statusText?: string;
}

export interface SelectResult<T> extends ResultBase {
  type: 'select';
  cancelled: boolean;
  data?: T[];
  count?: number;
  warnings?: I18nBundle[];
  errors?: I18nBundle[];
}

export interface RefreshResult<T> extends ResultBase {
  type: 'refresh';
  cancelled: boolean;
  data?: T[];
  count?: number;
  warnings?: I18nBundle[];
  errors?: I18nBundle[];
}

export interface OperateResult<T> extends ResultBase {
  type: 'operate';
  cancelled: boolean;
  name: string;
  data?: T;
  warnings?: I18nBundle[];
  errors?: I18nBundle[];
}

export interface InsertResult<T> extends ResultBase {
  type: 'insert';
  cancelled: boolean;
  transactionFailed: boolean;
  generatedId?: Partial<T>;
  validationError: ValidationError;
  warnings?: I18nBundle[];
  errors?: I18nBundle[];
}

export interface UpdateResult extends ResultBase {
  type: 'update';
  cancelled: boolean;
  transactionFailed: boolean;
  validationError: ValidationError;
  warnings?: I18nBundle[];
  errors?: I18nBundle[];
}

export interface RemoveResult extends ResultBase {
  type: 'remove';
  cancelled: boolean;
  transactionFailed: boolean;
  validationError: ValidationError;
  warnings?: I18nBundle[];
  errors?: I18nBundle[];
}

export interface ValidateResult extends ResultBase {
  type: 'validate';
  name: string;
  cancelled: boolean;
  validationError: ValidationError;
  warnings?: I18nBundle[];
  errors?: I18nBundle[];
}

export type Result =
  | SelectResult<any>
  | RefreshResult<any>
  | OperateResult<any>
  | InsertResult<any>
  | UpdateResult
  | RemoveResult
  | ValidateResult;
