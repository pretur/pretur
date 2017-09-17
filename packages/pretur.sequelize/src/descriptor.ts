import { intersection } from 'lodash';
import { Spec, SpecType } from 'pretur.spec';
import { Resolver, UnitializedResolver } from './resolver';
import { Synchronizer, UnitializedSynchronizer } from './synchronizer';
import { Pool } from './pool';
import { UninitializedSequelizeModel, SequelizeModel } from './sequelizeModel';
import { TableCreationHook, TableDestructionHook } from './buildDatabase';

export type AliasModelMap<T extends SpecType> = {
  [P in keyof T['records'] | keyof T['sets']]: string;
};

export type AliasKeyMap<T extends SpecType> = {
  [P in keyof T['records'] | keyof T['sets']]: keyof T['fields'];
};

export interface ModelDescriptor<T extends SpecType> {
  spec: Spec<T>;
  name: string;
  primaryKeys: (keyof T['fields'])[];
  sequelizeModel?: SequelizeModel<T>;
  tableCreationHook?: TableCreationHook<T>;
  tableDestructionHook?: TableDestructionHook<T>;
  resolver?: Resolver<T>;
  synchronizer?: Synchronizer<T>;
  aliasModelMap: AliasModelMap<T>;
  aliasKeyMap: AliasKeyMap<T>;
  allowedAttributes: (keyof T['fields'])[];
  mutableAttributes: (keyof T['fields'])[];
  defaultOrder: [keyof T['fields'], 'ASC' | 'DESC'];
  sanitizeAttributes(attributes?: (keyof T['fields'])[] | keyof T['fields']): (keyof T['fields'])[];
  initialize(pool: Pool): void;
}

export interface BuildModelDescriptorOptions<T extends SpecType> {
  sequelizeModel?: UninitializedSequelizeModel<T>;
  resolver?: UnitializedResolver<T>;
  synchronizer?: UnitializedSynchronizer<T>;
  defaultOrder?: [keyof T['fields'], 'ASC' | 'DESC'];
  allowedAttributes?: (keyof T['fields'])[];
  allowedMutableAttributes?: (keyof T['fields'])[];
}

export function buildModelDescriptor<T extends SpecType>(
  spec: Spec<T>,
  options: BuildModelDescriptorOptions<T> = {},
): ModelDescriptor<T> {
  const primaryKeys = spec.attributes.filter(a => a.primary).map(a => a.name);

  const resolver = options.resolver && options.resolver.resolver;
  const synchronizer = options.synchronizer && options.synchronizer.synchronizer;
  const sequelizeModel = options.sequelizeModel && options.sequelizeModel.sequelizeModel;
  const createHook = options.sequelizeModel && options.sequelizeModel.tableCreationHook;
  const destroyHook = options.sequelizeModel && options.sequelizeModel.tableDestructionHook;

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

  function initialize(pool: Pool) {
    if (options.sequelizeModel) {
      options.sequelizeModel.initialize(pool);
    }
    if (options.resolver) {
      options.resolver.initialize(pool);
    }
    if (options.synchronizer) {
      options.synchronizer.initialize(pool);
    }
  }

  return {
    aliasKeyMap,
    aliasModelMap,
    allowedAttributes,
    defaultOrder,
    initialize,
    mutableAttributes,
    name: spec.name,
    primaryKeys,
    resolver,
    sanitizeAttributes,
    sequelizeModel,
    spec,
    synchronizer,
    tableCreationHook: createHook,
    tableDestructionHook: destroyHook,
  };
}
