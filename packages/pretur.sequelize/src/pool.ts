import * as Sequelize from 'sequelize';
import { SpecType } from 'pretur.spec';
import { Query, MutateRequest } from 'pretur.sync';
import { ResolveResult } from './resolver';
import { ModelDescriptor } from './descriptor';
import { ResultItemAppender } from './synchronizer';

export type Transaction = Sequelize.Transaction;

export interface ModelDescriptorMap {
  [model: string]: ModelDescriptor<any>;
}

export interface Pool {
  models: ModelDescriptorMap;
  resolve<T extends SpecType>(query: Query<T>, context: any): Promise<ResolveResult<T>>;
  sync<T extends SpecType>(
    transaction: Transaction,
    item: MutateRequest<T>,
    rip: ResultItemAppender,
    context: any,
  ): Promise<Partial<T['fields']> | void>;
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

  pool.resolve = async function resolve<T extends SpecType>(
    query: Query<T>,
    context: any,
  ): Promise<ResolveResult<T>> {
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

  pool.sync = async function sync<T extends SpecType>(
    transaction: Transaction,
    item: MutateRequest<T>,
    rip: ResultItemAppender,
    context: any,
  ): Promise<Partial<T['fields']> | void> {
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

  for (const descriptor of descriptors) {
    descriptor.initialize(pool);
  }

  return pool;
}
