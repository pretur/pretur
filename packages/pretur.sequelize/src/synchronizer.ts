import * as Bluebird from 'bluebird';
import * as Sequelize from 'sequelize';
import { intersection, assign } from 'lodash';
import { I18nBundle } from 'pretur.i18n';
import { Spec } from 'pretur.spec';
import { Pool } from './pool';
import {
  SynchronizerItem,
  SynchronizerInsert,
  SynchronizerUpdate,
  SynchronizerRemove,
} from 'pretur.sync';

export interface ResultItemAppender {
  appendError(error: I18nBundle): void;
  appendWarning(warning: I18nBundle): void;
}

export interface ErrorHandler<T> {
  (data: T, error: any, rip: ResultItemAppender): Bluebird<void>;
}

export interface Insert<T> {
  (
    transaction: Sequelize.Transaction,
    item: SynchronizerInsert<T>,
    rip: ResultItemAppender
  ): Bluebird<void>;
}

export interface Update<T> {
  (
    transaction: Sequelize.Transaction,
    item: SynchronizerUpdate<T>,
    rip: ResultItemAppender
  ): Bluebird<void>;
}

export interface Remove {
  (
    transaction: Sequelize.Transaction,
    item: SynchronizerRemove,
    rip: ResultItemAppender
  ): Bluebird<void>;
}

export interface Synchronizer<T> {
  (
    transaction: Sequelize.Transaction,
    item: SynchronizerItem<T>,
    rip: ResultItemAppender
  ): Bluebird<void>;
}

export interface UnitializedSynchronizer<T> {
  synchronizer: Synchronizer<T>;
  initialize(pool: Pool): void;
}

export interface SynchronizationInterceptor<T> {
  (
    transaction: Sequelize.Transaction,
    item: T,
    rip: ResultItemAppender,
    pool: Pool
  ): Bluebird<boolean>;
}

export interface BuildSynchronizerOptions<T> {
  insertErrorHandler?: ErrorHandler<SynchronizerInsert<T>>;
  updateErrorHandler?: ErrorHandler<SynchronizerUpdate<T>>;
  removeErrorHandler?: ErrorHandler<SynchronizerRemove>;
  insertInterceptor?: SynchronizationInterceptor<SynchronizerInsert<T>>;
  updateInterceptor?: SynchronizationInterceptor<SynchronizerUpdate<T>>;
  removeInterceptor?: SynchronizationInterceptor<SynchronizerRemove>;
}

export function buildSynchronizer<T>(
  spec: Spec<T>,
  options?: BuildSynchronizerOptions<T>
): UnitializedSynchronizer<T> {
  let pool: Pool | null = null;

  function synchronizer(
    transaction: Sequelize.Transaction,
    item: SynchronizerItem<T>,
    rip: ResultItemAppender
  ): Bluebird<void> {

    if (item.action === 'INSERT') {
      return insert(
        pool!,
        spec.name,
        (options && options.insertErrorHandler) || undefined,
        (options && options.insertInterceptor) || undefined,
        transaction,
        item,
        rip
      );
    }

    if (item.action === 'UPDATE') {
      return update(
        pool!,
        spec.name,
        (options && options.updateErrorHandler) || undefined,
        (options && options.updateInterceptor) || undefined,
        transaction,
        item,
        rip
      );
    }

    if (item.action === 'REMOVE') {
      return remove(
        pool!,
        spec.name,
        (options && options.removeErrorHandler) || undefined,
        (options && options.removeInterceptor) || undefined,
        transaction,
        item,
        rip
      );
    }

    return Bluebird.reject(new Error('provided item is invalid'));
  }

  function initialize(p: Pool) {
    pool = p;
  }

  return { synchronizer, initialize };
}

const INJECTED_MASTER_RESOLUTION_KEY = '__INJECTED_MASTER_RESOLUTION_KEY';

function insert<T>(
  pool: Pool,
  model: string,
  errorHandler: ErrorHandler<SynchronizerInsert<T>> | undefined,
  interceptor: SynchronizationInterceptor<SynchronizerInsert<T>> | undefined,
  transaction: Sequelize.Transaction,
  item: SynchronizerInsert<T>,
  rip: ResultItemAppender
): Bluebird<void> {
  function defaultInsertBehavior() {
    const data: T = assign<{}, T>({}, item.data);
    const masters: Bluebird<any>[] = [];

    pool.models[model].spec.relations.master.forEach(master => {
      const masterData = (<any>data)[master.alias];
      if (masterData) {
        const masterModel = pool.models[master.model];

        masters.push(masterModel.synchronizer!(
          transaction,
          <SynchronizerInsert<any>>{
            action: 'INSERT',
            data: masterData,
            itemId: item.itemId,
            model: masterModel.name,
            [INJECTED_MASTER_RESOLUTION_KEY]: (id: any) => (<any>data)[master.key] = id,
          },
          rip
        ));

        (<any>data)[master.alias] = null;
      }
    });

    const modelCreationPromise = Bluebird.all(masters).then(() =>
      pool.models[model].sequelizeModel!.create(data, {
        transaction,
        fields: pool.models[model].allowedAttributes,
      })
    );

    const promise = modelCreationPromise.then(instance => {

      if ((<any>item)[INJECTED_MASTER_RESOLUTION_KEY]) {
        (<any>item)[INJECTED_MASTER_RESOLUTION_KEY](instance[pool.models[model].primaryKey!]);
      }

      const details: Bluebird<any>[] = [];
      const aliasModelMap = pool.models[model].aliasModelMap;
      const aliasKeyMap = pool.models[model].aliasKeyMap;

      Object.keys(aliasModelMap).forEach(alias => {
        const nested = (<any>data)[alias];
        if (nested) {

          if (Array.isArray(nested)) {
            nested.forEach(nestedItem => {

              const nestedInsertData = assign(
                {},
                nestedItem,
                { [aliasKeyMap[alias]]: instance[pool.models[model].primaryKey!] }
              );

              details.push(pool.models[aliasModelMap[alias]].synchronizer!(
                transaction,
                <SynchronizerInsert<any>>{
                  action: 'INSERT',
                  data: nestedInsertData,
                  itemId: item.itemId,
                  model: aliasModelMap[alias],
                },
                rip
              ));
            });

          } else {

            const nestedInsertData = assign(
              {},
              nested,
              { [aliasKeyMap[alias]]: instance[pool.models[model].primaryKey!] }
            );

            details.push(pool.models[aliasModelMap[alias]].synchronizer!(
              transaction,
              <SynchronizerInsert<any>>{
                action: 'INSERT',
                data: nestedInsertData,
                itemId: item.itemId,
                model: aliasModelMap[alias],
              },
              rip
            ));
          }
        }
      });

      return details.length > 0 ? Bluebird.all(details) : undefined!;
    });

    if (typeof errorHandler === 'function') {
      return promise.catch(error => errorHandler(item, error, rip));
    }

    return promise;
  }

  if (typeof interceptor === 'function') {
    return interceptor(transaction, item, rip, pool).then<void>(resume => {
      if (resume) {
        return <any>defaultInsertBehavior();
      }
    });
  }
  return <any>defaultInsertBehavior();
}

function update<T>(
  pool: Pool,
  model: string,
  errorHandler: ErrorHandler<SynchronizerUpdate<T>> | undefined,
  interceptor: SynchronizationInterceptor<SynchronizerUpdate<T>> | undefined,
  transaction: Sequelize.Transaction,
  item: SynchronizerUpdate<T>,
  rip: ResultItemAppender
): Bluebird<void> {
  function defaultUpdateBehavior() {
    const primaryKey = pool.models[model].primaryKey!;
    const promise = pool.models[model].sequelizeModel!.update(item.data, {
      transaction,
      fields: buildUpdateAttributes(pool.models[model].mutableAttributes, item.attributes),
      validate: true,
      where: { [primaryKey]: (<any>item.data)[primaryKey] },
    });

    if (typeof errorHandler === 'function') {
      return promise.catch(error => errorHandler(item, error, rip));
    }

    return promise;
  }

  if (typeof interceptor === 'function') {
    return interceptor(transaction, item, rip, pool).then(resume => {
      if (resume) {
        return <any>defaultUpdateBehavior();
      }
    });
  }
  return <any>defaultUpdateBehavior();
}

function remove(
  pool: Pool,
  model: string,
  errorHandler: ErrorHandler<SynchronizerRemove> | undefined,
  interceptor: SynchronizationInterceptor<SynchronizerRemove> | undefined,
  transaction: Sequelize.Transaction,
  item: SynchronizerRemove,
  rip: ResultItemAppender
): Bluebird<void> {
  function defaultRemoveBehavior() {
    const promise = pool.models[model].sequelizeModel!.destroy({
      transaction,
      where: { id: item.targetId },
    });

    if (typeof errorHandler === 'function') {
      return promise.catch(error => errorHandler(item, error, rip));
    }

    return promise;
  }

  if (typeof interceptor === 'function') {
    return interceptor(transaction, item, rip, pool).then(resume => {
      if (resume) {
        return <any>defaultRemoveBehavior();
      }
    });
  }
  return <any>defaultRemoveBehavior();
}

function buildUpdateAttributes(allowedAttributes: string[], updateAttributes: string[]): string[] {
  if (Array.isArray(allowedAttributes)) {
    return intersection(allowedAttributes, updateAttributes);
  }
  return updateAttributes;
}
