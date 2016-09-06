import * as Sequelize from 'sequelize';
import { Pool } from './pool';
import {
  Spec,
  AbstractType,
  EnumType,
  IntegerType,
  StringType,
  ObjectType,
  BooleanType,
  DoubleType,
  DateType,
  RangeType,
} from 'pretur.spec';

export interface UninitializedSequelizeModel<TInstance, TAttributes> {
  sequelizeModel: Sequelize.Model<TInstance, TAttributes>;
  initialize(pool: Pool): void;
}

export interface BuildSequelizeModelOptions<TInstance, TAttributes> {
  attributeToFieldMap?: { [attribute: string]: string };
  tableName?: string;
  createDatabase?(sequelizeModel: Sequelize.Model<TInstance, TAttributes>): void;
}

export function buildSequelizeModel<TInstance, TAttributes>(
  spec: Spec<TAttributes>,
  sequelize: Sequelize.Sequelize,
  options?: BuildSequelizeModelOptions<TInstance, TAttributes>
): UninitializedSequelizeModel<TInstance, TAttributes> {
  const attributes: { [attrib: string]: Sequelize.DefineAttributeColumnOptions } = {};

  spec.attributeArray.forEach(attrib =>
    attributes[attrib.name] = {
      allowNull: !attrib.required,
      autoIncrement: attrib.primary && !!attrib.autoIncrement,
      defaultValue: attrib.defaultValue,
      field: (
        options &&
        options.attributeToFieldMap &&
        options.attributeToFieldMap[attrib.name]
      ) || undefined,
      primaryKey: !!attrib.primary,
      type: datatypeToSequelizeType(attrib.type),
      unique: !attrib.primary && !!attrib.unique,
      values: EnumType.is(attrib.type) ? attrib.type.values.map(v => v.name) : undefined,
    });

  const defineOptions: Sequelize.DefineOptions<TInstance> = {
    tableName: (options && options.tableName) || spec.name,
  };

  if (spec.indexes.unique) {
    defineOptions.indexes = spec.indexes.unique.map(fields => ({ unique: true, fields }));
  }

  const model = sequelize.define<TInstance, TAttributes>(spec.name, attributes, defineOptions);

  function initialize(pool: Pool) {
    spec.nonVirtualRelations.superclass.forEach(superclass => {
      if (pool.models[superclass.model] && pool.models[superclass.model].sequelizeModel) {
        model.belongsTo(pool.models[superclass.model].sequelizeModel!, {
          as: superclass.alias,
          foreignKey: superclass.key,
          onDelete: superclass.onDelete,
          onUpdate: superclass.onUpdate,
        });
      }
    });

    spec.nonVirtualRelations.subclass.forEach(subclass => {
      if (pool.models[subclass.model] && pool.models[subclass.model].sequelizeModel) {
        model.hasOne(pool.models[subclass.model].sequelizeModel!, {
          as: subclass.alias,
          foreignKey: subclass.key,
          onDelete: subclass.onDelete,
          onUpdate: subclass.onUpdate,
        });
      }
    });

    spec.nonVirtualRelations.manyToMany.forEach(manyToMany => {
      if (pool.models[manyToMany.model] && pool.models[manyToMany.model].sequelizeModel) {
        model.belongsToMany(pool.models[manyToMany.model].sequelizeModel!, {
          as: manyToMany.alias,
          foreignKey: manyToMany.key,
          onDelete: manyToMany.onDelete,
          onUpdate: manyToMany.onUpdate,
          through: pool.models[manyToMany.through!].sequelizeModel!,
        });
      }
    });

    spec.nonVirtualRelations.master.forEach(master => {
      if (pool.models[master.model] && pool.models[master.model].sequelizeModel) {
        model.belongsTo(pool.models[master.model].sequelizeModel!, {
          as: master.alias,
          foreignKey: master.key,
          onDelete: master.onDelete,
          onUpdate: master.onUpdate,
        });
      }
    });

    spec.nonVirtualRelations.detail.forEach(detail => {
      if (pool.models[detail.model] && pool.models[detail.model].sequelizeModel) {
        model.hasMany(pool.models[detail.model].sequelizeModel!, {
          as: detail.alias,
          foreignKey: detail.key,
          onDelete: detail.onDelete,
          onUpdate: detail.onUpdate,
        });
      }
    });

    spec.nonVirtualRelations.injective.forEach(injective => {
      if (pool.models[injective.model] && pool.models[injective.model].sequelizeModel) {
        model.hasOne(pool.models[injective.model].sequelizeModel!, {
          as: injective.alias,
          foreignKey: injective.key,
          onDelete: injective.onDelete,
          onUpdate: injective.onUpdate,
        });
      }
    });

    spec.nonVirtualRelations.recursive.forEach(recursive => {
      if (pool.models[recursive.model] && pool.models[recursive.model].sequelizeModel) {
        model.hasOne(pool.models[recursive.model].sequelizeModel!, {
          as: recursive.alias,
          foreignKey: recursive.key,
          onDelete: recursive.onDelete,
          onUpdate: recursive.onUpdate,
        });
      }
    });

    if (options && options.createDatabase) {
      options.createDatabase(model);
    }
  }

  return { sequelizeModel: model, initialize };
}

function datatypeToSequelizeType(datatype: AbstractType): any {
  switch (true) {
    case IntegerType.is(datatype):
      return Sequelize.INTEGER;
    case StringType.is(datatype):
      return Sequelize.TEXT;
    case ObjectType.is(datatype):
      return Sequelize.JSONB;
    case EnumType.is(datatype):
      return Sequelize.ENUM;
    case BooleanType.is(datatype):
      return Sequelize.BOOLEAN;
    case DoubleType.is(datatype):
      return Sequelize.DOUBLE;
    case DateType.is(datatype):
      return Sequelize.DATE;
    case RangeType.is(datatype):
      return Sequelize.RANGE(datatypeToSequelizeType((<RangeType>datatype).subType));
  }
}
