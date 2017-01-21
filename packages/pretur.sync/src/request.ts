import { Query } from './query';

export interface RequestBase {
  requestId: number;
}

export interface MutateRequestBase extends RequestBase {
  type: 'mutate';
  model: string;
}

export interface SelectRequest<T> extends RequestBase {
  type: 'select';
  query: Query<T>;
}

export interface ValidateRequest<T> extends RequestBase {
  type: 'validate';
  name: string;
  data: T;
}

export interface OperateRequest<T> extends RequestBase {
  type: 'operate';
  name: string;
  data?: T;
}

export interface InsertMutateRequest<T> extends MutateRequestBase {
  action: 'insert';
  data: Partial<T>;
}

export interface UpdateMutateRequest<T> extends MutateRequestBase {
  action: 'update';
  attributes: (keyof T)[];
  data: Partial<T>;
}

export interface RemoveMutateRequest<T> extends MutateRequestBase {
  action: 'remove';
  identifiers: Partial<T>;
}

export type MutateRequest<T> =
  | InsertMutateRequest<T>
  | UpdateMutateRequest<T>
  | RemoveMutateRequest<T>;

export interface BatchMutateRequest extends RequestBase {
  type: 'batchMutate';
  queue: MutateRequest<any>[];
}

export type Request =
  | SelectRequest<any>
  | ValidateRequest<any>
  | OperateRequest<any>
  | MutateRequest<any>
  | BatchMutateRequest;
