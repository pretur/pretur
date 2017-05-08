import { createTargetedActionDescriptor, TargetedActionDescriptor } from 'pretur.redux';
import { QueryFilters, QueryPagination, QueryOrder } from 'pretur.sync';
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
  filters: QueryFilters<any>;
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
  = createTargetedActionDescriptor('CLAY_CLEAR');

export const CLAY_REPLACE: TargetedActionDescriptor<any>
  = createTargetedActionDescriptor<any>('CLAY_REPLACE');

export const CLAY_SET_VALUE: TargetedActionDescriptor<SetValuePayload>
  = createTargetedActionDescriptor<SetValuePayload>('CLAY_SET_VALUE');

export const CLAY_SET_ERROR: TargetedActionDescriptor<ValidationError>
  = createTargetedActionDescriptor<ValidationError>('CLAY_SET_ERROR');

export const CLAY_SET_STATE: TargetedActionDescriptor<State>
  = createTargetedActionDescriptor<State>('CLAY_SET_STATE');

export const CLAY_SET_FIELD: TargetedActionDescriptor<SetFieldPayload>
  = createTargetedActionDescriptor<SetFieldPayload>('CLAY_SET_FIELD');

export const CLAY_ADD: TargetedActionDescriptor<any>
  = createTargetedActionDescriptor<any>('CLAY_ADD');

export const CLAY_REMOVE: TargetedActionDescriptor<number>
  = createTargetedActionDescriptor<number>('CLAY_REMOVE');

export const CLAY_REFRESH: TargetedActionDescriptor<RefreshPayload>
  = createTargetedActionDescriptor<RefreshPayload>('CLAY_REFRESH');

export const CLAY_SET_QUERY_ATTRIBUTES: TargetedActionDescriptor<string[]>
  = createTargetedActionDescriptor<string[]>('CLAY_SET_QUERY_ATTRIBUTES');

export const CLAY_SET_QUERY_FILTERS: TargetedActionDescriptor<SetFiltersPayload>
  = createTargetedActionDescriptor<SetFiltersPayload>('CLAY_SET_QUERY_FILTERS');

export const CLAY_SET_QUERY_PAGINATION: TargetedActionDescriptor<QueryPagination>
  = createTargetedActionDescriptor<QueryPagination>('CLAY_SET_QUERY_PAGINATION');

export const CLAY_SET_QUERY_ORDER: TargetedActionDescriptor<QueryOrder>
  = createTargetedActionDescriptor<QueryOrder>('CLAY_SET_QUERY_ORDER');

export const CLAY_SET_QUERY_EXTRA: TargetedActionDescriptor<SetExtraPayload>
  = createTargetedActionDescriptor<SetExtraPayload>('CLAY_SET_QUERY_EXTRA');

export const CLAY_SET_QUERIEIR_COUNT: TargetedActionDescriptor<number>
  = createTargetedActionDescriptor<number>('CLAY_SET_QUERIEIR_COUNT');
