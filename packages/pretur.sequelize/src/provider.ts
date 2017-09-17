import { intersection } from 'lodash';
import { Spec, SpecType, Model } from 'pretur.spec';
import { Query } from 'pretur.sync';
import { Resolver, UnitializedResolver, ResolveResult } from './resolver';
import {
  Synchronizer, UnitializedSynchronizer, SyncResult, buildUpdateAttributes,
} from './synchronizer';
import { ProviderPool, Transaction } from './pool';
import { UninitializedSequelizeModel, SequelizeModel } from './sequelizeModel';
import {
  TableCreationHook,
  TableDestructionHook,
  DatabaseAfterCreationHook,
  DatabaseAfterDestructionHook,
} from './buildDatabase';

export type AliasModelMap<T extends SpecType> = {
  [P in keyof T['records'] | keyof T['sets']]: string;
};

export type AliasKeyMap<T extends SpecType> = {
  [P in keyof T['records'] | keyof T['sets']]: keyof T['fields'];
};

export interface ProviderMetadata<T extends SpecType> {
  primaryKeys: (keyof T['fields'])[];
  model?: SequelizeModel<T>;
  creationHook?: TableCreationHook;
  destructionHook?: TableDestructionHook;
  afterDatabaseCreationHook?: DatabaseAfterCreationHook;
  afterDatabaseDestructionHook?: DatabaseAfterDestructionHook;
  resolver?: Resolver<T>;
  synchronizer?: Synchronizer<T>;
  aliasModelMap: AliasModelMap<T>;
  aliasKeyMap: AliasKeyMap<T>;
  allowedAttributes: (keyof T['fields'])[];
  mutableAttributes: (keyof T['fields'])[];
  defaultOrder: [keyof T['fields'], 'ASC' | 'DESC'];
  sanitizeAttributes(attributes?: (keyof T['fields'])[] | keyof T['fields']): (keyof T['fields'])[];
  initialize(pool: ProviderPool): void;
}

export interface Provider<T extends SpecType> {
  spec: Spec<T>;
  name: string;
  metadata: ProviderMetadata<T>;
  select(tr: Transaction, query?: Partial<Query<T>>, context?: any): Promise<ResolveResult<T>>;
  insert(tr: Transaction, data: Partial<Model<T>>, context?: any): Promise<SyncResult<T>>;
  update(tr: Transaction, data: Partial<T['fields']>, context?: any): Promise<SyncResult<T>>;
  remove(tr: Transaction, data: Partial<T['fields']>, context?: any): Promise<SyncResult<T>>;
}

export interface BuildProviderOptions<T extends SpecType> {
  model?: UninitializedSequelizeModel<T>;
  resolver?: UnitializedResolver<T>;
  synchronizer?: UnitializedSynchronizer<T>;
  defaultOrder?: [keyof T['fields'], 'ASC' | 'DESC'];
  allowedAttributes?: (keyof T['fields'])[];
  allowedMutableAttributes?: (keyof T['fields'])[];
}

export function buildProvider<T extends SpecType>(
  spec: Spec<T>,
  options: BuildProviderOptions<T> = {},
): Provider<T> {
  const primaryKeys = spec.attributes.filter(a => a.primary).map(a => a.name);

  const resolver = options.resolver && options.resolver.resolver;
  const synchronizer = options.synchronizer && options.synchronizer.synchronizer;
  const model = options.model && options.model.sequelizeModel;
  const createHook = options.model && options.model.creationHook;
  const destroyHook = options.model && options.model.destructionHook;
  const adbCreate = options.model && options.model.afterDatabaseCreationHook;
  const adbDestoy = options.model && options.model.afterDatabaseDestructionHook;

  const aliasModelMap = spec.relations.reduce(
    (m, r) => {
      m[r.alias] = r.model;
      return m;
    },
    <AliasModelMap<T>>{},
  );

  const aliasKeyMap = spec.relations.reduce(
    (m, r) => {
      m[r.alias] = <keyof T['fields']>r.key;
      return m;
    },
    <AliasKeyMap<T>>{},
  );

  const allowedAttributes = options.allowedAttributes || spec.attributes.map(a => a.name);

  const mutableAttributes = options.allowedMutableAttributes ||
    spec.attributes.filter(a => a.mutable).map(a => a.name);

  const defaultOrder = options.defaultOrder ||
    (primaryKeys[0] && [primaryKeys[0], 'ASC']) ||
    undefined;

  function sanitizeAttributes(
    attributes?: (keyof T['fields'])[] | keyof T['fields'],
  ): (keyof T['fields'])[] {
    if (Array.isArray(attributes)) {
      return intersection(attributes, allowedAttributes);
    } else if (typeof attributes === 'string') {
      return intersection([attributes], allowedAttributes);
    }
    return allowedAttributes;
  }

  function initialize(pool: ProviderPool) {
    if (options.model) {
      options.model.initialize(pool);
    }
    if (options.resolver) {
      options.resolver.initialize(pool);
    }
    if (options.synchronizer) {
      options.synchronizer.initialize(pool);
    }
  }

  async function select(
    transaction: Transaction,
    query?: Partial<Query<T>>,
    context?: any,
  ): Promise<ResolveResult<T>> {
    if (!resolver) {
      throw new Error('No resolver available');
    }

    return resolver(transaction, query || {}, context);
  }

  async function insert(
    transaction: Transaction,
    data: Partial<Model<T>>,
    context?: any,
  ): Promise<SyncResult<T>> {
    if (!synchronizer) {
      throw new Error('No synchronizer available');
    }

    return synchronizer(
      transaction,
      {
        type: 'mutate',
        action: 'insert',
        model: spec.name,
        requestId: 1,
        data,
      },
      context,
    );
  }

  async function update(
    transaction: Transaction,
    data: Partial<T['fields']>,
    context?: any,
  ): Promise<SyncResult<T>> {
    if (!synchronizer) {
      throw new Error('No synchronizer available');
    }

    const attributes = buildUpdateAttributes(allowedAttributes, Object.keys(data))
      .filter(key => !primaryKeys.includes(<any>key));

    return synchronizer(
      transaction,
      {
        type: 'mutate',
        action: 'update',
        model: spec.name,
        requestId: 1,
        attributes: <any>attributes,
        data,
      },
      context,
    );
  }

  async function remove(
    transaction: Transaction,
    identifiers: Partial<T['fields']>,
    context?: any,
  ): Promise<SyncResult<T>> {
    if (!synchronizer) {
      throw new Error('No synchronizer available');
    }

    return synchronizer(
      transaction,
      {
        type: 'mutate',
        action: 'remove',
        model: spec.name,
        requestId: 1,
        identifiers,
      },
      context,
    );
  }

  return {
    metadata: {
      afterDatabaseCreationHook: adbCreate,
      afterDatabaseDestructionHook: adbDestoy,
      aliasKeyMap,
      aliasModelMap,
      allowedAttributes,
      creationHook: createHook,
      defaultOrder,
      destructionHook: destroyHook,
      initialize,
      mutableAttributes,
      primaryKeys,
      resolver,
      sanitizeAttributes,
      model,
      synchronizer,
    },
    name: spec.name,
    spec,
    select,
    insert,
    update,
    remove,
  };
}
