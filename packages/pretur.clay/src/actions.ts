import { createHomingAction, TargetedActionDescriptor } from 'pretur.redux';
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
  = createHomingAction('CLAY_CLEAR');

export const CLAY_REPLACE: TargetedActionDescriptor<any>
  = createHomingAction<any>('CLAY_REPLACE');

export const CLAY_SET_VALUE: TargetedActionDescriptor<SetValuePayload>
  = createHomingAction<SetValuePayload>('CLAY_SET_VALUE');

export const CLAY_SET_ERROR: TargetedActionDescriptor<ValidationError>
  = createHomingAction<ValidationError>('CLAY_SET_ERROR');

export const CLAY_SET_STATE: TargetedActionDescriptor<State>
  = createHomingAction<State>('CLAY_SET_STATE');

export const CLAY_SET_FIELD: TargetedActionDescriptor<SetFieldPayload>
  = createHomingAction<SetFieldPayload>('CLAY_SET_FIELD');

export const CLAY_ADD: TargetedActionDescriptor<any>
  = createHomingAction<any>('CLAY_ADD');

export const CLAY_REMOVE: TargetedActionDescriptor<number>
  = createHomingAction<number>('CLAY_REMOVE');

export const CLAY_REFRESH: TargetedActionDescriptor<RefreshPayload>
  = createHomingAction<RefreshPayload>('CLAY_REFRESH');

export const CLAY_SET_QUERY_ATTRIBUTES: TargetedActionDescriptor<string[]>
  = createHomingAction<string[]>('CLAY_SET_QUERY_ATTRIBUTES');

export const CLAY_SET_QUERY_FILTERS: TargetedActionDescriptor<SetFiltersPayload>
  = createHomingAction<SetFiltersPayload>('CLAY_SET_QUERY_FILTERS');

export const CLAY_SET_QUERY_PAGINATION: TargetedActionDescriptor<QueryPagination>
  = createHomingAction<QueryPagination>('CLAY_SET_QUERY_PAGINATION');

export const CLAY_SET_QUERY_ORDER: TargetedActionDescriptor<QueryOrder>
  = createHomingAction<QueryOrder>('CLAY_SET_QUERY_ORDER');

export const CLAY_SET_QUERY_EXTRA: TargetedActionDescriptor<SetExtraPayload>
  = createHomingAction<SetExtraPayload>('CLAY_SET_QUERY_EXTRA');

export const CLAY_SET_QUERIEIR_COUNT: TargetedActionDescriptor<number>
  = createHomingAction<number>('CLAY_SET_QUERIEIR_COUNT');

export const CLAY_RESET_QUERIEIR: TargetedActionDescriptor<Query<any>>
  = createHomingAction<Query<any>>('CLAY_RESET_QUERIEIR');
