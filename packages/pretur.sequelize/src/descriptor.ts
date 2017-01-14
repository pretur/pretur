import * as Sequelize from 'sequelize';
import { intersection } from 'lodash';
import { Spec } from 'pretur.spec';
import { Resolver, UnitializedResolver } from './resolver';
import { Synchronizer, UnitializedSynchronizer } from './synchronizer';
import { UninitializedSequelizeModel, SequelizeModel } from './sequelizeModel';
import { Pool } from './pool';

export type FieldWhereClause<T> = T |
  Sequelize.WhereOptions | Sequelize.WhereOptions |
  Sequelize.col | Sequelize.and | Sequelize.or |
  Sequelize.WhereGeometryOptions | T[] | object;

export type AliasModelMap<T> = {
  [P in keyof T]: string;
};

export type AliasKeyMap<T> = {
  [P in keyof T]: keyof T;
};

export type FieldWhereBuilders<T> = {
  [P in keyof T]?: (value: T[P]) => FieldWhereClause<T[P]>;
};

export interface ModelDescriptor<T> {
  spec: Spec<T>;
  name: string;
  primaryKeys: (keyof T)[];
  sequelizeModel?: SequelizeModel<T>;
  resolver?: Resolver<T>;
  synchronizer?: Synchronizer<T>;
  aliasModelMap: AliasModelMap<T>;
  aliasKeyMap: AliasKeyMap<T>;
  allowedAttributes: (keyof T)[];
  mutableAttributes: (keyof T)[];
  defaultOrder: [keyof T, 'ASC' | 'DESC'];
  fieldWhereBuilders?: FieldWhereBuilders<T>;
  sanitizeAttributes(attributes?: (keyof T)[] | keyof T): (keyof T)[];
  initialize(pool: Pool): void;
}

export interface BuildModelDescriptorOptions<T> {
  sequelizeModel?: UninitializedSequelizeModel<T>;
  resolver?: UnitializedResolver<T>;
  synchronizer?: UnitializedSynchronizer<T>;
  defaultOrder?: [keyof T, 'ASC' | 'DESC'];
  fieldWhereBuilders?: FieldWhereBuilders<T>;
  allowedAttributes?: (keyof T)[];
  allowedMutableAttributes?: (keyof T)[];
}

export function buildModelDescriptor<T>(
  spec: Spec<T>,
  options?: BuildModelDescriptorOptions<T>,
): ModelDescriptor<T> {
  const primaryKeys = spec.attributeArray.filter(a => a.primary).map(a => a.name);

  const sequelizeModel
    = (options && options.sequelizeModel && options.sequelizeModel.sequelizeModel) || undefined;
  const resolver
    = (options && options.resolver && options.resolver.resolver) || undefined;
  const synchronizer
    = (options && options.synchronizer && options.synchronizer.synchronizer) || undefined;

  const aliasModelMap = spec.relationArray.reduce(
    (m, r) => {
      m[r.alias] = r.model;
      return m;
    },
    <AliasModelMap<T>>{},
  );

  const aliasKeyMap = spec.relationArray.reduce(
    (m, r) => {
      m[<keyof T>r.alias] = <keyof T>r.key;
      return m;
    },
    <AliasKeyMap<T>>{},
  );

  const allowedAttributes
    = (options && options.allowedAttributes) || spec.attributeArray.map(a => a.name);

  const mutableAttributes = (options && options.allowedMutableAttributes)
    || spec.attributeArray.filter(a => a.mutable).map(a => a.name);

  const defaultOrder = (options && options.defaultOrder)
    || (primaryKeys[0] && [primaryKeys[0], 'ASC'])
    || undefined;

  function sanitizeAttributes(attributes?: (keyof T)[] | keyof T): (keyof T)[] {
    if (Array.isArray(attributes)) {
      return intersection(attributes, allowedAttributes);
    } else if (typeof attributes === 'string') {
      return intersection([attributes], allowedAttributes);
    }
    return allowedAttributes;
  }

  function initialize(pool: Pool) {
    if (options && options.sequelizeModel) {
      options.sequelizeModel.initialize(pool);
    }
    if (options && options.resolver) {
      options.resolver.initialize(pool);
    }
    if (options && options.synchronizer) {
      options.synchronizer.initialize(pool);
    }
  }

  return {
    spec,
    sequelizeModel,
    resolver,
    synchronizer,
    aliasModelMap,
    aliasKeyMap,
    allowedAttributes,
    mutableAttributes,
    defaultOrder,
    sanitizeAttributes,
    initialize,
    primaryKeys,
    fieldWhereBuilders: (options && options.fieldWhereBuilders),
    name: spec.name,
  };
}
