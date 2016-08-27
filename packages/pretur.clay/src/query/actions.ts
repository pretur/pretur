import { createTargetedActionDescriptor, TargetedActionDescriptor } from 'pretur.redux';
import { QueryFilters, QueryPagination, QueryOrder } from 'pretur.sync';

export const CLAY_QUERY_SET_FILTERS: TargetedActionDescriptor<QueryFilters, void>
  = createTargetedActionDescriptor<QueryFilters, void>('CLAY_QUERY_SET_FILTERS');

export const CLAY_QUERY_SET_ATTRIBUTES: TargetedActionDescriptor<string[], void>
  = createTargetedActionDescriptor<string[], void>('CLAY_QUERY_SET_ATTRIBUTES');

export const CLAY_QUERY_SET_PAGINATION: TargetedActionDescriptor<QueryPagination, void>
  = createTargetedActionDescriptor<QueryPagination, void>('CLAY_QUERY_SET_PAGINATION');

export const CLAY_QUERY_SET_ORDER: TargetedActionDescriptor<QueryOrder, void>
  = createTargetedActionDescriptor<QueryOrder, void>('CLAY_QUERY_SET_ORDER');
