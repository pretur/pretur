import { Query } from './query';

export interface RequestBase {
  requestId: number;
}

export interface SelectRequest<T> extends RequestBase {
  type: 'select';
  query: Query<T>;
}

export interface RefreshRequest<T> extends RequestBase {
  type: 'refresh';
  query: Query<T>;
}

export interface OperateRequest<T> extends RequestBase {
  type: 'operate';
  name: string;
  data?: T;
}

export interface InsertRequest<T> extends RequestBase {
  type: 'insert';
  model: string;
  data: Partial<T>;
}

export interface UpdateRequest<T> extends RequestBase {
  type: 'update';
  model: string;
  attributes: (keyof T)[];
  data: Partial<T>;
}

export interface RemoveRequest<T> extends RequestBase {
  type: 'remove';
  model: string;
  identifiers: Partial<T>;
}

export interface ValidateRequest<T> extends RequestBase {
  type: 'validate';
  name: string;
  data: T;
}

export interface BatchRequest extends RequestBase {
  type: 'batch';
  queue: Request[];
}

export type Request =
  | SelectRequest<any>
  | RefreshRequest<any>
  | OperateRequest<any>
  | InsertRequest<any>
  | UpdateRequest<any>
  | RemoveRequest<any>
  | ValidateRequest<any>
  | BatchRequest;
