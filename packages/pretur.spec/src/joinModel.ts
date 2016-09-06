import { assign } from 'lodash';
import { ModificationActions, appendRelation } from './relation';
import { Model, UninitializedStateModel, Owner } from './model';
import { Spec } from './spec';
import {
  IntegerType,
  StringType,
  AttributeBuilder,
  createAttributeBuilder,
  DataTypes,
} from './attribute';

export interface JoinModelBuilder {
  attribute: AttributeBuilder;
}

export interface JoineeOptions {
  key?: string;
  type?: IntegerType | StringType;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
}

export interface Joinee {
  model: UninitializedStateModel<any>;
  aliasOnJoin: string;
  aliasOnTarget: string;
  key: string;
  type: IntegerType | StringType;
  onDelete: ModificationActions;
  onUpdate: ModificationActions;
}

export function joinee(
  model: UninitializedStateModel<any>,
  aliasOnJoin: string,
  aliasOnTarget: string,
  options?: JoineeOptions
): Joinee {
  if (process.env.NODE_ENV !== 'production') {
    if (!model) {
      throw new Error('model is not provided');
    }

    if (typeof aliasOnJoin !== 'string') {
      throw new Error(`alias ${aliasOnJoin} is not valid`);
    }

    if (typeof aliasOnTarget !== 'string') {
      throw new Error(`alias ${aliasOnTarget} is not valid`);
    }
  }

  return {
    model,
    aliasOnJoin,
    aliasOnTarget,
    key: (options && options.key) || `${aliasOnJoin}Id`,
    onDelete: (options && options.onDelete) || 'CASCADE',
    onUpdate: (options && options.onUpdate) || 'CASCADE',
    type: (options && options.type) || DataTypes.INTEGER(),
  };
}

export interface CreateJoinModelOptions {
  name: string;
  owner: Owner;
  firstJoinee: Joinee;
  secondJoinee: Joinee;
  virtual?: boolean;
}

export function createJoinModel<T>(
  options: CreateJoinModelOptions,
  initializer?: (modelBuilder: JoinModelBuilder) => void
): UninitializedStateModel<T> {

  const firstJoinee = options.firstJoinee;
  const secondJoinee = options.secondJoinee;

  const model: Model<any> = {
    attributes: [],
    indexes: {
      unique: [[firstJoinee.key, secondJoinee.key]],
    },
    join: true,
    name: options.name,
    owner: options.owner,
    relations: [],
    virtual: !!options.virtual,
  };

  const builder = <JoinModelBuilder>{
    attribute: createAttributeBuilder(model),
  };

  builder.attribute({
    name: firstJoinee.key,
    required: true,
    type: firstJoinee.type,
  });

  builder.attribute({
    name: secondJoinee.key,
    required: true,
    type: secondJoinee.type,
  });

  appendRelation(model, {
    alias: firstJoinee.aliasOnJoin,
    key: firstJoinee.key,
    model: firstJoinee.model.name,
    onDelete: firstJoinee.onDelete,
    onUpdate: firstJoinee.onUpdate,
    owner: options.owner,
    required: true,
    type: 'MASTER',
    virtual: firstJoinee.model.virtual,
  });

  appendRelation(model, {
    alias: secondJoinee.aliasOnJoin,
    key: secondJoinee.key,
    model: secondJoinee.model.name,
    onDelete: secondJoinee.onDelete,
    onUpdate: secondJoinee.onUpdate,
    owner: options.owner,
    required: true,
    type: 'MASTER',
    virtual: secondJoinee.model.virtual,
  });

  appendRelation(firstJoinee.model.model, {
    alias: secondJoinee.aliasOnTarget,
    key: firstJoinee.key,
    model: secondJoinee.model.name,
    onDelete: firstJoinee.onDelete,
    onUpdate: firstJoinee.onUpdate,
    owner: options.owner,
    required: true,
    through: model.name,
    type: 'MANY_TO_MANY',
    virtual: !!options.virtual,
  });

  appendRelation(secondJoinee.model.model, {
    alias: firstJoinee.aliasOnTarget,
    key: secondJoinee.key,
    model: firstJoinee.model.name,
    onDelete: secondJoinee.onDelete,
    onUpdate: secondJoinee.onUpdate,
    owner: options.owner,
    required: true,
    through: model.name,
    type: 'MANY_TO_MANY',
    virtual: !!options.virtual,
  });

  function initialize(): Spec<T> {
    if (typeof initializer === 'function') {
      initializer(builder);
    }
    return new Spec(model);
  }

  return {
    model,
    join: true,
    name: options.name,
    owner: options.owner,
    virtual: !!options.virtual,
    initialize,
  };
}
