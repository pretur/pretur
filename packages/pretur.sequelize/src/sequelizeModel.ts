import * as Sequelize from 'sequelize';
import { Pool } from './pool';
import { Spec, Attribute } from 'pretur.spec';

export type SequelizeInstance<T> = Sequelize.Instance<Partial<T>> & Partial<T>;
export type SequelizeModel<T> = Sequelize.Model<SequelizeInstance<T>, Partial<T>>;

export interface UninitializedSequelizeModel<T> {
  sequelizeModel: SequelizeModel<T>;
  initialize(pool: Pool): void;
}

export interface BuildSequelizeModelOptions<T> {
  attributeToFieldMap?: {[P in keyof T]?: string };
  tableName?: string;
  createDatabase?(sequelizeModel: SequelizeModel<T>): void;
}

export function buildSequelizeModel<T extends object>(
  spec: Spec<T>,
  sequelize: Sequelize.Sequelize,
  options?: BuildSequelizeModelOptions<T>,
): UninitializedSequelizeModel<T> {
  const attributes: { [attrib: string]: Sequelize.DefineAttributeColumnOptions } = {};

  for (const attribute of spec.attributes) {
    attributes[attribute.name] = {
      allowNull: !attribute.required,
      autoIncrement: attribute.primary && !!attribute.autoIncrement,
      defaultValue: attribute.defaultValue,
      field: (
        options &&
        options.attributeToFieldMap &&
        options.attributeToFieldMap[attribute.name]
      ) || undefined,
      primaryKey: !!attribute.primary,
      type: datatypeToSequelizeType(attribute),
      unique: !attribute.primary && !!attribute.unique,
      values: attribute.type === 'ENUM' ? attribute.values : undefined,
    };
  }

  const defineOptions: Sequelize.DefineOptions<SequelizeInstance<T>> = {
    tableName: (options && options.tableName) || spec.name,
  };

  if (spec.indexes.unique) {
    defineOptions.indexes = spec.indexes.unique.map(fields => ({ unique: true, fields }));
  }

  const model = sequelize.define<SequelizeInstance<T>, T>(spec.name, attributes, defineOptions);

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

    if (options && options.createDatabase) {
      options.createDatabase(model);
    }
  }

  return { sequelizeModel: model, initialize };
}

function datatypeToSequelizeType(attribute: Attribute): any {
  switch (attribute.type) {
    case 'BIGINT':
      return Sequelize.BIGINT;
    case 'INTEGER':
      return Sequelize.INTEGER;
    case 'STRING':
      return Sequelize.TEXT;
    case 'OBJECT':
      return Sequelize.JSONB;
    case 'ENUM':
      return Sequelize.ENUM;
    case 'BOOLEAN':
      return Sequelize.BOOLEAN;
    case 'DOUBLE':
      return Sequelize.DOUBLE;
    case 'DATE':
      return Sequelize.DATE;
    case 'RANGE':
      switch (attribute.subtype) {
        case 'BIGINT': return Sequelize.RANGE(Sequelize.BIGINT);
        case 'INTEGER': return Sequelize.RANGE(Sequelize.INTEGER);
        case 'DATE': return Sequelize.RANGE(Sequelize.DATE);
      }
  }
}
