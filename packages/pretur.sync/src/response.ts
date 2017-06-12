import { SpecType, EmptySpec, Model } from 'pretur.spec';
import { Bundle } from 'pretur.i18n';

export interface ResponseBase {
  requestId: number;
  warnings?: Bundle[];
  errors?: Bundle[];
}

export interface MutateResponseBase extends ResponseBase {
  type: 'mutate';
  transactionFailed: boolean;
}

export interface SelectResponse<T extends SpecType = EmptySpec> extends ResponseBase {
  type: 'select';
  data?: Model<T>[];
  count?: number;
}

export interface ValidateResponse extends ResponseBase {
  type: 'validate';
  name: string;
  validationError?: Bundle | Bundle[];
}

export interface OperateResponse<T = any> extends ResponseBase {
  type: 'operate';
  name: string;
  data?: T;
}

export interface InsertMutateResponse<T extends SpecType = EmptySpec> extends MutateResponseBase {
  action: 'insert';
  generatedId?: Partial<T['fields']>;
}

export interface UpdateMutateResponse extends MutateResponseBase {
  action: 'update';
}

export interface RemoveMutateResponse extends MutateResponseBase {
  action: 'remove';
}

export type MutateResponse<T extends SpecType = EmptySpec> =
  | InsertMutateResponse<T>
  | UpdateMutateResponse
  | RemoveMutateResponse;

export interface BatchMutateResponse extends ResponseBase {
  type: 'batchMutate';
  queue: MutateResponse[];
}

export type Response =
  | SelectResponse
  | OperateResponse
  | MutateResponse
  | BatchMutateResponse
  | ValidateResponse;
