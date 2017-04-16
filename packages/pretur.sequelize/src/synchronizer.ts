import * as Bluebird from 'bluebird';
import * as Sequelize from 'sequelize';
import { intersection, pick } from 'lodash';
import { I18nBundle } from 'pretur.i18n';
import { Spec } from 'pretur.spec';
import { ModelDescriptor } from './descriptor';
import { Pool } from './pool';
import {
  InsertMutateRequest,
  UpdateMutateRequest,
  RemoveMutateRequest,
  MutateRequest,
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
    item: InsertMutateRequest<T>,
    rip: ResultItemAppender,
    context: any,
  ): Bluebird<Partial<T> | void>;
}

export interface Update<T> {
  (
    transaction: Sequelize.Transaction,
    item: UpdateMutateRequest<T>,
    rip: ResultItemAppender,
    context: any,
  ): Bluebird<void>;
}

export interface Remove<T> {
  (
    transaction: Sequelize.Transaction,
    item: RemoveMutateRequest<T>,
    rip: ResultItemAppender,
    context: any,
  ): Bluebird<void>;
}

export interface Synchronizer<T> {
  (
    transaction: Sequelize.Transaction,
    item: MutateRequest<T>,
    rip: ResultItemAppender,
    context: any,
  ): Bluebird<Partial<T> | void>;
}

export interface UnitializedSynchronizer<T> {
  synchronizer: Synchronizer<T>;
  initialize(pool: Pool): void;
}

export interface SynchronizationInterceptor<T, R> {
  (
    transaction: Sequelize.Transaction,
    item: T,
    rip: ResultItemAppender,
    pool: Pool,
    context: any,
  ): Bluebird<R>;
}

export interface BuildSynchronizerOptions<T> {
  insertErrorHandler?: ErrorHandler<InsertMutateRequest<T>>;
  updateErrorHandler?: ErrorHandler<UpdateMutateRequest<T>>;
  removeErrorHandler?: ErrorHandler<RemoveMutateRequest<T>>;
  insertInterceptor?: SynchronizationInterceptor<InsertMutateRequest<T>, Partial<T> | boolean>;
  updateInterceptor?: SynchronizationInterceptor<UpdateMutateRequest<T>, boolean>;
  removeInterceptor?: SynchronizationInterceptor<RemoveMutateRequest<T>, boolean>;
}

export function buildSynchronizer<T extends object>(
  spec: Spec<T>,
  options?: BuildSynchronizerOptions<T>,
): UnitializedSynchronizer<T> {
  let pool: Pool = <any>undefined;

  async function synchronizer(
    transaction: Sequelize.Transaction,
    item: MutateRequest<T>,
    rip: ResultItemAppender,
    context: any,
  ): Bluebird<Partial<T> | void> {

    if (item.action === 'insert') {
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

    if (item.action === 'update') {
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

    if (item.action === 'remove') {
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

    throw new Error('provided item is invalid');
  }

  function initialize(p: Pool) {
    pool = p;
  }

  return { synchronizer, initialize };
}

const INJECTED_MASTER_RESOLUTION_KEY = '__INJECTED_MASTER_RESOLUTION_KEY';

async function insert<T extends object>(
  pool: Pool,
  modelName: string,
  errorHandler: ErrorHandler<InsertMutateRequest<T>> | undefined,
  interceptor: SynchronizationInterceptor<InsertMutateRequest<T>, Partial<T> | boolean> | undefined,
  transaction: Sequelize.Transaction,
  item: InsertMutateRequest<T>,
  rip: ResultItemAppender,
  context: any,
): Bluebird<Partial<T> | void> {
  const model = <ModelDescriptor<T>>pool.models[modelName];

  if (!model) {
    throw new Error(`model ${modelName} does not exist`);
  }

  async function defaultInsertBehavior(): Bluebird<void | Partial<T>> {
    const data: Partial<T> = { ...(<any>item.data) };

    if (!model.sequelizeModel) {
      throw new Error(`model ${model.name} must have a sequelize model`);
    }

    try {
      for (const master of model.spec.relations.filter(({ type }) => type === 'MASTER')) {
        const masterData = data[<keyof T>master.alias];
        data[master.alias] = undefined;

        if (masterData) {
          const masterModel = pool.models[master.model];

          if (!masterModel.synchronizer) {
            throw new Error(`model ${masterModel.name} must have a synchronizer`);
          }

          await masterModel.synchronizer(
            transaction,
            <InsertMutateRequest<any>>{
              action: 'insert',
              data: masterData,
              model: masterModel.name,
              requestId: item.requestId,
              type: 'mutate',
              [INJECTED_MASTER_RESOLUTION_KEY]: (id: any) => data[<keyof T>master.key] = id,
            },
            rip,
            context,
          );
        }
      }

      const instance = await model.sequelizeModel.create(data, {
        transaction,
        fields: model.allowedAttributes,
      });

      const newData = instance.get({ plain: true });

      if ((<any>item)[INJECTED_MASTER_RESOLUTION_KEY]) {

        if (model.primaryKeys.length !== 1) {
          throw new Error(
            `model ${model.name} must have exactly one primaryKey for complex operations`,
          );
        }

        (<any>item)[INJECTED_MASTER_RESOLUTION_KEY](newData[model.primaryKeys[0]]);
      }

      const aliasModelMap = model.aliasModelMap;
      const aliasKeyMap = model.aliasKeyMap;

      for (const alias of Object.keys(aliasModelMap)) {
        const nested = (<any>data)[alias];
        const targetModel = pool.models[aliasModelMap[alias]];

        if (nested) {
          if (!targetModel) {
            throw new Error(`model ${aliasModelMap[alias]} does not exist`);
          }

          if (!targetModel.synchronizer) {
            throw new Error(`model ${targetModel.name} must have a synchronizer`);
          }

          if (model.primaryKeys.length !== 1) {
            throw new Error(
              `model ${model.name} must have exactly one primaryKey for complex operations`,
            );
          }

          if (Array.isArray(nested)) {
            for (const nestedItem of nested) {

              const nestedInsertData = {
                ...nestedItem,
                [aliasKeyMap[alias]]: newData[model.primaryKeys[0]],
              };

              await targetModel.synchronizer(
                transaction,
                {
                  action: 'insert',
                  data: nestedInsertData,
                  model: aliasModelMap[alias],
                  requestId: item.requestId,
                  type: 'mutate',
                },
                rip,
                context,
              );
            }
          } else {
            const nestedInsertData = {
              ...nested,
              [aliasKeyMap[alias]]: newData[model.primaryKeys[0]],
            };

            await targetModel.synchronizer(
              transaction,
              {
                action: 'insert',
                data: nestedInsertData,
                model: aliasModelMap[alias],
                requestId: item.requestId,
                type: 'mutate',
              },
              rip,
              context,
            );
          }
        }
      }

      if (model.primaryKeys.length > 0) {
        return pick<Partial<T>, Partial<T>>(newData, model.primaryKeys);
      }
    } catch (error) {
      if (typeof errorHandler === 'function') {
        return errorHandler(item, error, rip);
      }
      throw error;
    }
  }

  if (typeof interceptor === 'function') {
    const interceptorResult = await interceptor(transaction, item, rip, pool, context);

    if (typeof interceptorResult === 'object') {
      return interceptorResult;
    }

    if (!interceptorResult) {
      return;
    }
  }

  return defaultInsertBehavior();
}

async function update<T extends object>(
  pool: Pool,
  modelName: string,
  errorHandler: ErrorHandler<UpdateMutateRequest<T>> | undefined,
  interceptor: SynchronizationInterceptor<UpdateMutateRequest<T>, boolean> | undefined,
  transaction: Sequelize.Transaction,
  item: UpdateMutateRequest<T>,
  rip: ResultItemAppender,
  context: any,
): Bluebird<void> {
  const model = <ModelDescriptor<T>>pool.models[modelName];

  if (!model) {
    throw new Error(`model ${modelName} does not exist`);
  }

  async function defaultUpdateBehavior(): Bluebird<void> {
    if (!model.sequelizeModel) {
      throw new Error(`model ${model.name} must have a sequelize model`);
    }

    if (model.primaryKeys.length === 0) {
      throw new Error(`model ${model.name} must have at least one primaryKey`);
    }

    const filters = pick<Partial<T>, Partial<T>>(item.data, model.primaryKeys);

    if (Object.keys(filters).length === 0) {
      throw new Error(`a primaryKey field must be provided to narrow the update`);
    }

    try {
      await model.sequelizeModel.update(item.data, {
        transaction,
        fields: buildUpdateAttributes(model.mutableAttributes, item.attributes),
        validate: true,
        where: <any>filters,
      });
    } catch (error) {
      if (typeof errorHandler === 'function') {
        return errorHandler(item, error, rip);
      }
      throw error;
    }
  }

  if (typeof interceptor === 'function') {
    const resume = await interceptor(transaction, item, rip, pool, context);
    if (!resume) {
      return;
    }
  }
  return defaultUpdateBehavior();
}

async function remove<T extends object>(
  pool: Pool,
  modelName: string,
  errorHandler: ErrorHandler<RemoveMutateRequest<T>> | undefined,
  interceptor: SynchronizationInterceptor<RemoveMutateRequest<T>, boolean> | undefined,
  transaction: Sequelize.Transaction,
  item: RemoveMutateRequest<T>,
  rip: ResultItemAppender,
  context: any,
): Bluebird<void> {
  const model = <ModelDescriptor<T>>pool.models[modelName];

  if (!model) {
    throw new Error(`model ${modelName} does not exist`);
  }

  async function defaultRemoveBehavior(): Bluebird<void> {
    if (!model.sequelizeModel) {
      throw new Error(`model ${model.name} must have a sequelize model`);
    }

    if (model.primaryKeys.length === 0) {
      throw new Error(`model ${model.name} must have at least one primaryKey`);
    }

    const identifiers = pick<Partial<T>, Partial<T>>(item.identifiers, model.primaryKeys);

    if (Object.keys(identifiers).length === 0) {
      throw new Error(`a primaryKey field must be provided to narrow the delete`);
    }

    try {
      await model.sequelizeModel.destroy({ transaction, where: <any>identifiers });
    } catch (error) {
      if (typeof errorHandler === 'function') {
        return errorHandler(item, error, rip);
      }
      throw error;
    }
  }

  if (typeof interceptor === 'function') {
    const resume = await interceptor(transaction, item, rip, pool, context);
    if (!resume) {
      return defaultRemoveBehavior();
    }
  }
  return defaultRemoveBehavior();
}

function buildUpdateAttributes(allowedAttributes: string[], updateAttributes: string[]): string[] {
  if (Array.isArray(allowedAttributes)) {
    return intersection(allowedAttributes, updateAttributes);
  }
  return updateAttributes;
}
