import * as Sequelize from 'sequelize';
import { intersection } from 'lodash';
import { Spec } from 'pretur.spec';
import { Resolver, UnitializedResolver } from './resolver';
import { Synchronizer, UnitializedSynchronizer } from './synchronizer';
import { UninitializedSequelizeModel } from './sequelizeModel';
import { Pool } from './pool';

export type FieldWhereClause = string | number |
  Sequelize.WhereOptions | Sequelize.WhereOptions |
  Sequelize.col | Sequelize.and | Sequelize.or |
  Sequelize.WhereGeometryOptions | (string | number)[] | Object;

export interface AliasModelMap {
  [alias: string]: string;
}

export interface AliasKeyMap {
  [alias: string]: string;
}

export type FieldWhereBuilders<T> = {
  [P in keyof T]: (value: T[P]) => FieldWhereClause;
};

export interface ModelDescriptor<T> {
  spec: Spec<T>;
  name: string;
  primaryKey?: string;
  sequelizeModel?: Sequelize.Model<any, any>;
  resolver?: Resolver<any>;
  synchronizer?: Synchronizer<any>;
  aliasModelMap: AliasModelMap;
  aliasKeyMap: AliasKeyMap;
  allowedAttributes: string[];
  mutableAttributes: string[];
  defaultOrder: [string, 'ASC' | 'DESC'];
  fieldWhereBuilders?: FieldWhereBuilders<T>;
  sanitizeAttributes(attributes?: string[] | string): string[];
  initialize(pool: Pool): void;
}

export interface BuildModelDescriptorOptions<T> {
  sequelizeModel?: UninitializedSequelizeModel<any, any>;
  resolver?: UnitializedResolver<any>;
  synchronizer?: UnitializedSynchronizer<any>;
  defaultOrder?: [string, 'ASC' | 'DESC'];
  fieldWhereBuilders?: FieldWhereBuilders<T>;
  allowedAttributes?: string[];
  allowedMutableAttributes?: string[];
  allowedUpdateAttributes?: string[];
}

export function buildModelDescriptor<T>(
  spec: Spec<T>,
  options?: BuildModelDescriptorOptions<T>,
): ModelDescriptor<T> {
  const primaryAttribute = spec.attributeArray.filter(a => a.primary)[0];

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
    <AliasModelMap>{},
  );

  const aliasKeyMap = spec.relationArray.reduce(
    (m, r) => {
      m[r.alias] = r.key;
      return m;
    },
    <AliasKeyMap>{},
  );

  const allowedAttributes
    = (options && options.allowedAttributes) || spec.attributeArray.map(a => a.name);

  const mutableAttributes = (options && options.allowedMutableAttributes)
    || spec.attributeArray.filter(a => a.mutable).map(a => a.name);

  const defaultOrder = (options && options.defaultOrder)
    || (primaryAttribute && [primaryAttribute.name, 'ASC'])
    || undefined;

  function sanitizeAttributes(attributes?: string[] | string): string[] {
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
    fieldWhereBuilders: (options && options.fieldWhereBuilders),
    name: spec.name,
    primaryKey: primaryAttribute ? primaryAttribute.name : undefined,
  };
}
