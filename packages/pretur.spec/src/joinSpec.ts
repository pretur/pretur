import { ModificationActions, appendRelation } from './relation';
import { Spec, Model, ModelType, Owner } from './spec';
import { AttributeBuilder, createAttributeBuilder, NormalType } from './attribute';

export interface JoinSpecBuilder<F> {
  attribute: AttributeBuilder<F>;
  multicolumnUniqueIndex(...fields: (keyof F)[]): void;
}

export interface JoineeOptions<JF, JR, SF, SR, SS, TS> {
  spec: Spec<Model<ModelType<SF, SR, SS>>, SF, SR, SS>;
  aliasOnJoin: keyof JR;
  aliasOnTarget: keyof TS;
  key: keyof JF;
  type?: NormalType;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
  primary?: boolean;
}

export interface Joinee<JF, JR, SF, SR, SS, TS> {
  spec: Spec<Model<ModelType<SF, SR, SS>>, SF, SR, SS>;
  aliasOnJoin: keyof JR;
  aliasOnTarget: keyof TS;
  key: keyof JF;
  primary: boolean;
  type: NormalType;
  onDelete: ModificationActions;
  onUpdate: ModificationActions;
}

export function joineeValidateAndSetDefault<JF, JR, SF, SR, SS, TS>(
  options: JoineeOptions<JF, JR, SF, SR, SS, TS>,
): Joinee<JF, JR, SF, SR, SS, TS> {
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

export interface CreateJoinSpecOptions<JF, JR, JN extends string, FF, FR, FS, SF, SR, SS> {
  name: JN;
  owner: Owner;
  firstJoinee: JoineeOptions<JF, JR, FF, FR, FS, SS>;
  secondJoinee: JoineeOptions<JF, JR, SF, SR, SS, FS>;
}

export function createJoinSpec<
  J extends Model<JT>,
  F extends Model<FT>,
  S extends Model<ST>,
  JT extends ModelType<JF, JR, JS, JN> = J['$type'],
  JF = JT['fields'],
  JR = JT['records'],
  JS = JT['sets'],
  JN extends string = JT['name'],
  FT extends ModelType<FF, FR, FS> = F['$type'],
  FF = FT['fields'],
  FR = FT['records'],
  FS = FT['sets'],
  ST extends ModelType<SF, SR, SS> = S['$type'],
  SF = ST['fields'],
  SR = ST['records'],
  SS = ST['sets']>(
  options: CreateJoinSpecOptions<JF, JR, JN, FF, FR, FS, SF, SR, SS>,
  initializer?: (specBuilder: JoinSpecBuilder<JF>) => void,
): Spec<J> {

  const firstJoinee = joineeValidateAndSetDefault(options.firstJoinee);
  const secondJoinee = joineeValidateAndSetDefault(options.secondJoinee);

  const spec: Spec<J> = {
    $model: undefined!,
    attributes: [],
    indexes: { unique: [] },
    initialize,
    join: true,
    name: options.name,
    owner: options.owner,
    relations: [],
  };

  const builder = <JoinSpecBuilder<J>>{
    attribute: createAttributeBuilder(spec),
    multicolumnUniqueIndex(...fields: (keyof JF)[]) {
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
