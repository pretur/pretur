import { createHomingAction, HomingActionDefinition } from 'reducible-node';
import { Query, Filter, QueryPagination, QueryOrder } from 'pretur.sync';
import { ValidationError } from 'pretur.validation';
import { State } from './clay';
import { Record } from './Record';

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

export const CLAY_CLEAR: HomingActionDefinition
  = createHomingAction('CLAY_CLEAR');

export const CLAY_REPLACE: HomingActionDefinition<any>
  = createHomingAction<any>('CLAY_REPLACE');

export const CLAY_SET_VALUE: HomingActionDefinition<SetValuePayload>
  = createHomingAction<SetValuePayload>('CLAY_SET_VALUE');

export const CLAY_SET_ERROR: HomingActionDefinition<ValidationError>
  = createHomingAction<ValidationError>('CLAY_SET_ERROR');

export const CLAY_SET_STATE: HomingActionDefinition<State>
  = createHomingAction<State>('CLAY_SET_STATE');

export const CLAY_SET_REMOVED_AND_RESET: HomingActionDefinition<void>
  = createHomingAction<void>('CLAY_SET_REMOVED_AND_RESET');

export const CLAY_SET_FIELD: HomingActionDefinition<SetFieldPayload>
  = createHomingAction<SetFieldPayload>('CLAY_SET_FIELD');

export const CLAY_ADD: HomingActionDefinition<Record<any>>
  = createHomingAction<Record<any>>('CLAY_ADD');

export const CLAY_REMOVE: HomingActionDefinition<symbol>
  = createHomingAction<symbol>('CLAY_REMOVE');

export const CLAY_REFRESH: HomingActionDefinition<RefreshPayload>
  = createHomingAction<RefreshPayload>('CLAY_REFRESH');

export const CLAY_SET_QUERY_ATTRIBUTES: HomingActionDefinition<string[]>
  = createHomingAction<string[]>('CLAY_SET_QUERY_ATTRIBUTES');

export const CLAY_SET_QUERY_FILTERS: HomingActionDefinition<SetFiltersPayload>
  = createHomingAction<SetFiltersPayload>('CLAY_SET_QUERY_FILTERS');

export const CLAY_SET_QUERY_PAGINATION: HomingActionDefinition<QueryPagination>
  = createHomingAction<QueryPagination>('CLAY_SET_QUERY_PAGINATION');

export const CLAY_SET_QUERY_ORDER: HomingActionDefinition<QueryOrder>
  = createHomingAction<QueryOrder>('CLAY_SET_QUERY_ORDER');

export const CLAY_SET_QUERY_EXTRA: HomingActionDefinition<SetExtraPayload>
  = createHomingAction<SetExtraPayload>('CLAY_SET_QUERY_EXTRA');

export const CLAY_SET_QUERIEIR_COUNT: HomingActionDefinition<number>
  = createHomingAction<number>('CLAY_SET_QUERIEIR_COUNT');

export const CLAY_RESET_QUERIEIR: HomingActionDefinition<Query<any>>
  = createHomingAction<Query<any>>('CLAY_RESET_QUERIEIR');
