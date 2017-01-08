import { createTargetedActionDescriptor, TargetedActionDescriptor } from 'pretur.redux';
import { QueryFilters, QueryPagination, QueryOrder } from 'pretur.sync';
import { ValidationError } from 'pretur.validation';
import { State } from './clay';

export interface SetFieldPayload {
  field: string;
  value: any;
}

export interface ExtraPayload {
  extra: any;
  resetPagination: boolean;
}

export const CLAY_CLEAR: TargetedActionDescriptor<void, void>
  = createTargetedActionDescriptor<void, void>('CLAY_CLEAR');

export const CLAY_REPLACE: TargetedActionDescriptor<any, void>
  = createTargetedActionDescriptor<any, void>('CLAY_REPLACE');

export const CLAY_SET_VALUE: TargetedActionDescriptor<any, void>
  = createTargetedActionDescriptor<any, void>('CLAY_SET_VALUE');

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

export const CLAY_SET_QUERY_ATTRIBUTES: TargetedActionDescriptor<string[], void>
  = createTargetedActionDescriptor<string[], void>('CLAY_SET_QUERY_ATTRIBUTES');

export const CLAY_SET_QUERY_FILTERS: TargetedActionDescriptor<QueryFilters<any>, void>
  = createTargetedActionDescriptor<QueryFilters<any>, void>('CLAY_SET_QUERY_FILTERS');

export const CLAY_SET_QUERY_PAGINATION: TargetedActionDescriptor<QueryPagination, void>
  = createTargetedActionDescriptor<QueryPagination, void>('CLAY_SET_QUERY_PAGINATION');

export const CLAY_SET_QUERY_ORDER: TargetedActionDescriptor<QueryOrder, void>
  = createTargetedActionDescriptor<QueryOrder, void>('CLAY_SET_QUERY_ORDER');

export const CLAY_SET_QUERY_EXTRA: TargetedActionDescriptor<ExtraPayload, void>
  = createTargetedActionDescriptor<ExtraPayload, void>('CLAY_SET_QUERY_EXTRA');

export const CLAY_SET_QUERIEIR_COUNT: TargetedActionDescriptor<number, void>
  = createTargetedActionDescriptor<number, void>('CLAY_SET_QUERIEIR_COUNT');
