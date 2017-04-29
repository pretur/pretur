import * as Sequelize from 'sequelize';
import { intersection } from 'lodash';
import { Query, SubQuery, QueryInclude } from 'pretur.sync';
import { Spec } from 'pretur.spec';
import { Pool } from './pool';
import { SequelizeModel } from './sequelizeModel';

export interface ResolveResult<T> {
  data: Partial<T>[];
  count?: number;
}

export interface Resolver<T> {
  (query?: Partial<Query<T>>, context?: any): Promise<ResolveResult<T>>;
}

export interface CustomResolver<T> {
  (query: Query<T> | undefined, pool: Pool, context: any): Promise<ResolveResult<T>>;
}

export interface UnitializedResolver<T> {
  resolver: Resolver<T>;
  initialize(pool: Pool): void;
}

export interface ResolveInterceptor<T> {
  (query: Query<T> | undefined, result: ResolveResult<T>, context: any): Promise<ResolveResult<T>>;
}

export interface BuildResolverOptions<T> {
  intercept?: ResolveInterceptor<T>;
  queryTransformer?(query: Query<T> | undefined): Query<T> | undefined;
}

export function buildCustomResolver<T extends object>(
  _: Spec<T>,
  resolver: CustomResolver<T>,
): UnitializedResolver<T> {
  let pool: Pool = <any>undefined;

  function wrappedResolver(query: Query<T>, context: any): Promise<ResolveResult<T>> {
    return resolver(query, pool, context);
  }

  function initialize(p: Pool) {
    pool = p;
  }

  return { resolver: wrappedResolver, initialize };
}

export function buildResolver<T extends object>(
  spec: Spec<T>,
  options?: BuildResolverOptions<T>,
): UnitializedResolver<T> {
  let pool: Pool = <any>undefined;

  async function resolver(rawQuery?: Query<T>, context?: any): Promise<ResolveResult<T>> {
    let query = rawQuery;

    if (options && typeof options.queryTransformer === 'function') {
      query = options.queryTransformer(rawQuery);
    }

    const model = <SequelizeModel<T>>pool.models[spec.name].sequelizeModel;

    if (!model) {
      throw new Error(`${model} is not a valid model`);
    }

    const findOptions: Sequelize.FindOptions = {};

    findOptions.attributes = pool.models[spec.name].sanitizeAttributes(query && query.attributes);

    const include = buildInclude(query, pool, spec.name);
    if (include && include.length > 0) {
      findOptions.include = include;
    }

    if (query && query.byId) {
      const where = <any>{};

      for (const pk of pool.models[spec.name].primaryKeys) {
        if (query.byId[pk] === undefined) {
          throw new Error(`byId must contain every primary key. ${pk} is missing`);
        }
        where[pk] = query.byId[pk];
      }

      const instance = await model.findOne({ ...findOptions, where });

      if (!instance) {
        return { data: [] };
      }

      const data = [instance.get({ plain: true })];

      if (options && options.intercept) {
        const intercept = options.intercept;
        return intercept(query, { data }, context);
      }

      return { data };
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
      const { rows, count } = await model.findAndCountAll(findOptions);

      const data = rows.map(row => row.get({ plain: true }));

      if (options && options.intercept) {
        const intercept = options.intercept;
        return intercept(query, { data, count }, context);
      }

      return { data, count };
    }

    const rows = await model.findAll(findOptions);
    const data = rows.map(row => row.get({ plain: true }));
    if (options && options.intercept) {
      const intercept = options.intercept;
      return intercept(query, { data }, context);
    }

    return { data };
  }

  function initialize(p: Pool) {
    pool = p;
  }

  return { resolver, initialize };
}

function buildOrder<T>(
  query: Query<T> | undefined,
  pool: Pool,
  model: string,
): any[] | undefined {
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
      return;
    }

    return [defaultOrder.slice()];
  }

  return [parameters];
}

function buildWhere<T>(
  query: Query<T> | SubQuery<T> | undefined,
  pool: Pool,
  modelName: string,
): Sequelize.WhereOptions | undefined {
  const where: Sequelize.WhereOptions = {};
  const model = pool.models[modelName];

  if (query && query.filters) {
    const filters = query.filters;
    const filtersKeys = intersection(
      Object.keys(query.filters),
      [...model.allowedAttributes, '$and', '$or'],
    );

    filtersKeys.map(field => {
      const value = filters[<keyof T>field];

      if (
        model.fieldWhereBuilders &&
        typeof model.fieldWhereBuilders[field] === 'function'
      ) {
        where[field] = model.fieldWhereBuilders[field](value);
        // tslint:disable:no-null-keyword
      } else if (value === null) {
        where[field] = null!;
        // tslint:enable:no-null-keyword
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
  return;
}

function buildInclude<T>(
  query: Query<T> | undefined,
  pool: Pool,
  model: string,
): Sequelize.IncludeOptions[] | undefined {
  const queryInclude = query && query.include;
  const orderChain = query && query.order && query.order.chain;

  return buildNestedInclude<T>(pool, queryInclude, orderChain, model);
}

function buildNestedInclude<T>(
  pool: Pool,
  queryInclude: QueryInclude<T> | undefined,
  orderChain: string[] | undefined,
  model: string,
): Sequelize.IncludeOptions[] | undefined {
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

  return;
}
