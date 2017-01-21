import { I18nBundle } from 'pretur.i18n';
import { ValidationError } from 'pretur.validation';

export interface ResultBase {
  cancelled: boolean;
  ok: boolean;
  status: number;
  statusText: string;
  warnings?: I18nBundle[];
  errors?: I18nBundle[];
}

export interface MutateResultBase extends ResultBase {
  transactionFailed: boolean;
  validationError: ValidationError;
}

export interface SelectResult<T> extends ResultBase {
  type: 'select';
  data?: T[];
  count?: number;
}

export interface ValidateResult extends ResultBase {
  type: 'validate';
  name: string;
  validationError: ValidationError;
}

export interface OperateResult<T> extends ResultBase {
  type: 'operate';
  cancelled: boolean;
  name: string;
  data?: T;
}

export interface InsertMutateResult<T> extends MutateResultBase {
  type: 'insert';
  generatedId?: Partial<T>;
}

export interface UpdateMutateResult extends MutateResultBase {
  type: 'update';
}

export interface RemoveMutateResult extends MutateResultBase {
  type: 'remove';
}

export type MutateResult<T> =
  | InsertMutateResult<T>
  | UpdateMutateResult
  | RemoveMutateResult;

export type Result =
  | SelectResult<any>
  | OperateResult<any>
  | MutateResult<any>
  | ValidateResult;
