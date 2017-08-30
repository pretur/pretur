import { intersection, pick } from 'lodash';
import { Bundle } from 'pretur.i18n';
import { Spec, SpecType, Model } from 'pretur.spec';
import { ModelDescriptor } from './descriptor';
import { Pool, Transaction } from './pool';
import {
  InsertMutateRequest,
  UpdateMutateRequest,
  RemoveMutateRequest,
  MutateRequest,
} from 'pretur.sync';

export interface ResultItemAppender {
  appendError(error: Bundle): void;
  appendWarning(warning: Bundle): void;
}

export interface ErrorHandler<T> {
  (data: T, error: any, rip: ResultItemAppender): Promise<void>;
}

export interface Insert<T extends SpecType> {
  (
    transaction: Transaction,
    item: InsertMutateRequest<T>,
    rip: ResultItemAppender,
    context: any,
  ): Promise<Partial<T['fields']> | undefined>;
}

export interface Update<T extends SpecType> {
  (
    transaction: Transaction,
    item: UpdateMutateRequest<T>,
    rip: ResultItemAppender,
    context: any,
  ): Promise<void>;
}

export interface Remove<T extends SpecType> {
  (
    transaction: Transaction,
    item: RemoveMutateRequest<T>,
    rip: ResultItemAppender,
    context: any,
  ): Promise<void>;
}

export interface Synchronizer<T extends SpecType> {
  (
    transaction: Transaction,
    item: MutateRequest<T>,
    rip: ResultItemAppender,
    context: any,
  ): Promise<Partial<T['fields']> | void>;
}

export interface UnitializedSynchronizer<T extends SpecType> {
  synchronizer: Synchronizer<T>;
  initialize(pool: Pool): void;
}

export interface InsertSyncInterceptor<T extends SpecType> {
  (
    insert: (target: InsertMutateRequest<T>) => Promise<Partial<T['fields']> | undefined>,
    transaction: Transaction,
    item: InsertMutateRequest<T>,
    rip: ResultItemAppender,
    pool: Pool,
    context: any,
  ): Promise<Partial<T['fields']> | undefined>;
}

export interface UpdateSyncInterceptor<T extends SpecType> {
  (
    update: (target: UpdateMutateRequest<T>) => Promise<void>,
    transaction: Transaction,
    item: UpdateMutateRequest<T>,
    rip: ResultItemAppender,
    pool: Pool,
    context: any,
  ): Promise<void>;
}

export interface RemoveSyncInterceptor<T extends SpecType> {
  (
    rtemove: (target: RemoveMutateRequest<T>) => Promise<void>,
    transaction: Transaction,
    item: RemoveMutateRequest<T>,
    rip: ResultItemAppender,
    pool: Pool,
    context: any,
  ): Promise<void>;
}

export interface BuildSynchronizerOptions<T extends SpecType> {
  insertInterceptor?: InsertSyncInterceptor<T>;
  updateInterceptor?: UpdateSyncInterceptor<T>;
  removeInterceptor?: RemoveSyncInterceptor<T>;
}

export function buildSynchronizer<T extends SpecType>(
  spec: Spec<T>,
  options?: BuildSynchronizerOptions<T>,
): UnitializedSynchronizer<T> {
  let pool: Pool = <any>undefined;

  async function synchronizer(
    transaction: Transaction,
    item: MutateRequest<T>,
    rip: ResultItemAppender,
    context: any,
  ): Promise<Partial<T['fields']> | void> {

    if (item.action === 'insert') {
      return insert(
        pool,
        spec.name,
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

async function defaultInsertBehavior<T extends SpecType>(
  pool: Pool,
  model: ModelDescriptor<T>,
  transaction: Transaction,
  item: InsertMutateRequest<T>,
  rip: ResultItemAppender,
  context: any,
): Promise<Partial<T['fields']> | undefined> {
  const data: Partial<Model<T>> = { ...(<any>item.data) };

  if (!model.sequelizeModel) {
    throw new Error(`model ${model.name} must have a sequelize model`);
  }

  for (const master of model.spec.relations.filter(({ type }) => type === 'MASTER')) {
    const masterData = data[master.alias];
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
    fields: model.allowedAttributes,
    transaction,
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

  return;
}

function insert<T extends SpecType>(
  pool: Pool,
  modelName: string,
  interceptor: InsertSyncInterceptor<T> | undefined,
  transaction: Transaction,
  item: InsertMutateRequest<T>,
  rip: ResultItemAppender,
  context: any,
): Promise<Partial<T['fields']> | undefined> {
  const model = <ModelDescriptor<T>>pool.models[modelName];

  if (!model) {
    throw new Error(`model ${modelName} does not exist`);
  }

  const defaultInsert = (target: InsertMutateRequest<T>) => defaultInsertBehavior(
    pool,
    model,
    transaction,
    target,
    rip,
    context,
  );

  if (typeof interceptor === 'function') {
    return interceptor(defaultInsert, transaction, item, rip, pool, context);
  }

  return defaultInsert(item);
}

async function defaultUpdateBehavior<T extends SpecType>(
  model: ModelDescriptor<T>,
  transaction: Transaction,
  item: UpdateMutateRequest<T>,
): Promise<void> {
  if (!model.sequelizeModel) {
    throw new Error(`model ${model.name} must have a sequelize model`);
  }

  if (model.primaryKeys.length === 0) {
    throw new Error(`model ${model.name} must have at least one primaryKey`);
  }

  const filters = pick(item.data, model.primaryKeys);

  if (Object.keys(filters).length === 0) {
    throw new Error(`a primaryKey field must be provided to narrow the update`);
  }

  await model.sequelizeModel.update(<any>item.data, {
    fields: buildUpdateAttributes(model.mutableAttributes, item.attributes),
    transaction,
    validate: true,
    where: <any>filters,
  });
}

function update<T extends SpecType>(
  pool: Pool,
  modelName: string,
  interceptor: UpdateSyncInterceptor<T> | undefined,
  transaction: Transaction,
  item: UpdateMutateRequest<T>,
  rip: ResultItemAppender,
  context: any,
): Promise<void> {
  const model = <ModelDescriptor<T>>pool.models[modelName];

  if (!model) {
    throw new Error(`model ${modelName} does not exist`);
  }

  const defaultUpdate = (target: UpdateMutateRequest<T>) => defaultUpdateBehavior(
    model,
    transaction,
    target,
  );

  if (typeof interceptor === 'function') {
    return interceptor(defaultUpdate, transaction, item, rip, pool, context);
  }

  return defaultUpdate(item);
}

async function defaultRemoveBehavior<T extends SpecType>(
  model: ModelDescriptor<T>,
  transaction: Transaction,
  item: RemoveMutateRequest<T>,
): Promise<void> {
  if (!model.sequelizeModel) {
    throw new Error(`model ${model.name} must have a sequelize model`);
  }

  if (model.primaryKeys.length === 0) {
    throw new Error(`model ${model.name} must have at least one primaryKey`);
  }

  const identifiers = pick(item.identifiers, model.primaryKeys);

  if (Object.keys(identifiers).length === 0) {
    throw new Error(`a primaryKey field must be provided to narrow the delete`);
  }

  await model.sequelizeModel.destroy({ transaction, where: <any>identifiers });
}

function remove<T extends SpecType>(
  pool: Pool,
  modelName: string,
  interceptor: RemoveSyncInterceptor<T> | undefined,
  transaction: Transaction,
  item: RemoveMutateRequest<T>,
  rip: ResultItemAppender,
  context: any,
): Promise<void> {
  const model = <ModelDescriptor<T>>pool.models[modelName];

  if (!model) {
    throw new Error(`model ${modelName} does not exist`);
  }

  const defaultRemove = (target: RemoveMutateRequest<T>) => defaultRemoveBehavior(
    model,
    transaction,
    target,
  );

  if (typeof interceptor === 'function') {
    return interceptor(defaultRemove, transaction, item, rip, pool, context);
  }
  return defaultRemove(item);
}

function buildUpdateAttributes(allowedAttributes: string[], updateAttributes: string[]): string[] {
  if (Array.isArray(allowedAttributes)) {
    return intersection(allowedAttributes, updateAttributes);
  }
  return updateAttributes;
}
