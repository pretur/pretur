import * as Sequelize from 'sequelize';
import { Spec, SpecType, Model, Attribute, NormalType, RangeType, ArraySubtype } from 'pretur.spec';
import { ProviderPool } from './pool';
import {
  TableCreationHook,
  TableDestructionHook,
  DatabaseAfterCreationHook,
  DatabaseAfterDestructionHook,
} from './buildDatabase';

export type DatabaseInstance<T extends SpecType>
  = Sequelize.Instance<Partial<Model<T>>> & Partial<Model<T>>;

export type DatabaseModel<T extends SpecType>
  = Sequelize.Model<DatabaseInstance<T>, Partial<Model<T>>>;

export interface UninitializedDatabaseModel<T extends SpecType> {
  database: DatabaseModel<T>;
  creationHook?: TableCreationHook;
  destructionHook?: TableDestructionHook;
  afterDatabaseCreationHook?: DatabaseAfterCreationHook;
  afterDatabaseDestructionHook?: DatabaseAfterDestructionHook;
  initialize(pool: ProviderPool): void;
}

export interface BuildDatabaseOptions<T extends SpecType> {
  ignoreSchema?: boolean;
  attributeToFieldMap?: {[P in keyof T['fields']]?: string };
  tableName?: string;
  creationHook?: TableCreationHook;
  destructionHook?: TableDestructionHook;
  afterDatabaseCreationHook?: DatabaseAfterCreationHook;
  afterDatabaseDestructionHook?: DatabaseAfterDestructionHook;
}

export function buildDatabaseModel<T extends SpecType>(
  spec: Spec<T>,
  sequelize: Sequelize.Sequelize,
  options: BuildDatabaseOptions<T> = {},
): UninitializedDatabaseModel<T> {
  const attributes: { [attrib: string]: Sequelize.DefineAttributeColumnOptions } = {};

  for (const attribute of spec.attributes) {
    attributes[attribute.name] = {
      allowNull: !attribute.required,
      autoIncrement: attribute.primary && !!attribute.autoIncrement,
      defaultValue: attribute.defaultValue,
      field: (
        options.attributeToFieldMap && options.attributeToFieldMap[attribute.name]
      ) || undefined,
      primaryKey: !!attribute.primary,
      type: datatypeToSequelizeType(attribute),
      unique: !attribute.primary && !!attribute.unique,
      values: attribute.type === 'ENUM' ? attribute.values : undefined,
    };
  }

  const defineOptions: Sequelize.DefineOptions<DatabaseInstance<T>> = {
    schema: options.ignoreSchema === true ? undefined : spec.scope,
    tableName: options.tableName || spec.name,
  };

  if (spec.indexes.unique) {
    defineOptions.indexes = spec.indexes.unique.map(fields => ({ unique: true, fields }));
  }

  const model = sequelize.define(`${spec.scope}_${spec.name}`, attributes, defineOptions);

  (<any>model).spec = spec;

  function initialize(pool: ProviderPool) {
    for (const relation of spec.relations) {
      const targetProvider = pool.providers[relation.target.scope] &&
        pool.providers[relation.target.scope][relation.target.model];
      const throughProvider = relation.through &&
        pool.providers[relation.through.scope][relation.through.model];

      const target = targetProvider && targetProvider.database;
      const through = throughProvider && throughProvider.database;

      if (target) {
        const relationOptions = {
          as: relation.alias,
          foreignKey: relation.key,
          onDelete: relation.onDelete,
          onUpdate: relation.onUpdate,
        };

        switch (relation.type) {
          case 'SUPERCLASS':
          case 'MASTER':
            model.belongsTo(target, relationOptions);
            break;
          case 'DETAIL':
            model.hasMany(target, relationOptions);
            break;
          case 'SUBCLASS':
          case 'INJECTIVE':
          case 'RECURSIVE':
            model.hasOne(target, relationOptions);
            break;
          case 'MANY_TO_MANY':
            if (through) {
              model.belongsToMany(target, { ...relationOptions, through });
            }
            break;
        }
      }
    }
  }

  return {
    afterDatabaseCreationHook: options.afterDatabaseCreationHook,
    afterDatabaseDestructionHook: options.afterDatabaseDestructionHook,
    creationHook: options.creationHook,
    destructionHook: options.destructionHook,
    initialize,
    database: model,
  };
}

function getDecimalSequelizeType(precision?: number, scale?: number): any {
  if (!precision) {
    return Sequelize.DECIMAL;
  }
  return Sequelize.DECIMAL(precision, scale);
}

function getNormalSequelizeType(type: NormalType): any {
  switch (type) {
    case 'BIGINT':
      return Sequelize.BIGINT;
    case 'INTEGER':
      return Sequelize.INTEGER;
    case 'STRING':
      return Sequelize.TEXT;
    case 'OBJECT':
      return Sequelize.JSONB;
    case 'BOOLEAN':
      return Sequelize.BOOLEAN;
    case 'DOUBLE':
      return Sequelize.DOUBLE;
    case 'DATE':
      return Sequelize.DATE;
  }
}

function getRangeSequelizeSubtype(subtype: RangeType): any {
  switch (subtype) {
    case 'BIGINT': return Sequelize.RANGE(Sequelize.BIGINT);
    case 'INTEGER': return Sequelize.RANGE(Sequelize.INTEGER);
    case 'DATE': return Sequelize.RANGE(Sequelize.DATE);
  }
}

function getArraySequelizeSubtype(subtype: ArraySubtype): any {
  switch (subtype.type) {
    case 'ARRAY':
      return Sequelize.ARRAY(getArraySequelizeSubtype(subtype.subtype));
    case 'RANGE':
      return Sequelize.ARRAY(getRangeSequelizeSubtype(subtype.subtype));
    case 'DECIMAL':
      return Sequelize.ARRAY(getDecimalSequelizeType(subtype.precision, subtype.scale));
    default:
      return getNormalSequelizeType(subtype.type);
  }
}

function datatypeToSequelizeType(attribute: Attribute): any {
  switch (attribute.type) {
    case 'ENUM':
      return Sequelize.ENUM;
    case 'ARRAY':
      return Sequelize.ARRAY(getArraySequelizeSubtype(attribute.subtype));
    case 'RANGE':
      return getRangeSequelizeSubtype(attribute.subtype);
    case 'DECIMAL':
      return getDecimalSequelizeType(attribute.precision, attribute.scale);
    default:
      return getNormalSequelizeType(attribute.type);
  }
}
