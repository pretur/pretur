import { assign } from 'lodash';
import { ModificationActions, appendRelation } from './relation';
import { AbstractType, AttributeBuilder, createAttributeBuilder, DataTypes } from './attribute';
import { RawModel, UninitializedStateModel } from './model';
import { Model, buildModelFromRaw } from './api';

export interface JoinModelBuilder {
  attribute: AttributeBuilder;
}

export interface JoineeOptions {
  key?: string;
  type?: AbstractType;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
}

export interface Joinee {
  model: UninitializedStateModel<any>;
  alias: string;
  key: string;
  type: AbstractType;
  onDelete: ModificationActions;
  onUpdate: ModificationActions;
}

export function joinee(
  model: UninitializedStateModel<any>,
  alias: string,
  options?: JoineeOptions
): Joinee {
  return {
    model,
    alias,
    key: (options && options.key) || `${alias}Id`,
    type: (options && options.type) || DataTypes.INTEGER(),
    onDelete: (options && options.onDelete) || 'CASCADE',
    onUpdate: (options && options.onUpdate) || 'CASCADE',
  };
}

export interface CreateJoinModelOptions {
  name: string;
  owner: string | string[];
  firstJoinee: Joinee;
  secondJoinee: Joinee;
  virtual?: boolean;
}

const defaultCreateJoinModelOptions: CreateJoinModelOptions = {
  name: null,
  owner: null,
  firstJoinee: null,
  secondJoinee: null,
  virtual: false,
};

export function createJoinModel<T>(
  options: CreateJoinModelOptions,
  initializer?: (modelBuilder: JoinModelBuilder) => void
): UninitializedStateModel<T> {
  const normalizedOptions
    = assign<{}, CreateJoinModelOptions>({}, defaultCreateJoinModelOptions, options);

  const firstJoinee = normalizedOptions.firstJoinee;
  const secondJoinee = normalizedOptions.secondJoinee;

  const model: RawModel<any> = {
    name: normalizedOptions.name,
    owner: normalizedOptions.owner,
    virtual: normalizedOptions.virtual,
    join: true,
    attributes: [],
    relations: [],
    indexes: {
      unique: [[firstJoinee.key, secondJoinee.key]],
    },
  };

  const builder = <JoinModelBuilder>{
    attribute: createAttributeBuilder(model),
  };

  builder.attribute.simple({
    name: firstJoinee.key,
    type: firstJoinee.type,
    required: true,
  });

  builder.attribute.simple({
    name: secondJoinee.key,
    type: secondJoinee.type,
    required: true,
  });

  appendRelation(model, {
    type: 'MASTER',
    owner: normalizedOptions.owner,
    alias: firstJoinee.alias,
    key: firstJoinee.key,
    model: firstJoinee.model.name,
    onDelete: firstJoinee.onDelete,
    onUpdate: firstJoinee.onUpdate,
    required: true,
    virtual: firstJoinee.model.virtual,
  });

  appendRelation(model, {
    type: 'MASTER',
    owner: normalizedOptions.owner,
    alias: secondJoinee.alias,
    key: secondJoinee.key,
    model: secondJoinee.model.name,
    onDelete: secondJoinee.onDelete,
    onUpdate: secondJoinee.onUpdate,
    required: true,
    virtual: secondJoinee.model.virtual,
  });

  appendRelation(firstJoinee.model.rawModel, {
    type: 'MANY_TO_MANY',
    owner: normalizedOptions.owner,
    virtual: normalizedOptions.virtual,
    alias: secondJoinee.alias,
    key: firstJoinee.key,
    model: secondJoinee.model.name,
    through: model.name,
    onDelete: firstJoinee.onDelete,
    onUpdate: firstJoinee.onUpdate,
    required: true,
  });

  appendRelation(secondJoinee.model.rawModel, {
    type: 'MANY_TO_MANY',
    owner: normalizedOptions.owner,
    virtual: normalizedOptions.virtual,
    alias: firstJoinee.alias,
    key: secondJoinee.key,
    model: firstJoinee.model.name,
    through: model.name,
    onDelete: secondJoinee.onDelete,
    onUpdate: secondJoinee.onUpdate,
    required: true,
  });

  function initialize(): Model<T> {
    if (typeof initializer === 'function') {
      initializer(builder);
    }
    return buildModelFromRaw(model);
  }

  return {
    rawModel: model,
    name: normalizedOptions.name,
    owner: normalizedOptions.owner,
    virtual: normalizedOptions.virtual,
    join: true,
    initialize,
  };
}
