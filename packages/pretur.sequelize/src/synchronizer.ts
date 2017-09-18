import { intersection, pick } from 'lodash';
import { Bundle } from 'pretur.i18n';
import { Spec, SpecType, Model } from 'pretur.spec';
import { Provider } from './provider';
import { ProviderPool, Transaction } from './pool';
import {
  InsertMutateRequest,
  UpdateMutateRequest,
  RemoveMutateRequest,
  MutateRequest,
} from 'pretur.sync';

export interface SyncResult<T extends SpecType> {
  errors: Bundle[];
  generatedIds?: Partial<T['fields']>;
}

export interface Insert<T extends SpecType> {
  (transaction: Transaction, item: InsertMutateRequest<T>, context: any): Promise<SyncResult<T>>;
}

export interface Update<T extends SpecType> {
  (transaction: Transaction, item: UpdateMutateRequest<T>, context: any): Promise<SyncResult<T>>;
}

export interface Remove<T extends SpecType> {
  (transaction: Transaction, item: RemoveMutateRequest<T>, context: any): Promise<SyncResult<T>>;
}

export interface Synchronizer<T extends SpecType> {
  (transaction: Transaction, item: MutateRequest<T>, context: any): Promise<SyncResult<T>>;
}

export interface UnitializedSynchronizer<T extends SpecType> {
  synchronizer: Synchronizer<T>;
  initialize(pool: ProviderPool): void;
}

export interface InsertSyncInterceptor<T extends SpecType> {
  (
    insert: (data: Partial<Model<T>>) => Promise<SyncResult<T>>,
    transaction: Transaction,
    data: Partial<Model<T>>,
    context: any,
  ): Promise<SyncResult<T>>;
}

export interface UpdateSyncInterceptor<T extends SpecType> {
  (
    update: (data: Partial<T['fields']>) => Promise<SyncResult<T>>,
    transaction: Transaction,
    data: Partial<T['fields']>,
    context: any,
  ): Promise<SyncResult<T>>;
}

export interface RemoveSyncInterceptor<T extends SpecType> {
  (
    remove: (identifiers: Partial<T['fields']>) => Promise<SyncResult<T>>,
    transaction: Transaction,
    identifiers: Partial<T['fields']>,
    context: any,
  ): Promise<SyncResult<T>>;
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
  let pool: ProviderPool = <any>undefined;

  async function synchronizer(
    transaction: Transaction,
    item: MutateRequest<T>,
    context: any,
  ): Promise<SyncResult<T>> {

    if (item.action === 'insert') {
      return insert(
        pool,
        spec.name,
        (options && options.insertInterceptor) || undefined,
        transaction,
        item,
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
        context,
      );
    }

    throw new Error('provided item is invalid');
  }

  function initialize(p: ProviderPool) {
    pool = p;
  }

  return { synchronizer, initialize };
}

async function defaultInsertBehavior<T extends SpecType>(
  pool: ProviderPool,
  provider: Provider<T>,
  transaction: Transaction,
  item: InsertMutateRequest<T>,
  context: any,
): Promise<SyncResult<T>> {
  const data: Partial<Model<T>> = { ...(<any>item.data) };

  if (!provider.database) {
    throw new Error(`model ${provider.name} must have a sequelize model`);
  }

  for (const master of provider.spec.relations.filter(({ type }) => type === 'MASTER')) {
    const masterData = data[master.alias];
    data[master.alias] = undefined;

    if (masterData) {
      const masterProvider = pool.providers[master.model];

      if (!masterProvider.metadata.synchronizer) {
        throw new Error(`model ${masterProvider.name} must have a synchronizer`);
      }

      if (masterProvider.metadata.primaryKeys.length !== 1) {
        throw new Error(
          `model ${provider.name} must have exactly one primaryKey for complex operations`,
        );
      }

      const { errors, generatedIds } = await masterProvider.metadata.synchronizer(
        transaction,
        {
          action: 'insert',
          data: masterData,
          model: masterProvider.name,
          requestId: item.requestId,
          type: 'mutate',
        },
        context,
      );

      if (errors.length > 0) {
        return { errors };
      }

      if (!generatedIds) {
        throw new Error('Unexpected results!');
      }

      data[<keyof Model<T>>master.key] = generatedIds[provider.metadata.primaryKeys[0]];

    }
  }

  const instance = await provider.database.create(<Model<T>>data, {
    fields: provider.metadata.allowedAttributes,
    transaction,
  });

  const newData = instance.get({ plain: true });

  const aliasModelMap = provider.metadata.aliasModelMap;
  const aliasKeyMap = provider.metadata.aliasKeyMap;

  for (const alias of Object.keys(aliasModelMap)) {
    const nested = (<any>data)[alias];
    const targetProvider = pool.providers[aliasModelMap[alias]];

    if (nested) {
      if (!targetProvider) {
        throw new Error(`model ${aliasModelMap[alias]} does not exist`);
      }

      if (!targetProvider.metadata.synchronizer) {
        throw new Error(`model ${targetProvider.name} must have a synchronizer`);
      }

      if (provider.metadata.primaryKeys.length !== 1) {
        throw new Error(
          `model ${provider.name} must have exactly one primaryKey for complex operations`,
        );
      }

      if (Array.isArray(nested)) {
        for (const nestedItem of nested) {

          const nestedInsertData = {
            ...nestedItem,
            [aliasKeyMap[alias]]: newData[provider.metadata.primaryKeys[0]],
          };

          const { errors } = await targetProvider.metadata.synchronizer(
            transaction,
            {
              action: 'insert',
              data: nestedInsertData,
              model: aliasModelMap[alias],
              requestId: item.requestId,
              type: 'mutate',
            },
            context,
          );

          if (errors.length > 0) {
            return { errors };
          }
        }
      } else {
        const nestedInsertData = {
          ...nested,
          [aliasKeyMap[alias]]: newData[provider.metadata.primaryKeys[0]],
        };

        const { errors } = await targetProvider.metadata.synchronizer(
          transaction,
          {
            action: 'insert',
            data: nestedInsertData,
            model: aliasModelMap[alias],
            requestId: item.requestId,
            type: 'mutate',
          },
          context,
        );

        if (errors.length > 0) {
          return { errors };
        }
      }
    }
  }

  if (provider.metadata.primaryKeys.length > 0) {
    return {
      generatedIds: pick(newData, provider.metadata.primaryKeys),
      errors: [],
    };
  }

  return { errors: [], generatedIds: {} };
}

function insert<T extends SpecType>(
  pool: ProviderPool,
  model: string,
  interceptor: InsertSyncInterceptor<T> | undefined,
  transaction: Transaction,
  item: InsertMutateRequest<T>,
  context: any,
): Promise<SyncResult<T>> {
  const provider = <Provider<T>>pool.providers[model];

  if (!provider) {
    throw new Error(`model ${model} does not exist`);
  }

  if (typeof interceptor === 'function') {
    const defaultInsert = (data: Partial<Model<T>>) => defaultInsertBehavior(
      pool,
      provider,
      transaction,
      { ...item, data },
      context,
    );

    return interceptor(defaultInsert, transaction, item.data, context);
  }

  return defaultInsertBehavior(pool, provider, transaction, item, context);
}

async function defaultUpdateBehavior<T extends SpecType>(
  provider: Provider<T>,
  transaction: Transaction,
  item: UpdateMutateRequest<T>,
): Promise<SyncResult<T>> {
  if (!provider.database) {
    throw new Error(`model ${provider.name} must have a sequelize model`);
  }

  if (provider.metadata.primaryKeys.length === 0) {
    throw new Error(`model ${provider.name} must have at least one primaryKey`);
  }

  const filters = pick(item.data, provider.metadata.primaryKeys);

  if (Object.keys(filters).length === 0) {
    throw new Error(`a primaryKey field must be provided to narrow the update`);
  }

  const fields = buildUpdateAttributes(provider.metadata.mutableAttributes, Object.keys(item.data))
    .filter(key => !provider.metadata.primaryKeys.includes(<any>key));

  await provider.database.update(<any>item.data, {
    fields,
    transaction,
    where: <any>filters,
  });

  return { errors: [] };
}

function update<T extends SpecType>(
  pool: ProviderPool,
  model: string,
  interceptor: UpdateSyncInterceptor<T> | undefined,
  transaction: Transaction,
  item: UpdateMutateRequest<T>,
  context: any,
): Promise<SyncResult<T>> {
  const provider = <Provider<T>>pool.providers[model];

  if (!provider) {
    throw new Error(`model ${model} does not exist`);
  }

  if (typeof interceptor === 'function') {
    const defaultUpdate = (data: Partial<T['fields']>) => defaultUpdateBehavior(
      provider,
      transaction,
      { ...item, data },
    );

    return interceptor(defaultUpdate, transaction, item.data, context);
  }

  return defaultUpdateBehavior(provider, transaction, item);
}

async function defaultRemoveBehavior<T extends SpecType>(
  provider: Provider<T>,
  transaction: Transaction,
  item: RemoveMutateRequest<T>,
): Promise<SyncResult<T>> {
  if (!provider.database) {
    throw new Error(`model ${provider.name} must have a sequelize model`);
  }

  if (provider.metadata.primaryKeys.length === 0) {
    throw new Error(`model ${provider.name} must have at least one primaryKey`);
  }

  const identifiers = pick(item.identifiers, provider.metadata.primaryKeys);

  if (Object.keys(identifiers).length === 0) {
    throw new Error(`a primaryKey field must be provided to narrow the delete`);
  }

  await provider.database.destroy({ transaction, where: <any>identifiers });

  return { errors: [] };
}

function remove<T extends SpecType>(
  pool: ProviderPool,
  model: string,
  interceptor: RemoveSyncInterceptor<T> | undefined,
  transaction: Transaction,
  item: RemoveMutateRequest<T>,
  context: any,
): Promise<SyncResult<T>> {
  const provider = <Provider<T>>pool.providers[model];

  if (!provider) {
    throw new Error(`model ${model} does not exist`);
  }

  if (typeof interceptor === 'function') {
    const defaultRemove = (identifiers: Partial<T['fields']>) => defaultRemoveBehavior(
      provider,
      transaction,
      { ...item, identifiers },
    );

    return interceptor(defaultRemove, transaction, item.identifiers, context);
  }
  return defaultRemoveBehavior(provider, transaction, item);
}

function buildUpdateAttributes(allowedAttributes: string[], updateAttributes: string[]): string[] {
  if (Array.isArray(allowedAttributes)) {
    return intersection(allowedAttributes, updateAttributes);
  }
  return updateAttributes;
}
