import * as Sequelize from 'sequelize';
import {
  Query, SubQuery, QueryInclude, Filter, FilterFields, FilterNested, FilterCombinations,
} from 'pretur.sync';
import { Spec, SpecType, Model } from 'pretur.spec';
import { ProviderPool, Transaction } from './pool';
import { SequelizeModel } from './sequelizeModel';

export interface ResolveResult<T extends SpecType> {
  data: Partial<Model<T>>[];
  count: number;
}

export interface Resolver<T extends SpecType> {
  (transaction: Transaction, query: Query<T>, context?: any): Promise<ResolveResult<T>>;
}

export interface CustomResolver<T extends SpecType> {
  (
    transaction: Transaction,
    query: Query<T>,
    pool: ProviderPool,
    context?: any,
  ): Promise<ResolveResult<T>>;
}

export interface UnitializedResolver<T extends SpecType> {
  resolver: Resolver<T>;
  initialize(pool: ProviderPool): void;
}

export interface ResolveInterceptor<T extends SpecType> {
  (
    transaction: Transaction,
    query: Query<T>,
    result: ResolveResult<T>,
    context: any,
  ): Promise<ResolveResult<T>>;
}

export interface BuildResolverOptions<T extends SpecType> {
  intercept?: ResolveInterceptor<T>;
  queryTransformer?(transaction: Transaction, query: Query<T>): Promise<Query<T>>;
}

export function buildCustomResolver<T extends SpecType>(
  _: Spec<T>,
  resolver: CustomResolver<T>,
): UnitializedResolver<T> {
  let pool: ProviderPool = <any>undefined;

  function wrappedResolver(
    transaction: Transaction,
    query: Query<T>,
    context: any,
  ): Promise<ResolveResult<T>> {
    return resolver(transaction, query, pool, context);
  }

  function initialize(p: ProviderPool) {
    pool = p;
  }

  return { resolver: wrappedResolver, initialize };
}

export function buildResolver<T extends SpecType>(
  spec: Spec<T>,
  options?: BuildResolverOptions<T>,
): UnitializedResolver<T> {
  let pool: ProviderPool = <any>undefined;

  async function resolver(
    transaction: Transaction,
    rawQuery: Query<T>,
    context?: any,
  ): Promise<ResolveResult<T>> {
    const provider = pool.providers[spec.name];

    let query = rawQuery;

    if (options && typeof options.queryTransformer === 'function') {
      query = await options.queryTransformer(transaction, rawQuery);
    }

    const model = <SequelizeModel<T>>provider.metadata.model;

    if (!model) {
      throw new Error(`${model} is not a valid model`);
    }

    const findOptions: Sequelize.FindOptions<Model<T>> = {};

    findOptions.attributes = provider.metadata.sanitizeAttributes(query && query.attributes);

    const include = buildInclude(query, pool, spec.name);
    if (include && include.length > 0) {
      findOptions.include = include;
    }

    const where = buildWhere(query, pool, spec.name);
    if (where) {
      findOptions.where = where;
    }

    if (query && query.byId) {
      const byIdWhere = <Sequelize.WhereOptions<Model<T>>>{};

      for (const pk of (<(keyof T['fields'])[]>provider.metadata.primaryKeys)) {
        if (query.byId[pk] === undefined) {
          throw new Error(`byId must contain every primary key. ${pk} is missing`);
        }
        byIdWhere[pk] = query.byId[pk];
      }

      const instance = await model.findOne({
        ...findOptions,
        transaction,
        where: byIdWhere,
      });

      if (!instance) {
        return { data: [], count: 0 };
      }

      const single = [instance.get({ plain: true })];

      if (options && options.intercept) {
        const intercept = options.intercept;
        return intercept(transaction, query, { data: single, count: 1 }, context);
      }

      return { data: single, count: 1 };
    }

    const order = buildOrder(query, pool, spec.name);
    if (order) {
      findOptions.order = order;
    }

    const offset = query && query.pagination && query.pagination.skip;
    if (offset) {
      findOptions.offset = offset;
    }

    const limit = query && query.pagination && query.pagination.take;
    if (limit) {
      findOptions.limit = limit;
    }

    if (query && query.count) {
      const { rows, count } = await model.findAndCountAll({ ...findOptions, transaction });

      const plain = rows.map(row => row.get({ plain: true }));

      if (options && options.intercept) {
        const intercept = options.intercept;
        return intercept(transaction, query, { data: plain, count }, context);
      }

      return { data: plain, count };
    }

    const raw = await model.findAll(findOptions);
    const data = raw.map(row => row.get({ plain: true }));
    if (options && options.intercept) {
      const intercept = options.intercept;
      return intercept(transaction, query, { data, count: 0 }, context);
    }

    return { data, count: 0 };
  }

  function initialize(p: ProviderPool) {
    pool = p;
  }

  return { resolver, initialize };
}

function buildOrder<T extends SpecType>(
  query: Query<T> | undefined,
  pool: ProviderPool,
  model: T['name'],
): any[] | undefined {
  const defaultOrder = pool.providers[model].metadata.defaultOrder;
  const parameters: any[] = [];

  if (query && query.order && query.order.field && query.order.ordering !== 'NONE') {

    if (Array.isArray(query.order.chain)) {
      let current = model;
      for (const alias of query.order.chain) {
        const next = pool.providers[current].metadata.aliasModelMap[alias];
        parameters.push({ as: alias, model: pool.providers[next].metadata.model });
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
  modelName: T['name'],
  path: string[],
): Sequelize.WhereOptions<Model<T>> {
  const provider = pool.providers[modelName];

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
  modelName: T['name'],
): Sequelize.WhereOptions<Model<T>> {
  const where: Sequelize.WhereOptions<Model<T>> = {};

  if (filter.$and) {
    if (Array.isArray(filter.$and)) {
      where.$and = <any>filter.$and.map(and => transformFilter(and, pool, modelName));
    } else {
      where.$and = transformFilter(filter.$and, pool, modelName);
    }
  }

  if (filter.$or) {
    if (Array.isArray(filter.$or)) {
      where.$or = <any>filter.$or.map(or => transformFilter(or, pool, modelName));
    } else {
      where.$or = transformFilter(filter.$or, pool, modelName);
    }
  }

  if (filter.$not) {
    if (Array.isArray(filter.$not)) {
      where.$not = <any>filter.$not.map(not => transformFilter(not, pool, modelName));
    } else {
      where.$not = transformFilter(filter.$not, pool, modelName);
    }
  }

  return where;
}

function transformFilter<T extends SpecType>(
  filter: Filter<T>,
  pool: ProviderPool,
  modelName: T['name'],
): Sequelize.WhereOptions<Model<T>> {
  const provider = pool.providers[modelName];

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

  const combinations = traverseTree(filter, pool, modelName);
  Object.assign(where, combinations);

  return where;
}

function buildWhere<T extends SpecType>(
  query: Query<T> | SubQuery<T> | undefined,
  pool: ProviderPool,
  modelName: T['name'],
): Sequelize.WhereOptions<Model<T>> | undefined {
  if (query && query.filters) {
    return transformFilter(<any>query.filters, pool, modelName);
  }
  return;
}

function buildInclude<T extends SpecType>(
  query: Query<T> | undefined,
  pool: ProviderPool,
  model: T['name'],
): Sequelize.IncludeOptions[] | undefined {
  const queryInclude = query && query.include;
  const orderChain = query && query.order && query.order.chain;

  return buildNestedInclude<T>(pool, queryInclude, orderChain, model);
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

        if (!target.metadata.model) {
          continue;
        }

        const includedModel: Sequelize.IncludeOptions = {
          as: alias,
          attributes: target.metadata.allowedAttributes,
          model: target.metadata.model,
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
