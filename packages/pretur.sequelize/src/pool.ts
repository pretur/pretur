import * as Sequelize from 'sequelize';
import { SpecType } from 'pretur.spec';
import { Query, MutateRequest } from 'pretur.sync';
import { ResolveResult } from './resolver';
import { SyncResult } from './synchronizer';
import { Provider } from './provider';

export type Transaction = Sequelize.Transaction;

export interface ProviderMap {
  [scope: string]: { [model: string]: Provider<any> };
}

export interface ProviderPool<M extends ProviderMap = ProviderMap> {
  providers: M;
  resolve<T extends SpecType>(
    transaction: Transaction,
    scope: string,
    model: T['name'],
    query: Query<T>,
    context?: any,
  ): Promise<ResolveResult<T>>;
  sync<T extends SpecType>(
    transaction: Transaction,
    item: MutateRequest<T>,
    context?: any,
  ): Promise<SyncResult<T>>;
}

export function buildProviderPool<M extends ProviderMap>(providers: M): ProviderPool<M> {
  const pool = <ProviderPool<M>>{ providers };

  pool.resolve = async function resolve<T extends SpecType>(
    transaction: Transaction,
    scope: string,
    model: T['name'],
    query: Query<T>,
    context: any,
  ): Promise<ResolveResult<T>> {
    if (!model) {
      throw new Error('query or query.model was not specified.');
    }

    if (!pool.providers[scope]) {
      throw new Error(`scope ${scope} does not exist`);
    }

    const provider = pool.providers[scope][model];

    if (!provider) {
      throw new Error(`${model} is not a valid model`);
    }

    if (!provider.metadata.resolver) {
      throw new Error(`${model} has no resolver`);
    }

    return provider.metadata.resolver(transaction, query, context);
  };

  pool.sync = async function sync<T extends SpecType>(
    transaction: Transaction,
    item: MutateRequest<T>,
    context: any,
  ): Promise<SyncResult<T>> {
    if (!item.model) {
      throw new Error('item.model was not specified.');
    }

    if (!pool.providers[item.scope]) {
      throw new Error(`scope ${item.scope} does not exist`);
    }

    const provider = pool.providers[item.scope][item.model];

    if (!provider) {
      throw new Error(`${item.model} is not a valid model`);
    }

    if (!provider.metadata.synchronizer) {
      throw new Error(`${item.model} has no synchronizer`);
    }

    return provider.metadata.synchronizer(transaction, item, context);
  };

  for (const map of Object.values(providers)) {
    for (const descriptor of Object.values(map)) {
      descriptor.metadata.initialize(pool);
    }
  }

  return pool;
}
