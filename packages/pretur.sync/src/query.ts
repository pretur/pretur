import { SpecType } from 'pretur.spec';

export type Ordering = 'NONE' | 'ASC' | 'DESC';

export interface QueryOrder {
  field: string;
  ordering: Ordering;
  chain?: string[];
}

export type QueryFilters<F> = {
  [P in keyof F]?: any;
};

export interface QueryPagination {
  skip: number;
  take: number;
}

export type QueryInclude<T extends SpecType> =
  & {[P in keyof T['records']]?: SubQuery<T['records'][P]> }
  & {[P in keyof T['sets']]?: SubQuery<T['sets'][P]> };

export interface SubQuery<T extends SpecType> {
  extra?: any;
  include?: QueryInclude<T>;
  filters?: QueryFilters<T['fields']>;
  attributes?: (keyof T['fields'])[];
  required?: boolean;
}

export interface Query<T extends SpecType> {
  model: T['name'];
  byId?: Partial<T['fields']>;
  count?: boolean;
  extra?: any;
  include?: QueryInclude<T>;
  filters?: QueryFilters<T['fields']>;
  attributes?: (keyof T['fields'])[];
  pagination?: QueryPagination;
  order?: QueryOrder;
}
