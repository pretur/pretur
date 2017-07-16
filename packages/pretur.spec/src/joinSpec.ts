import { ModificationActions, appendRelation } from './relation';
import { Spec, SpecType, Scope } from './spec';
import { AttributeBuilder, createAttributeBuilder, NormalType } from './attribute';

export interface JoinSpecBuilder<J extends SpecType> {
  attribute: AttributeBuilder<J['fields']>;
  multicolumnUniqueIndex(...fields: (keyof J['fields'])[]): void;
}

export interface JoinKey<N extends string> {
  name: N;
  type?: NormalType;
  primary?: boolean;
  scope?: Scope;
}

export interface JoineeOptions<J extends SpecType, S extends SpecType, T extends SpecType> {
  spec: Spec<S>;
  aliasOnJoin: keyof J['records'];
  aliasOnTarget: keyof T['sets'];
  key: JoinKey<keyof J['fields']>;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
  scope?: Scope;
}

export function validateJoinee<J extends SpecType, S extends SpecType, T extends SpecType>(
  options: JoineeOptions<J, S, T>,
) {
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

  validateJoinee(options.firstJoinee);
  validateJoinee(options.secondJoinee);

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
    name: options.firstJoinee.key.name,
    primary: options.firstJoinee.key.primary !== false,
    scope: options.firstJoinee.key.scope || options.firstJoinee.scope || options.scope,
    type: options.firstJoinee.key.type || 'INTEGER',
  });

  builder.attribute({
    mutable: false,
    name: options.secondJoinee.key.name,
    primary: options.secondJoinee.key.primary !== false,
    scope: options.secondJoinee.key.scope || options.secondJoinee.scope || options.scope,
    type: options.secondJoinee.key.type || 'INTEGER',
  });

  appendRelation(spec, {
    alias: options.firstJoinee.aliasOnJoin,
    key: options.firstJoinee.key.name,
    model: options.firstJoinee.spec.name,
    onDelete: options.firstJoinee.onDelete || 'CASCADE',
    onUpdate: options.firstJoinee.onUpdate || 'CASCADE',
    required: true,
    scope: options.firstJoinee.scope || options.scope,
    type: 'MASTER',
  });

  appendRelation(spec, {
    alias: options.secondJoinee.aliasOnJoin,
    key: options.secondJoinee.key.name,
    model: options.secondJoinee.spec.name,
    onDelete: options.secondJoinee.onDelete || 'CASCADE',
    onUpdate: options.secondJoinee.onUpdate || 'CASCADE',
    required: true,
    scope: options.secondJoinee.scope || options.scope,
    type: 'MASTER',
  });

  appendRelation(options.firstJoinee.spec, {
    alias: options.secondJoinee.aliasOnTarget,
    key: options.firstJoinee.key.name,
    model: options.secondJoinee.spec.name,
    onDelete: options.firstJoinee.onDelete || 'CASCADE',
    onUpdate: options.firstJoinee.onUpdate || 'CASCADE',
    required: true,
    scope: options.firstJoinee.scope || options.scope,
    through: spec.name,
    type: 'MANY_TO_MANY',
  });

  appendRelation(options.secondJoinee.spec, {
    alias: options.firstJoinee.aliasOnTarget,
    key: options.secondJoinee.key.name,
    model: options.firstJoinee.spec.name,
    onDelete: options.secondJoinee.onDelete || 'CASCADE',
    onUpdate: options.secondJoinee.onUpdate || 'CASCADE',
    required: true,
    scope: options.secondJoinee.scope || options.scope,
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
