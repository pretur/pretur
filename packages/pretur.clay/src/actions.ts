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

export const CLAY_CLEAR: TargetedActionDescriptor<void, void>
  = createTargetedActionDescriptor<void, void>('CLAY_CLEAR');

export const CLAY_REPLACE: TargetedActionDescriptor<any, void>
  = createTargetedActionDescriptor<any, void>('CLAY_REPLACE');

export const CLAY_SET_VALUE: TargetedActionDescriptor<SetValuePayload, void>
  = createTargetedActionDescriptor<SetValuePayload, void>('CLAY_SET_VALUE');

export const CLAY_SET_ERROR: TargetedActionDescriptor<ValidationError, void>
  = createTargetedActionDescriptor<ValidationError, void>('CLAY_SET_ERROR');

export const CLAY_SET_STATE: TargetedActionDescriptor<State, void>
  = createTargetedActionDescriptor<State, void>('CLAY_SET_STATE');

export const CLAY_SET_FIELD: TargetedActionDescriptor<SetFieldPayload, void>
  = createTargetedActionDescriptor<SetFieldPayload, void>('CLAY_SET_FIELD');

export const CLAY_ADD: TargetedActionDescriptor<any, void>
  = createTargetedActionDescriptor<any, void>('CLAY_ADD');

export const CLAY_REMOVE: TargetedActionDescriptor<number, void>
  = createTargetedActionDescriptor<number, void>('CLAY_REMOVE');

export const CLAY_REFRESH: TargetedActionDescriptor<RefreshPayload, void>
  = createTargetedActionDescriptor<RefreshPayload, void>('CLAY_REFRESH');

export const CLAY_SET_QUERY_ATTRIBUTES: TargetedActionDescriptor<string[], void>
  = createTargetedActionDescriptor<string[], void>('CLAY_SET_QUERY_ATTRIBUTES');

export const CLAY_SET_QUERY_FILTERS: TargetedActionDescriptor<SetFiltersPayload, void>
  = createTargetedActionDescriptor<SetFiltersPayload, void>('CLAY_SET_QUERY_FILTERS');

export const CLAY_SET_QUERY_PAGINATION: TargetedActionDescriptor<QueryPagination, void>
  = createTargetedActionDescriptor<QueryPagination, void>('CLAY_SET_QUERY_PAGINATION');

export const CLAY_SET_QUERY_ORDER: TargetedActionDescriptor<QueryOrder, void>
  = createTargetedActionDescriptor<QueryOrder, void>('CLAY_SET_QUERY_ORDER');

export const CLAY_SET_QUERY_EXTRA: TargetedActionDescriptor<SetExtraPayload, void>
  = createTargetedActionDescriptor<SetExtraPayload, void>('CLAY_SET_QUERY_EXTRA');

export const CLAY_SET_QUERIEIR_COUNT: TargetedActionDescriptor<number, void>
  = createTargetedActionDescriptor<number, void>('CLAY_SET_QUERIEIR_COUNT');
