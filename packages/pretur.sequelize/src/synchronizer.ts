import * as Bluebird from 'bluebird';
import * as Sequelize from 'sequelize';
import { intersection, assign, noop } from 'lodash';
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
    rip: ResultItemAppender,
    context: any,
  ): Bluebird<void>;
}

export interface Update<T> {
  (
    transaction: Sequelize.Transaction,
    item: SynchronizerUpdate<T>,
    rip: ResultItemAppender,
    context: any,
  ): Bluebird<void>;
}

export interface Remove<T> {
  (
    transaction: Sequelize.Transaction,
    item: SynchronizerRemove<T>,
    rip: ResultItemAppender,
    context: any,
  ): Bluebird<void>;
}

export interface Synchronizer<T> {
  (
    transaction: Sequelize.Transaction,
    item: SynchronizerItem<T>,
    rip: ResultItemAppender,
    context: any,
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
    pool: Pool,
    context: any,
  ): Bluebird<boolean>;
}

export interface BuildSynchronizerOptions<T> {
  insertErrorHandler?: ErrorHandler<SynchronizerInsert<T>>;
  updateErrorHandler?: ErrorHandler<SynchronizerUpdate<T>>;
  removeErrorHandler?: ErrorHandler<SynchronizerRemove<T>>;
  insertInterceptor?: SynchronizationInterceptor<SynchronizerInsert<T>>;
  updateInterceptor?: SynchronizationInterceptor<SynchronizerUpdate<T>>;
  removeInterceptor?: SynchronizationInterceptor<SynchronizerRemove<T>>;
}

export function buildSynchronizer<T>(
  spec: Spec<T>,
  options?: BuildSynchronizerOptions<T>,
): UnitializedSynchronizer<T> {
  let pool: Pool = <any>null;

  function synchronizer(
    transaction: Sequelize.Transaction,
    item: SynchronizerItem<T>,
    rip: ResultItemAppender,
    context: any,
  ): Bluebird<void> {

    if (item.action === 'INSERT') {
      return insert(
        pool,
        spec.name,
        (options && options.insertErrorHandler) || undefined,
        (options && options.insertInterceptor) || undefined,
        transaction,
        item,
        rip,
        context,
      );
    }

    if (item.action === 'UPDATE') {
      return update(
        pool,
        spec.name,
        (options && options.updateErrorHandler) || undefined,
        (options && options.updateInterceptor) || undefined,
        transaction,
        item,
        rip,
        context,
      );
    }

    if (item.action === 'REMOVE') {
      return remove(
        pool,
        spec.name,
        (options && options.removeErrorHandler) || undefined,
        (options && options.removeInterceptor) || undefined,
        transaction,
        item,
        rip,
        context,
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
  modelName: string,
  errorHandler: ErrorHandler<SynchronizerInsert<T>> | undefined,
  interceptor: SynchronizationInterceptor<SynchronizerInsert<T>> | undefined,
  transaction: Sequelize.Transaction,
  item: SynchronizerInsert<T>,
  rip: ResultItemAppender,
  context: any,
): Bluebird<void> {
  const model = pool.models[modelName];

  if (!model) {
    throw new Error(`model ${modelName} does not exist`);
  }

  function defaultInsertBehavior(): Bluebird<void> {
    const data: T = assign({}, item.data);
    const masters: Bluebird<any>[] = [];

    model.spec.relations.master.forEach(master => {
      const masterData = (<any>data)[master.alias];
      if (masterData) {
        const masterModel = pool.models[master.model];

        if (!masterModel.synchronizer) {
          throw new Error(`model ${masterModel.name} must have a synchronizer`);
        }

        masters.push(masterModel.synchronizer(
          transaction,
          <SynchronizerInsert<any>>{
            action: 'INSERT',
            data: masterData,
            itemId: item.itemId,
            model: masterModel.name,
            [INJECTED_MASTER_RESOLUTION_KEY]: (id: any) => (<any>data)[master.key] = id,
          },
          rip,
          context,
        ));

        (<any>data)[master.alias] = null;
      }
    });

    const modelCreationPromise = Bluebird.all(masters).then(() => {
      if (!model.sequelizeModel) {
        throw new Error(`model ${model.name} must have a sequelize model`);
      }

      return model.sequelizeModel.create(data, {
        transaction,
        fields: model.allowedAttributes,
      });
    });

    const promise = modelCreationPromise.then(instance => {
      if (!model.primaryKey) {
        throw new Error(`model ${model.name} must have a primaryKey`);
      }

      if ((<any>item)[INJECTED_MASTER_RESOLUTION_KEY]) {
        (<any>item)[INJECTED_MASTER_RESOLUTION_KEY](instance[model.primaryKey]);
      }

      const details: Bluebird<any>[] = [];
      const aliasModelMap = model.aliasModelMap;
      const aliasKeyMap = model.aliasKeyMap;

      Object.keys(aliasModelMap).forEach(alias => {
        const nested = (<any>data)[alias];
        const targetModel = pool.models[aliasModelMap[alias]];

        if (!targetModel) {
          throw new Error(`model ${aliasModelMap[alias]} does not exist`);
        }

        if (nested) {

          if (Array.isArray(nested)) {
            nested.forEach(nestedItem => {

              if (!targetModel.synchronizer) {
                throw new Error(`model ${targetModel.name} must have a synchronizer`);
              }

              if (!model.primaryKey) {
                throw new Error(`model ${model.name} must have a primaryKey`);
              }

              const nestedInsertData = assign(
                {},
                nestedItem,
                { [aliasKeyMap[alias]]: instance[model.primaryKey] }
              );

              details.push(targetModel.synchronizer(
                transaction,
                <SynchronizerInsert<any>>{
                  action: 'INSERT',
                  data: nestedInsertData,
                  itemId: item.itemId,
                  model: aliasModelMap[alias],
                },
                rip,
                context,
              ));
            });

          } else {

            if (!targetModel.synchronizer) {
              throw new Error(`model ${targetModel.name} must have a synchronizer`);
            }

            if (!model.primaryKey) {
              throw new Error(`model ${model.name} must have a primaryKey`);
            }

            const nestedInsertData = assign(
              {},
              nested,
              { [aliasKeyMap[alias]]: instance[model.primaryKey] }
            );

            details.push(targetModel.synchronizer(
              transaction,
              <SynchronizerInsert<any>>{
                action: 'INSERT',
                data: nestedInsertData,
                itemId: item.itemId,
                model: aliasModelMap[alias],
              },
              rip,
              context,
            ));
          }
        }
      });

      return details.length > 0 ? Bluebird.all(details) : Bluebird.resolve(undefined);
    }).then(noop);

    if (typeof errorHandler === 'function') {
      return promise.catch(error => errorHandler(item, error, rip));
    }

    return promise;
  }

  if (typeof interceptor === 'function') {
    return interceptor(transaction, item, rip, pool, context).then(resume => {
      if (resume) {
        return defaultInsertBehavior();
      }
      return;
    });
  }
  return defaultInsertBehavior();
}

function update<T>(
  pool: Pool,
  modelName: string,
  errorHandler: ErrorHandler<SynchronizerUpdate<T>> | undefined,
  interceptor: SynchronizationInterceptor<SynchronizerUpdate<T>> | undefined,
  transaction: Sequelize.Transaction,
  item: SynchronizerUpdate<T>,
  rip: ResultItemAppender,
  context: any,
): Bluebird<void> {
  const model = pool.models[modelName];

  if (!model) {
    throw new Error(`model ${modelName} does not exist`);
  }

  function defaultUpdateBehavior(): Bluebird<void> {
    if (!model.sequelizeModel) {
      throw new Error(`model ${model.name} must have a sequelize model`);
    }

    if (!model.primaryKey) {
      throw new Error(`model ${model.name} must have a primaryKey`);
    }

    const promise = model.sequelizeModel.update(item.data, {
      transaction,
      fields: buildUpdateAttributes(model.mutableAttributes, item.attributes),
      validate: true,
      where: { [model.primaryKey]: (<any>item.data)[model.primaryKey] },
    }).then(noop);

    if (typeof errorHandler === 'function') {
      return promise.catch(error => errorHandler(item, error, rip));
    }

    return promise;
  }

  if (typeof interceptor === 'function') {
    return interceptor(transaction, item, rip, pool, context).then(resume => {
      if (resume) {
        return defaultUpdateBehavior();
      }
      return;
    });
  }
  return defaultUpdateBehavior();
}

function remove<T>(
  pool: Pool,
  modelName: string,
  errorHandler: ErrorHandler<SynchronizerRemove<T>> | undefined,
  interceptor: SynchronizationInterceptor<SynchronizerRemove<T>> | undefined,
  transaction: Sequelize.Transaction,
  item: SynchronizerRemove<T>,
  rip: ResultItemAppender,
  context: any,
): Bluebird<void> {
  const model = pool.models[modelName];

  if (!model) {
    throw new Error(`model ${modelName} does not exist`);
  }

  function defaultRemoveBehavior(): Bluebird<void> {
    if (!model.sequelizeModel) {
      throw new Error(`model ${model.name} must have a sequelize model`);
    }
    const attributes = intersection(Object.keys(item.identifiers), model.allowedAttributes);
    const filteredIdentifiers: Sequelize.WhereOptions = {};

    attributes.forEach(identifier => {
      filteredIdentifiers[identifier] = (<any>item.identifiers)[identifier];
    });

    const promise = model.sequelizeModel.destroy({
      transaction,
      where: filteredIdentifiers,
    }).then(noop);

    if (typeof errorHandler === 'function') {
      return promise.catch(error => errorHandler(item, error, rip));
    }

    return promise;
  }

  if (typeof interceptor === 'function') {
    return interceptor(transaction, item, rip, pool, context).then(resume => {
      if (resume) {
        return defaultRemoveBehavior();
      }
      return;
    });
  }
  return defaultRemoveBehavior();
}

function buildUpdateAttributes(allowedAttributes: string[], updateAttributes: string[]): string[] {
  if (Array.isArray(allowedAttributes)) {
    return intersection(allowedAttributes, updateAttributes);
  }
  return updateAttributes;
}
