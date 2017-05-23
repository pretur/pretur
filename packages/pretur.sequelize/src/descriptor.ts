import * as Sequelize from 'sequelize';
import { intersection } from 'lodash';
import { Spec, SpecType } from 'pretur.spec';
import { Resolver, UnitializedResolver } from './resolver';
import { Synchronizer, UnitializedSynchronizer } from './synchronizer';
import { UninitializedSequelizeModel, SequelizeModel } from './sequelizeModel';
import { Pool } from './pool';

export type FieldWhereClause<F> = F |
  Sequelize.WhereOptions | Sequelize.WhereOptions |
  Sequelize.col | Sequelize.and | Sequelize.or |
  Sequelize.WhereGeometryOptions | F[] | object;

export type AliasModelMap<T extends SpecType> = {
  [P in keyof T['records'] | keyof T['sets']]: string;
};

export type AliasKeyMap<T extends SpecType> = {
  [P in keyof T['records'] | keyof T['sets']]: keyof T['fields'];
};

export type FieldWhereBuilders<T extends SpecType> = {
  [P in keyof T['fields']]?: (value: T['fields'][P]) => FieldWhereClause<T['fields'][P]>;
};

export interface ModelDescriptor<T extends SpecType> {
  spec: Spec<T>;
  name: string;
  primaryKeys: (keyof T['fields'])[];
  sequelizeModel?: SequelizeModel<T>;
  resolver?: Resolver<T>;
  synchronizer?: Synchronizer<T>;
  aliasModelMap: AliasModelMap<T>;
  aliasKeyMap: AliasKeyMap<T>;
  allowedAttributes: (keyof T['fields'])[];
  mutableAttributes: (keyof T['fields'])[];
  defaultOrder: [keyof T['fields'], 'ASC' | 'DESC'];
  fieldWhereBuilders?: FieldWhereBuilders<T>;
  sanitizeAttributes(attributes?: (keyof T['fields'])[] | keyof T['fields']): (keyof T['fields'])[];
  initialize(pool: Pool): void;
}

export interface BuildModelDescriptorOptions<T extends SpecType> {
  sequelizeModel?: UninitializedSequelizeModel<T>;
  resolver?: UnitializedResolver<T>;
  synchronizer?: UnitializedSynchronizer<T>;
  defaultOrder?: [keyof T['fields'], 'ASC' | 'DESC'];
  fieldWhereBuilders?: FieldWhereBuilders<T>;
  allowedAttributes?: (keyof T['fields'])[];
  allowedMutableAttributes?: (keyof T['fields'])[];
}

export function buildModelDescriptor<T extends SpecType>(
  spec: Spec<T>,
  options?: BuildModelDescriptorOptions<T>,
): ModelDescriptor<T> {
  const primaryKeys = spec.attributes.filter(a => a.primary).map(a => a.name);

  const sequelizeModel
    = (options && options.sequelizeModel && options.sequelizeModel.sequelizeModel) || undefined;
  const resolver
    = (options && options.resolver && options.resolver.resolver) || undefined;
  const synchronizer
    = (options && options.synchronizer && options.synchronizer.synchronizer) || undefined;

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

  const allowedAttributes
    = (options && options.allowedAttributes) || spec.attributes.map(a => a.name);

  const mutableAttributes = (options && options.allowedMutableAttributes)
    || spec.attributes.filter(a => a.mutable).map(a => a.name);

  const defaultOrder = (options && options.defaultOrder)
    || (primaryKeys[0] && [primaryKeys[0], 'ASC'])
    || undefined;

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
