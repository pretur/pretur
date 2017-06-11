import { SpecType, Model } from 'pretur.spec';
import { Bundle } from 'pretur.i18n';
import { ValidationError } from 'pretur.validation';

export interface ResponseBase {
  requestId: number;
  warnings?: Bundle[];
  errors?: Bundle[];
}

export interface MutateResponseBase extends ResponseBase {
  type: 'mutate';
  transactionFailed: boolean;
  validationError: ValidationError;
}

export interface SelectResponse<T extends SpecType> extends ResponseBase {
  type: 'select';
  data?: Model<T>[];
  count?: number;
}

export interface ValidateResponse extends ResponseBase {
  type: 'validate';
  name: string;
  validationError: ValidationError;
}

export interface OperateResponse<T> extends ResponseBase {
  type: 'operate';
  name: string;
  data?: T;
}

export interface InsertMutateResponse<T extends SpecType> extends MutateResponseBase {
  action: 'insert';
  generatedId?: Partial<T['fields']>;
}

export interface UpdateMutateResponse extends MutateResponseBase {
  action: 'update';
}

export interface RemoveMutateResponse extends MutateResponseBase {
  action: 'remove';
}

export type MutateResponse<T extends SpecType> =
  | InsertMutateResponse<T>
  | UpdateMutateResponse
  | RemoveMutateResponse;

export interface BatchMutateResponse extends ResponseBase {
  type: 'batchMutate';
  queue: MutateResponse<any>[];
}

export type Response =
  | SelectResponse<any>
  | OperateResponse<any>
  | MutateResponse<any>
  | BatchMutateResponse
  | ValidateResponse;
