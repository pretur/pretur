import { SpecType, Model } from 'pretur.spec';
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
  type: 'mutate';
  transactionFailed: boolean;
  validationError: ValidationError;
}

export interface SelectResult<T extends SpecType> extends ResultBase {
  type: 'select';
  data?: Model<T>[];
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

export interface InsertMutateResult<T extends SpecType> extends MutateResultBase {
  action: 'insert';
  generatedId?: Partial<T['fields']>;
}

export interface UpdateMutateResult extends MutateResultBase {
  action: 'update';
}

export interface RemoveMutateResult extends MutateResultBase {
  action: 'remove';
}

export type MutateResult<T extends SpecType> =
  | InsertMutateResult<T>
  | UpdateMutateResult
  | RemoveMutateResult;

export type Result =
  | SelectResult<any>
  | OperateResult<any>
  | MutateResult<any>
  | ValidateResult;
