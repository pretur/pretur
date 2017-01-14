import * as Bluebird from 'bluebird';
import * as Sequelize from 'sequelize';
import { Query, InsertRequest, UpdateRequest, RemoveRequest } from 'pretur.sync';
import { ResolveResult } from './resolver';
import { ModelDescriptor } from './descriptor';
import { ResultItemAppender } from './synchronizer';

export interface ModelDescriptorMap {
  [model: string]: ModelDescriptor<any>;
}

export interface Pool {
  models: ModelDescriptorMap;
  resolve<T>(query: Query<T>, context: any): Bluebird<ResolveResult<T>>;
  sync<T>(
    transaction: Sequelize.Transaction,
    item: InsertRequest<T> | UpdateRequest<T> | RemoveRequest<T>,
    rip: ResultItemAppender,
    context: any,
  ): Bluebird<Partial<T> | void>;
}

export function createPool(...descriptors: ModelDescriptor<any>[]): Pool {
  const pool: Pool = <any>{
    models: descriptors.reduce(
      (m, d) => {
        m[d.name] = d;
        return m;
      },
      <ModelDescriptorMap>{},
    ),
  };

  pool.resolve = async function resolve<T>(
    query: Query<T>,
    context: any,
  ): Bluebird<ResolveResult<T>> {
    if (!query || !query.model) {
      throw new Error('query or query.model was not specified.');
    }

    const model = pool.models[query.model];

    if (!model) {
      throw new Error(`${query.model} is not a valid model`);
    }

    if (!model.resolver) {
      throw new Error(`${query.model} has no resolver`);
    }

    return model.resolver(query, context);
  };

  pool.sync = async function sync<T>(
    transaction: Sequelize.Transaction,
    item: InsertRequest<T> | UpdateRequest<T> | RemoveRequest<T>,
    rip: ResultItemAppender,
    context: any,
  ): Bluebird<Partial<T> | void> {
    if (!item.model) {
      throw new Error('item.model was not specified.');
    }

    const model = pool.models[item.model];

    if (!model) {
      throw new Error(`${item.model} is not a valid model`);
    }

    if (!model.synchronizer) {
      throw new Error(`${item.model} has no synchronizer`);
    }

    return model.synchronizer(transaction, item, rip, context);
  };

  descriptors.forEach(d => d.initialize(pool));

  return pool;
}
