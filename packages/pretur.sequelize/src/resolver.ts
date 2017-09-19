import * as Sequelize from 'sequelize';
import {
  Query, SubQuery, QueryInclude, Filter, FilterFields, FilterNested, FilterCombinations,
} from 'pretur.sync';
import { Spec, SpecType, Model } from 'pretur.spec';
import { ProviderPool, Transaction } from './pool';
import { DatabaseModel, DatabaseInstance } from './database';

export interface ResolveResult<T extends SpecType> {
  data: Model<T>[];
  count: number;
}

export interface Resolver<T extends SpecType> {
  (transaction: Transaction, query: Query<T>, context: any): Promise<ResolveResult<T>>;
}

export interface UnitializedResolver<T extends SpecType> {
  resolver: Resolver<T>;
  initialize(pool: ProviderPool): void;
}

export interface ResolveInterceptor<T extends SpecType> {
  (
    resolve: (query: Query<T>) => Promise<ResolveResult<T>>,
    transaction: Transaction,
    query: Query<T>,
    context: any,
  ): Promise<ResolveResult<T>>;
}

export interface BuildResolverOptions<T extends SpecType> {
  interceptor?: ResolveInterceptor<T>;
}

export function buildResolver<T extends SpecType>(
  spec: Spec<T>,
  options: BuildResolverOptions<T> = {},
): UnitializedResolver<T> {
  let pool: ProviderPool = <any>undefined;

  function resolver(transaction: Transaction, query: Query<T>, context: any) {

    if (options.interceptor) {
      const resolve = (newQuery: Query<T>) =>
        defaultResolveBehavior(pool, spec, transaction, newQuery);

      return options.interceptor(resolve, transaction, query, context);
    }

    return defaultResolveBehavior(pool, spec, transaction, query);
  }

  function initialize(p: ProviderPool) {
    pool = p;
  }

  return { resolver, initialize };
}

async function defaultResolveBehavior<T extends SpecType>(
  pool: ProviderPool,
  spec: Spec<T>,
  transaction: Transaction,
  query: Query<T>,
): Promise<ResolveResult<T>> {
  const provider = pool.providers[spec.name];
  const database = <DatabaseModel<T>>provider.database;

  if (!database) {
    throw new Error(`${database} is not a valid model`);
  }

  const findOptions: Sequelize.FindOptions<Model<T>> = {};

  findOptions.attributes = provider.metadata.sanitizeAttributes(query.attributes);
  findOptions.include = buildInclude(query, pool, spec.name);
  findOptions.where = buildWhere(query, pool, spec.name) || {};

  if (query.byId) {
    for (const pk of (<(keyof T['fields'])[]>provider.metadata.primaryKeys)) {
      if (query.byId[pk] === undefined) {
        throw new Error(`byId must contain every primary key. ${pk} is missing`);
      }
      findOptions.where[pk] = query.byId[pk];
    }

    const instance = await database.findOne({ ...findOptions, transaction });

    if (!instance) {
      return { data: [], count: 0 };
    }
    return { data: [<Model<T>>instance.get({ plain: true })], count: 1 };
  }

  findOptions.order = buildOrder(query, pool, spec.name);

  if (query.pagination) {
    findOptions.offset = query.pagination.skip;
    findOptions.limit = query.pagination.take;
  }

  if (query.count) {
    const { rows, count } = await database.findAndCountAll({ ...findOptions, transaction });
    return { data: plain(rows), count };
  }

  const instances = await database.findAll({ ...findOptions, transaction });
  return { data: plain(instances), count: 0 };
}

function plain<T extends SpecType>(rows: DatabaseInstance<T>[]) {
  return rows.map(row => <Model<T>>row.get({ plain: true }));
}

function buildOrder<T extends SpecType>(
  query: Query<T>,
  pool: ProviderPool,
  model: T['name'],
): any[] | undefined {
  const defaultOrder = pool.providers[model].metadata.defaultOrder;
  const parameters: any[] = [];

  if (query.order && query.order.field && query.order.ordering !== 'NONE') {

    if (Array.isArray(query.order.chain)) {
      let current = model;
      for (const alias of query.order.chain) {
        const next = pool.providers[current].metadata.aliasModelMap[alias];
        parameters.push({ as: alias, model: pool.providers[next].database });
        current = next;
      }
    }

    parameters.push(query.order.field);
    parameters.push(query.order.ordering);
  }

  if (parameters.length === 0) {
    if (!Array.isArray(defaultOrder)) {
      return;
    }

    return [defaultOrder.slice()];
  }

  return [parameters];
}

function getAliasFilters<T extends SpecType>(
  filter: FilterFields<T> & FilterNested<T>,
  pool: ProviderPool,
  model: T['name'],
  path: string[],
): Sequelize.WhereOptions<Model<T>> {
  const provider = pool.providers[model];

  const where: Sequelize.WhereOptions<Model<T>> = {};

  for (const field of provider.metadata.allowedAttributes) {
    if (filter[field] !== undefined) {
      (<any>where)[`$${path.join('.')}.${field}$`] = filter[field];
    }
  }
  const aliases = Object.keys(provider.metadata.aliasKeyMap);

  for (const alias of aliases) {
    if ((<any>filter)[alias]) {
      const aliasModel = provider.metadata.aliasModelMap[alias];
      const aliasFilter = getAliasFilters((<any>filter)[alias], pool, aliasModel, [...path, alias]);
      Object.assign(where, aliasFilter);
    }
  }

  return where;
}

function traverseTree<T extends SpecType>(
  filter: FilterCombinations<T>,
  pool: ProviderPool,
  model: T['name'],
): Sequelize.WhereOptions<Model<T>> {
  const where: Sequelize.WhereOptions<Model<T>> = {};

  if (filter.$and) {
    if (Array.isArray(filter.$and)) {
      where.$and = <any>filter.$and.map(and => transformFilter(and, pool, model));
    } else {
      where.$and = transformFilter(filter.$and, pool, model);
    }
  }

  if (filter.$or) {
    if (Array.isArray(filter.$or)) {
      where.$or = <any>filter.$or.map(or => transformFilter(or, pool, model));
    } else {
      where.$or = transformFilter(filter.$or, pool, model);
    }
  }

  if (filter.$not) {
    if (Array.isArray(filter.$not)) {
      where.$not = <any>filter.$not.map(not => transformFilter(not, pool, model));
    } else {
      where.$not = transformFilter(filter.$not, pool, model);
    }
  }

  return where;
}

function transformFilter<T extends SpecType>(
  filter: Filter<T>,
  pool: ProviderPool,
  model: T['name'],
): Sequelize.WhereOptions<Model<T>> {
  const provider = pool.providers[model];

  const where: Sequelize.WhereOptions<Model<T>> = {};

  for (const field of provider.metadata.allowedAttributes) {
    if (filter[field] !== undefined) {
      (<any>where)[field] = filter[field];
    }
  }

  const aliases = Object.keys(provider.metadata.aliasKeyMap);

  for (const alias of aliases) {
    if ((<any>filter)[alias]) {
      const aliasModel = provider.metadata.aliasModelMap[alias];
      const aliasFilter = getAliasFilters((<any>filter)[alias], pool, aliasModel, [alias]);
      Object.assign(where, aliasFilter);
    }
  }

  const combinations = traverseTree(filter, pool, model);
  Object.assign(where, combinations);

  return where;
}

function buildWhere<T extends SpecType>(
  query: Query<T> | SubQuery<T>,
  pool: ProviderPool,
  model: T['name'],
): Sequelize.WhereOptions<Model<T>> | undefined {
  if (query.filters) {
    return transformFilter(<any>query.filters, pool, model);
  }
  return;
}

function buildInclude<T extends SpecType>(
  query: Query<T>,
  pool: ProviderPool,
  model: T['name'],
): Sequelize.IncludeOptions[] | undefined {
  const orderChain = query.order && query.order.chain;

  return buildNestedInclude<T>(pool, query.include, orderChain, model);
}

function buildNestedInclude<T extends SpecType>(
  pool: ProviderPool,
  queryInclude: QueryInclude<T> | undefined,
  orderChain: string[] | undefined,
  model: T['name'],
): Sequelize.IncludeOptions[] | undefined {
  const aliasModelMap = pool.providers[model].metadata.aliasModelMap;

  if (queryInclude || orderChain) {
    const include: Sequelize.IncludeOptions[] = [];

    for (const alias of Object.keys(aliasModelMap)) {
      if (
        (queryInclude && queryInclude[alias]) ||
        (orderChain && orderChain[0] === alias)
      ) {
        const subQuery = queryInclude && queryInclude[alias];
        const target = pool.providers[aliasModelMap[alias]];

        if (!target.database) {
          continue;
        }

        const includedModel: Sequelize.IncludeOptions = {
          as: alias,
          attributes: target.metadata.allowedAttributes,
          model: target.database,
          required: subQuery ? subQuery.required : false,
        };

        if (subQuery) {
          const attributes = target.metadata.sanitizeAttributes(subQuery.attributes);
          if (attributes) {
            includedModel.attributes = attributes;
          }
          const where = buildWhere(subQuery, pool, aliasModelMap[alias]);
          if (where) {
            includedModel.where = <any>where;
          }
        }

        const nestedInclude = buildNestedInclude(
          pool,
          subQuery && subQuery.include,
          Array.isArray(orderChain) ? orderChain.slice(1) : undefined,
          aliasModelMap[alias],
        );

        if (nestedInclude) {
          includedModel.include = nestedInclude;
        }

        include.push(includedModel);
      }
    }

    return include;
  }

  return;
}
