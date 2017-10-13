import { createActionDescriptor, TargetedActionDescriptor } from 'pretur.redux';
import { Query, Filter, QueryPagination, QueryOrder } from 'pretur.sync';
import { ValidationError } from 'pretur.validation';
import { State } from './clay';

export interface SetValuePayload {
  value: any;
  resetError: boolean;
}

export interface SetFieldPayload {
  field: string;
  value: any;
}

export interface SetFiltersPayload {
  filters: Filter<any> | undefined;
  path?: string[];
}

export interface SetExtraPayload {
  extra: any;
  resetPagination: boolean;
}

export interface RefreshPayload {
  data: any;
  count: any;
}

export const CLAY_CLEAR: TargetedActionDescriptor
  = createActionDescriptor('CLAY_CLEAR');

export const CLAY_REPLACE: TargetedActionDescriptor<any>
  = createActionDescriptor<any>('CLAY_REPLACE');

export const CLAY_SET_VALUE: TargetedActionDescriptor<SetValuePayload>
  = createActionDescriptor<SetValuePayload>('CLAY_SET_VALUE');

export const CLAY_SET_ERROR: TargetedActionDescriptor<ValidationError>
  = createActionDescriptor<ValidationError>('CLAY_SET_ERROR');

export const CLAY_SET_STATE: TargetedActionDescriptor<State>
  = createActionDescriptor<State>('CLAY_SET_STATE');

export const CLAY_SET_FIELD: TargetedActionDescriptor<SetFieldPayload>
  = createActionDescriptor<SetFieldPayload>('CLAY_SET_FIELD');

export const CLAY_ADD: TargetedActionDescriptor<any>
  = createActionDescriptor<any>('CLAY_ADD');

export const CLAY_REMOVE: TargetedActionDescriptor<number>
  = createActionDescriptor<number>('CLAY_REMOVE');

export const CLAY_REFRESH: TargetedActionDescriptor<RefreshPayload>
  = createActionDescriptor<RefreshPayload>('CLAY_REFRESH');

export const CLAY_SET_QUERY_ATTRIBUTES: TargetedActionDescriptor<string[]>
  = createActionDescriptor<string[]>('CLAY_SET_QUERY_ATTRIBUTES');

export const CLAY_SET_QUERY_FILTERS: TargetedActionDescriptor<SetFiltersPayload>
  = createActionDescriptor<SetFiltersPayload>('CLAY_SET_QUERY_FILTERS');

export const CLAY_SET_QUERY_PAGINATION: TargetedActionDescriptor<QueryPagination>
  = createActionDescriptor<QueryPagination>('CLAY_SET_QUERY_PAGINATION');

export const CLAY_SET_QUERY_ORDER: TargetedActionDescriptor<QueryOrder>
  = createActionDescriptor<QueryOrder>('CLAY_SET_QUERY_ORDER');

export const CLAY_SET_QUERY_EXTRA: TargetedActionDescriptor<SetExtraPayload>
  = createActionDescriptor<SetExtraPayload>('CLAY_SET_QUERY_EXTRA');

export const CLAY_SET_QUERIEIR_COUNT: TargetedActionDescriptor<number>
  = createActionDescriptor<number>('CLAY_SET_QUERIEIR_COUNT');

export const CLAY_RESET_QUERIEIR: TargetedActionDescriptor<Query<any>>
  = createActionDescriptor<Query<any>>('CLAY_RESET_QUERIEIR');
