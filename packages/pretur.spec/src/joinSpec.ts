import { ModificationActions, appendRelation } from './relation';
import { Spec, SpecType, Scope } from './spec';
import { AttributeBuilder, createAttributeBuilder, NormalType } from './attribute';

export interface JoinSpecBuilder<J extends SpecType> {
  attribute: AttributeBuilder<J['fields']>;
  multicolumnUniqueIndex(...fields: (keyof J['fields'])[]): void;
}

export interface JoineeOptions<J extends SpecType, S extends SpecType, T extends SpecType> {
  spec: Spec<S>;
  aliasOnJoin: keyof J['records'];
  aliasOnTarget: keyof T['sets'];
  key: keyof J['fields'];
  type?: NormalType;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
  primary?: boolean;
}

export interface Joinee<J extends SpecType, S extends SpecType, T extends SpecType> {
  spec: Spec<S>;
  aliasOnJoin: keyof J['records'];
  aliasOnTarget: keyof T['sets'];
  key: keyof J['fields'];
  primary: boolean;
  type: NormalType;
  onDelete: ModificationActions;
  onUpdate: ModificationActions;
}

export function joineeValidateAndSetDefault<
  J extends SpecType,
  S extends SpecType,
  T extends SpecType>(
  options: JoineeOptions<J, S, T>,
): Joinee<J, S, T> {
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

export interface CreateJoinSpecOptions<J extends SpecType, F extends SpecType, S extends SpecType> {
  name: J['name'];
  scope: Scope;
  firstJoinee: JoineeOptions<J, F, S>;
  secondJoinee: JoineeOptions<J, S, F>;
}

export function createJoinSpec<
  J extends SpecType = SpecType,
  F extends SpecType = SpecType,
  S extends SpecType = SpecType>(
  options: CreateJoinSpecOptions<J, F, S>,
  initializer?: (specBuilder: JoinSpecBuilder<J>) => void,
): Spec<J> {

  const firstJoinee = joineeValidateAndSetDefault(options.firstJoinee);
  const secondJoinee = joineeValidateAndSetDefault(options.secondJoinee);

  const spec: Spec<J> = {
    attributes: [],
    indexes: { unique: [] },
    initialize,
    join: true,
    model: undefined!,
    name: options.name,
    relations: [],
    scope: options.scope,
    type: undefined!,
  };

  const builder = <JoinSpecBuilder<J>>{
    attribute: createAttributeBuilder(spec),
    multicolumnUniqueIndex(...fields: (keyof J['fields'])[]) {
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
    required: true,
    scope: options.scope,
    type: 'MASTER',
  });

  appendRelation(spec, {
    alias: secondJoinee.aliasOnJoin,
    key: secondJoinee.key,
    model: secondJoinee.spec.name,
    onDelete: secondJoinee.onDelete,
    onUpdate: secondJoinee.onUpdate,
    required: true,
    scope: options.scope,
    type: 'MASTER',
  });

  appendRelation(firstJoinee.spec, {
    alias: secondJoinee.aliasOnTarget,
    key: firstJoinee.key,
    model: secondJoinee.spec.name,
    onDelete: firstJoinee.onDelete,
    onUpdate: firstJoinee.onUpdate,
    required: true,
    scope: options.scope,
    through: spec.name,
    type: 'MANY_TO_MANY',
  });

  appendRelation(secondJoinee.spec, {
    alias: firstJoinee.aliasOnTarget,
    key: secondJoinee.key,
    model: firstJoinee.spec.name,
    onDelete: secondJoinee.onDelete,
    onUpdate: secondJoinee.onUpdate,
    required: true,
    scope: options.scope,
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
