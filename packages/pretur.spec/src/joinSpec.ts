import { ModificationActions, appendRelation } from './relation';
import { Spec, Owner } from './spec';
import { AttributeBuilder, createAttributeBuilder, NormalType } from './attribute';

export interface JoinSpecBuilder<T extends object> {
  attribute: AttributeBuilder<T>;
  multicolumnUniqueIndex(...fields: (keyof T)[]): void;
}

export interface JoineeOptions<
  TJoin extends object,
  TSource extends object,
  TTarget extends object> {
  spec: Spec<TSource>;
  aliasOnJoin: keyof TJoin;
  aliasOnTarget: keyof TTarget;
  key: keyof TJoin;
  type?: NormalType;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
  primary?: boolean;
}

export interface Joinee<TJoin extends object, TSource extends object, TTarget extends object> {
  spec: Spec<TSource>;
  aliasOnJoin: keyof TJoin;
  aliasOnTarget: keyof TTarget;
  key: keyof TJoin;
  primary: boolean;
  type: NormalType;
  onDelete: ModificationActions;
  onUpdate: ModificationActions;
}

export function joineeValidateAndSetDefault<
  TJoin extends object,
  TSource extends object,
  TTarget extends object>(
  options: JoineeOptions<TJoin, TSource, TTarget>,
): Joinee<TJoin, TSource, TTarget> {
  if (process.env.NODE_ENV !== 'production') {
    if (!options.spec) {
      throw new Error('spec is not provided');
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
    onDelete: options.onDelete || 'CASCADE',
    onUpdate: options.onUpdate || 'CASCADE',
    primary: options.primary !== false,
    spec: options.spec,
    type: options.type || 'INTEGER',
  };
}

export interface CreateJoinSpecOptions<
  TJoin extends object,
  TFirst extends object,
  TSecond extends object> {
  name: string;
  owner: Owner;
  firstJoinee: JoineeOptions<TJoin, TFirst, TSecond>;
  secondJoinee: JoineeOptions<TJoin, TSecond, TFirst>;
}

export function createJoinSpec<
  TJoin extends object,
  TSecond extends object,
  TFirst extends object>(
  options: CreateJoinSpecOptions<TJoin, TSecond, TFirst>,
  initializer?: (specBuilder: JoinSpecBuilder<TJoin>) => void,
): Spec<TJoin> {

  const firstJoinee = joineeValidateAndSetDefault(options.firstJoinee);
  const secondJoinee = joineeValidateAndSetDefault(options.secondJoinee);

  const spec: Spec<TJoin> = {
    attributes: [],
    indexes: { unique: [] },
    initialize,
    join: true,
    name: options.name,
    owner: options.owner,
    relations: [],
  };

  const builder = <JoinSpecBuilder<TJoin>>{
    attribute: createAttributeBuilder(spec),
    multicolumnUniqueIndex(...fields: string[]) {
      spec.indexes.unique.push(fields);
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

  appendRelation(spec, {
    alias: firstJoinee.aliasOnJoin,
    key: firstJoinee.key,
    model: firstJoinee.spec.name,
    onDelete: firstJoinee.onDelete,
    onUpdate: firstJoinee.onUpdate,
    owner: options.owner,
    required: true,
    type: 'MASTER',
  });

  appendRelation(spec, {
    alias: secondJoinee.aliasOnJoin,
    key: secondJoinee.key,
    model: secondJoinee.spec.name,
    onDelete: secondJoinee.onDelete,
    onUpdate: secondJoinee.onUpdate,
    owner: options.owner,
    required: true,
    type: 'MASTER',
  });

  appendRelation(firstJoinee.spec, {
    alias: secondJoinee.aliasOnTarget,
    key: firstJoinee.key,
    model: secondJoinee.spec.name,
    onDelete: firstJoinee.onDelete,
    onUpdate: firstJoinee.onUpdate,
    owner: options.owner,
    required: true,
    through: spec.name,
    type: 'MANY_TO_MANY',
  });

  appendRelation(secondJoinee.spec, {
    alias: firstJoinee.aliasOnTarget,
    key: secondJoinee.key,
    model: firstJoinee.spec.name,
    onDelete: secondJoinee.onDelete,
    onUpdate: secondJoinee.onUpdate,
    owner: options.owner,
    required: true,
    through: spec.name,
    type: 'MANY_TO_MANY',
  });

  function initialize() {
    if (typeof initializer === 'function') {
      initializer(builder);
    }
  }

  return spec;
}
