import { SpecType, EmptySpec, Model } from 'pretur.spec';
import { Bundle } from 'pretur.i18n';

export interface ResponseBase {
  requestId: number;
  errors: Bundle[];
}

export interface SelectResponse<T extends SpecType = EmptySpec> extends ResponseBase {
  type: 'select';
  data: Model<T>[];
  count: number;
}

export interface ValidateResponse extends ResponseBase {
  type: 'validate';
  name: string;
}

export interface OperateResponse<T = any> extends ResponseBase {
  type: 'operate';
  name: string;
  data?: T;
}

export interface MutateResponse<T extends SpecType = EmptySpec> extends ResponseBase {
  type: 'mutate';
  action: 'insert' | 'update' | 'remove';
  generatedIds?: Partial<T['fields']>;
}

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
