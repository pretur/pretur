import * as Bluebird from 'bluebird';
import * as Sequelize from 'sequelize';
import { intersection } from 'lodash';
import { Query, SubQuery, QueryInclude } from 'pretur.sync';
import { Spec } from 'pretur.spec';
import { Pool } from './pool';

export interface ResolveResult<T> {
  data: T[];
  count?: number;
}

export interface Resolver<T> {
  (query: Query<T>, context: any): Bluebird<ResolveResult<T>>;
}

export interface CustomResolver<T> {
  (query: Query<T>, pool: Pool, context: any): Bluebird<ResolveResult<T>>;
}

export interface UnitializedResolver<T> {
  resolver: Resolver<T>;
  initialize(pool: Pool): void;
}

export interface ResolveInterceptor<T> {
  (query: Query<T>, result: ResolveResult<T>, context: any): Bluebird<ResolveResult<T>>;
}

export interface BuildResolverOptions<T> {
  intercept?: ResolveInterceptor<T>;
  queryTransformer?(query: Query<T>): Query<T>;
}

export function buildCustomResolver<T>(
  _: Spec<T>,
  resolver: CustomResolver<T>,
): UnitializedResolver<T> {
  let pool: Pool = <any>null;

  function wrappedResolver(query: Query<T>, context: any): Bluebird<ResolveResult<T>> {
    return resolver(query, pool, context);
  }

  function initialize(p: Pool) {
    pool = p;
  }

  return { resolver: wrappedResolver, initialize };
}

export function buildResolver<T>(
  spec: Spec<T>,
  options?: BuildResolverOptions<T>,
): UnitializedResolver<T> {
  let pool: Pool = <any>null;

  function resolver(rawQuery: Query<T>, context: any): Bluebird<ResolveResult<T>> {
    let query = rawQuery;

    if (options && typeof options.queryTransformer === 'function') {
      query = options.queryTransformer(rawQuery);
    }

    const model = pool.models[spec.name].sequelizeModel;

    if (!model) {
      return Bluebird.reject(new Error(`${model} is not a valid model`));
    }

    const findOptions: Sequelize.FindOptions = {};

    findOptions.attributes = pool.models[spec.name].sanitizeAttributes(query && query.attributes);

    const include = buildInclude(query, pool, spec.name);
    if (include && include.length > 0) {
      findOptions.include = include;
    }

    if (query && (typeof query.byId === 'number' || typeof query.byId === 'string')) {
      const promise = model.findById(query.byId, findOptions).then(data => ({ data: [data] }));
      if (options && options.intercept) {
        const intercept = options.intercept;
        return promise.then(r => intercept(query, r, context));
      }
      return promise;
    }

    const order = buildOrder(query, pool, spec.name);
    if (order) {
      findOptions.order = order;
    }

    const where = buildWhere(query, pool, spec.name);
    if (where) {
      findOptions.where = where;
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
      const promise = model.findAndCountAll(findOptions)
        .then(({ rows, count }) => ({ count, data: rows }));

      if (options && options.intercept) {
        const intercept = options.intercept;
        return promise.then(r => intercept(query, r, context));
      }
      return promise;
    }

    const promise = model.findAll(findOptions).then(data => ({ data }));
    if (options && options.intercept) {
      const intercept = options.intercept;
      return promise.then(r => intercept(query, r, context));
    }
    return promise;
  }

  function initialize(p: Pool) {
    pool = p;
  }

  return { resolver, initialize };
}

function buildOrder<T>(query: Query<T>, pool: Pool, model: string): any[] | null {
  const defaultOrder = pool.models[model].defaultOrder;
  const parameters: any[] = [];

  if (query && query.order && query.order.field && query.order.ordering !== 'NONE') {

    if (Array.isArray(query.order.chain)) {
      let currentModel = model;
      query.order.chain.forEach(alias => {
        const nextModel = pool.models[currentModel].aliasModelMap[alias];
        parameters.push({ as: alias, model: pool.models[nextModel].sequelizeModel });
        currentModel = nextModel;
      });
    }

    parameters.push(query.order.field);
    parameters.push(query.order.ordering);
  }

  if (parameters.length === 0) {
    if (!Array.isArray(defaultOrder)) {
      return null;
    }
    return [defaultOrder.slice()];
  }

  return [parameters];
}

function buildWhere<T>(
  query: Query<T> | SubQuery<T>,
  pool: Pool,
  modelName: string,
): Sequelize.WhereOptions | null {
  const where: Sequelize.WhereOptions = {};
  const model = pool.models[modelName];

  if (query && typeof query.filters === 'object' && query.filters !== null) {
    const filters = query.filters;
    let filtersKeys = Object.keys(query.filters);

    if (model.allowedAttributes) {
      filtersKeys = intersection(filtersKeys, model.allowedAttributes);
    }

    filtersKeys.map(field => {
      const value = filters[<keyof T>field];

      if (
        model.fieldWhereBuilders &&
        typeof model.fieldWhereBuilders[field] === 'function'
      ) {
        where[field] = model.fieldWhereBuilders[field](value);
      } else if (value === null) {
        where[field] = null!;
      } else if (Array.isArray(value)) {
        where[field] = { $in: value };
      } else {
        switch (typeof value) {
          case 'string':
            where[field] = { $iLike: `%${value}%` };
            break;
          default:
            where[field] = value;
            break;
        }
      }
    });

    return where;
  }
  return null;
}

function buildInclude<T>(
  query: Query<T>,
  pool: Pool,
  model: string,
): Sequelize.IncludeOptions[] | null {
  const queryInclude = query && query.include;
  const orderChain = query && query.order && query.order.chain;

  return buildNestedInclude<T>(pool, queryInclude, orderChain, model);
}

function buildNestedInclude<T>(
  pool: Pool,
  queryInclude: QueryInclude<T> | undefined,
  orderChain: string[] | undefined,
  model: string,
): Sequelize.IncludeOptions[] | null {
  const aliasModelMap = pool.models[model].aliasModelMap;

  if (queryInclude || orderChain) {
    const include: Sequelize.IncludeOptions[] = [];

    Object.keys(aliasModelMap).forEach(alias => {
      if (
        (queryInclude && queryInclude[<keyof T>alias]) ||
        (orderChain && orderChain[0] === alias)
      ) {
        const subQuery = !!queryInclude && queryInclude[<keyof T>alias];
        const targetModel = pool.models[aliasModelMap[alias]];

        if (!targetModel.sequelizeModel) {
          return;
        }

        const includedModel: Sequelize.IncludeOptions = {
          as: alias,
          attributes: targetModel.allowedAttributes,
          model: targetModel.sequelizeModel,
          required: typeof subQuery === 'object' ? !!subQuery.required : false,
        };

        if (typeof subQuery === 'object' && subQuery) {
          const attributes = targetModel.sanitizeAttributes(subQuery.attributes);
          if (attributes) {
            includedModel.attributes = attributes;
          }
          const where = buildWhere(subQuery, pool, aliasModelMap[alias]);
          if (where) {
            includedModel.where = where;
          }
        }

        const nestedInclude = buildNestedInclude(
          pool,
          (typeof subQuery === 'object' && subQuery.include) || undefined,
          (Array.isArray(orderChain) && orderChain.slice(1)) || undefined,
          aliasModelMap[alias],
        );

        if (nestedInclude) {
          includedModel.include = nestedInclude;
        }

        include.push(includedModel);
      }
    });

    return include;
  }

  return null;
}
