import { SpecType, EmptySpec, Model } from 'pretur.spec';
import { Bundle } from 'pretur.i18n';

export interface ResultBase {
  errors: Bundle[];
}

export interface SelectResult<T extends SpecType = EmptySpec> extends ResultBase {
  type: 'select';
  data: Model<T>[];
  count: number;
}

export interface ValidateResult extends ResultBase {
  type: 'validate';
  name: string;
}

export interface OperateResult<T = any> extends ResultBase {
  type: 'operate';
  name: string;
  data?: T;
}

export interface MutateResult<T extends SpecType = EmptySpec> extends ResultBase {
  type: 'mutate';
  action: 'insert' | 'update' | 'remove';
  generatedIds?: Partial<T['fields']>;
}

export type Result =
  | SelectResult
  | OperateResult
  | MutateResult
  | ValidateResult;
