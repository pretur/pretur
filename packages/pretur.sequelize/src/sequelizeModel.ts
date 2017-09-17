import * as Sequelize from 'sequelize';
import { Spec, SpecType, Model, Attribute, NormalType, RangeType, ArraySubtype } from 'pretur.spec';
import { Pool } from './pool';
import {
  TableCreationHook,
  TableDestructionHook,
  DatabaseAfterCreationHook,
  DatabaseAfterDestructionHook,
} from './buildDatabase';

export type SequelizeInstance<T extends SpecType>
  = Sequelize.Instance<Partial<Model<T>>> & Partial<Model<T>>;

export type SequelizeModel<T extends SpecType>
  = Sequelize.Model<SequelizeInstance<T>, Partial<Model<T>>>;

export interface UninitializedSequelizeModel<T extends SpecType> {
  sequelizeModel: SequelizeModel<T>;
  creationHook?: TableCreationHook;
  destructionHook?: TableDestructionHook;
  afterDatabaseCreationHook?: DatabaseAfterCreationHook;
  afterDatabaseDestructionHook?: DatabaseAfterDestructionHook;
  initialize(pool: Pool): void;
}

export interface BuildSequelizeModelOptions<T extends SpecType> {
  attributeToFieldMap?: {[P in keyof T['fields']]?: string };
  tableName?: string;
  creationHook?: TableCreationHook;
  destructionHook?: TableDestructionHook;
  afterDatabaseCreationHook?: DatabaseAfterCreationHook;
  afterDatabaseDestructionHook?: DatabaseAfterDestructionHook;
}

export function buildSequelizeModel<T extends SpecType>(
  spec: Spec<T>,
  sequelize: Sequelize.Sequelize,
  options: BuildSequelizeModelOptions<T> = {},
): UninitializedSequelizeModel<T> {
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

  const defineOptions: Sequelize.DefineOptions<SequelizeInstance<T>> = {
    tableName: options.tableName || spec.name,
  };

  if (spec.indexes.unique) {
    defineOptions.indexes = spec.indexes.unique.map(fields => ({ unique: true, fields }));
  }

  const model = sequelize.define(spec.name, attributes, defineOptions);

  function initialize(pool: Pool) {
    for (const relation of spec.relations) {
      const target = pool.models[relation.model] && pool.models[relation.model].sequelizeModel;
      const through = relation.through && pool.models[relation.through].sequelizeModel;
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
    sequelizeModel: model,
  };
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
    default:
      return getNormalSequelizeType(attribute.type);
  }
}
