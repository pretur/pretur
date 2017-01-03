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

export interface JoinModelBuilder<T> {
  attribute: AttributeBuilder<T>;
  multicolumnUniqueIndex(...fields: (keyof T)[]): void;
}

export interface JoineeOptions<TJoin, TSource, TTarget> {
  model: UninitializedStateModel<TSource>;
  aliasOnJoin: keyof TJoin;
  aliasOnTarget: keyof TTarget;
  key: keyof TJoin;
  type?: IntegerType | StringType;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
  primary?: boolean;
}

export interface Joinee<TJoin, TSource, TTarget> {
  model: UninitializedStateModel<TSource>;
  aliasOnJoin: keyof TJoin;
  aliasOnTarget: keyof TTarget;
  key: keyof TJoin;
  primary: boolean;
  type: IntegerType | StringType;
  onDelete: ModificationActions;
  onUpdate: ModificationActions;
}

export function joineeValidateAndSetDefault<TJoin, TSource, TTarget>(
  options: JoineeOptions<TJoin, TSource, TTarget>,
): Joinee<TJoin, TSource, TTarget> {
  if (process.env.NODE_ENV !== 'production') {
    if (!options.model) {
      throw new Error('model is not provided');
    }

    if (typeof options.aliasOnJoin !== 'string') {
      throw new Error(`alias ${options.aliasOnJoin} is not valid`);
    }

    if (typeof options.aliasOnTarget !== 'string') {
      throw new Error(`alias ${options.aliasOnTarget} is not valid`);
    }
  }

  return {
    aliasOnJoin: options.aliasOnJoin,
    aliasOnTarget: options.aliasOnTarget,
    key: options.key,
    model: options.model,
    onDelete: options.onDelete || 'CASCADE',
    onUpdate: options.onUpdate || 'CASCADE',
    primary: options.primary !== false,
    type: options.type || DataTypes.INTEGER(),
  };
}

export interface CreateJoinModelOptions<TJoin, TFirst, TSecond> {
  name: string;
  owner: Owner;
  firstJoinee: JoineeOptions<TJoin, TFirst, TSecond>;
  secondJoinee: JoineeOptions<TJoin, TSecond, TFirst>;
  virtual?: boolean;
}

export function createJoinModel<TJoin, TSecond, TFirst>(
  options: CreateJoinModelOptions<TJoin, TSecond, TFirst>,
  initializer?: (modelBuilder: JoinModelBuilder<TJoin>) => void,
): UninitializedStateModel<TJoin> {

  const firstJoinee = joineeValidateAndSetDefault(options.firstJoinee);
  const secondJoinee = joineeValidateAndSetDefault(options.secondJoinee);

  const model: Model<TJoin> = {
    attributes: [],
    indexes: { unique: [] },
    join: true,
    name: options.name,
    owner: options.owner,
    relations: [],
    virtual: !!options.virtual,
  };

  const builder = <JoinModelBuilder<TJoin>>{
    attribute: createAttributeBuilder(model),
    multicolumnUniqueIndex(...fields: string[]) {
      model.indexes.unique.push(fields);
    },
  };

  builder.attribute({
    mutable: false,
    name: firstJoinee.key,
    primary: firstJoinee.primary,
    type: firstJoinee.type,
  });

  builder.attribute({
    mutable: false,
    name: secondJoinee.key,
    primary: secondJoinee.primary,
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

  function initialize(): Spec<TJoin> {
    if (typeof initializer === 'function') {
      initializer(builder);
    }
    return new Spec<TJoin>(model);
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
