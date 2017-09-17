import * as Sequelize from 'sequelize';
import { SpecType } from 'pretur.spec';
import { Query, MutateRequest } from 'pretur.sync';
import { ResolveResult } from './resolver';
import { SyncResult } from './synchronizer';
import { Provider } from './provider';

export type Transaction = Sequelize.Transaction;

export interface ProviderMap {
  [model: string]: Provider<any>;
}

export interface ProviderPool {
  providers: ProviderMap;
  resolve<T extends SpecType>(
    transaction: Transaction,
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

export function buildProviderPool(...descriptors: Provider<any>[]): ProviderPool {
  const pool = <ProviderPool>{
    providers: descriptors.reduce(
      (m, d) => {
        m[d.name] = d;
        return m;
      },
      <ProviderMap>{},
    ),
  };

  pool.resolve = async function resolve<T extends SpecType>(
    transaction: Transaction,
    model: T['name'],
    query: Query<T>,
    context: any,
  ): Promise<ResolveResult<T>> {
    if (!model) {
      throw new Error('query or query.model was not specified.');
    }

    const provider = pool.providers[model];

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

    const provider = pool.providers[item.model];

    if (!provider) {
      throw new Error(`${item.model} is not a valid model`);
    }

    if (!provider.metadata.synchronizer) {
      throw new Error(`${item.model} has no synchronizer`);
    }

    return provider.metadata.synchronizer(transaction, item, context);
  };

  for (const descriptor of descriptors) {
    descriptor.metadata.initialize(pool);
  }

  return pool;
}
