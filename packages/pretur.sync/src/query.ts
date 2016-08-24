export type Ordering = 'NONE' | 'ASC' | 'DESC';

export interface QueryOrder {
  field: string;
  ordering: Ordering;
  chain?: string[];
}

export interface QueryFilters {
  [attribute: string]: any;
}

export interface QueryPagination {
  skip?: number;
  take?: number;
}

export interface QueryInclude {
  [alias: string]: SubQuery | boolean;
}

export interface SubQuery {
  include?: QueryInclude;
  filters?: QueryFilters;
  attributes?: string[];
}

export interface Query {
  queryId?: number;
  model?: string;
  byId?: number;
  count?: boolean;
  extra?: any;
  include?: QueryInclude;
  filters?: QueryFilters;
  attributes?: string[];
  pagination?: QueryPagination;
  order?: QueryOrder;
}
