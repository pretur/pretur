export type Ordering = 'NONE' | 'ASC' | 'DESC';

export interface QueryOrder {
  field: string;
  ordering: Ordering;
  chain?: string[];
}

export type QueryFilters<T> = {
  [P in keyof T]?: any;
};

export interface QueryPagination {
  skip: number;
  take: number;
}

export type QueryInclude<T> = {
  [P in keyof T]?: SubQuery<any> | boolean;
};

export interface SubQuery<T> {
  extra?: any;
  include?: QueryInclude<T>;
  filters?: QueryFilters<T>;
  attributes?: (keyof T)[];
  required?: boolean;
}

export interface Query<T> {
  model: string;
  byId?: Partial<T>;
  count?: boolean;
  extra?: any;
  include?: QueryInclude<T>;
  filters?: QueryFilters<T>;
  attributes?: (keyof T)[];
  pagination?: QueryPagination;
  order?: QueryOrder;
}
