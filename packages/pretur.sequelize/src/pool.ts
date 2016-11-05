import * as Bluebird from 'bluebird';
import * as Sequelize from 'sequelize';
import { Query, SynchronizerItem } from 'pretur.sync';
import { ResolveResult } from './resolver';
import { ModelDescriptor } from './descriptor';
import { ResultItemAppender } from './synchronizer';

export interface ModelDescriptorMap {
  [model: string]: ModelDescriptor<any>;
}

export interface Pool {
  models: ModelDescriptorMap;
  resolve(query: Query, context: any): Bluebird<ResolveResult<any>>;
  sync(
    transaction: Sequelize.Transaction,
    item: SynchronizerItem<any>,
    rip: ResultItemAppender,
    context: any,
  ): Bluebird<number | void>;
}

export function createPool(...descriptors: ModelDescriptor<any>[]): Pool {
  const pool: Pool = <any>{
    models: descriptors.reduce(
      (m, d) => {
        m[d.name] = d;
        return m;
      },
      <ModelDescriptorMap>{}
    ),
  };

  pool.resolve = function resolve(query: Query, context: any): Bluebird<ResolveResult<any>> {
    if (!query || !query.model) {
      return Bluebird.reject(new Error('query or query.model was not specified.'));
    }

    const model = pool.models[query.model];

    if (!model) {
      return Bluebird.reject(new Error(`${query.model} is not a valid model`));
    }

    if (!model.resolver) {
      return Bluebird.reject(new Error(`${query.model} has no resolver`));
    }

    return model.resolver(query, context);
  };

  pool.sync = function sync(
    transaction: Sequelize.Transaction,
    item: SynchronizerItem<any>,
    rip: ResultItemAppender,
    context: any,
  ): Bluebird<number | void> {
    if (!item.model) {
      return Bluebird.reject(new Error('item.model was not specified.'));
    }

    const model = pool.models[item.model];

    if (!model) {
      return Bluebird.reject(new Error(`${item.model} is not a valid model`));
    }

    if (!model.synchronizer) {
      return Bluebird.reject(new Error(`${item.model} has no synchronizer`));
    }

    return model.synchronizer(transaction, item, rip, context);
  };

  descriptors.forEach(d => d.initialize(pool));

  return pool;
}
