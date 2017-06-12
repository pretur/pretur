import { SpecType, EmptySpec, Model } from 'pretur.spec';
import { Bundle } from 'pretur.i18n';

export interface ResultBase {
  cancelled: boolean;
  ok: boolean;
  status: number;
  statusText: string;
  warnings?: Bundle[];
  errors?: Bundle[];
}

export interface MutateResultBase extends ResultBase {
  type: 'mutate';
  transactionFailed: boolean;
  validationError?: Bundle | Bundle[];
}

export interface SelectResult<T extends SpecType = EmptySpec> extends ResultBase {
  type: 'select';
  data?: Model<T>[];
  count?: number;
}

export interface ValidateResult extends ResultBase {
  type: 'validate';
  name: string;
  validationError?: Bundle | Bundle[];
}

export interface OperateResult<T = any> extends ResultBase {
  type: 'operate';
  cancelled: boolean;
  name: string;
  data?: T;
}

export interface InsertMutateResult<T extends SpecType = EmptySpec> extends MutateResultBase {
  action: 'insert';
  generatedId?: Partial<T['fields']>;
}

export interface UpdateMutateResult extends MutateResultBase {
  action: 'update';
}

export interface RemoveMutateResult extends MutateResultBase {
  action: 'remove';
}

export type MutateResult<T extends SpecType = EmptySpec> =
  | InsertMutateResult<T>
  | UpdateMutateResult
  | RemoveMutateResult;

export type Result =
  | SelectResult
  | OperateResult
  | MutateResult
  | ValidateResult;
