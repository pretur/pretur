import { SpecType, EmptySpec, Model } from 'pretur.spec';
import { Query } from './query';

export interface RequestBase {
  requestId: number;
}

export interface MutateRequestBase<T extends SpecType = EmptySpec> extends RequestBase {
  type: 'mutate';
  model: T['name'];
}

export interface SelectRequest<T extends SpecType = EmptySpec> extends RequestBase {
  type: 'select';
  query: Query<T>;
}

export interface ValidateRequest<T = any> extends RequestBase {
  type: 'validate';
  name: string;
  data: T;
}

export interface OperateRequest<T = any> extends RequestBase {
  type: 'operate';
  name: string;
  data?: T;
}

export interface InsertMutateRequest<T extends SpecType = EmptySpec> extends MutateRequestBase<T> {
  action: 'insert';
  data: Partial<Model<T>>;
}

export interface UpdateMutateRequest<T extends SpecType = EmptySpec> extends MutateRequestBase<T> {
  action: 'update';
  attributes: (keyof T['fields'])[];
  data: Partial<T['fields']>;
}

export interface RemoveMutateRequest<T extends SpecType = EmptySpec> extends MutateRequestBase<T> {
  action: 'remove';
  identifiers: Partial<T['fields']>;
}

export type MutateRequest<T extends SpecType = EmptySpec> =
  | InsertMutateRequest<T>
  | UpdateMutateRequest<T>
  | RemoveMutateRequest<T>;

export interface BatchMutateRequest extends RequestBase {
  type: 'batchMutate';
  queue: MutateRequest[];
}

export type Request =
  | SelectRequest
  | ValidateRequest
  | OperateRequest
  | MutateRequest
  | BatchMutateRequest;
