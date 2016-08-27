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
  resolve(query: Query): Bluebird<ResolveResult<any>>;
  sync(
    transaction: Sequelize.Transaction,
    item: SynchronizerItem<any>,
    rip: ResultItemAppender
  ): Bluebird<void>;
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

  pool.resolve = function resolve(query: Query): Bluebird<ResolveResult<any>> {
    if (!query || !query.model) {
      return Bluebird.reject(new Error('query or query.model was not specified.'));
    }

    if (!pool.models[query.model]) {
      return Bluebird.reject(new Error(`${query.model} is not a valid model`));
    }

    return pool.models[query.model].resolver!(query);
  };

  pool.sync = function sync(
    transaction: Sequelize.Transaction,
    item: SynchronizerItem<any>,
    rip: ResultItemAppender
  ): Bluebird<void> {
    if (!item.model) {
      return Bluebird.reject(new Error('item.model was not specified.'));
    }

    if (!pool.models[item.model]) {
      return Bluebird.reject(new Error(`${item.model} is not a valid model`));
    }

    return pool.models[item.model].synchronizer!(transaction, item, rip);
  };

  descriptors.forEach(d => d.initialize(pool));

  return pool;
}
