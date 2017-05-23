import { appendAttribute, NormalType, EnumAttribute } from './attribute';
import { Spec, Model, ModelType, Scope } from './spec';

export type ModificationActions =
  'RESTRICT' |
  'CASCADE' |
  'NO ACTION' |
  'SET NULL' |
  'SET DEFAULT';

export type RelationType =
  'SUPERCLASS' |
  'SUBCLASS' |
  'MASTER' |
  'DETAIL' |
  'RECURSIVE' |
  'MANY_TO_MANY' |
  'INJECTIVE';

export interface Relation<R = any, S = any> {
  type: RelationType;
  model: string;
  scope?: Scope;
  alias: keyof R | keyof S;
  key: string;
  through?: string;
  required?: boolean;
  onDelete: ModificationActions;
  onUpdate: ModificationActions;
}

export interface Inheritor<SR, TF, TR, TS> {
  target: Spec<Model<ModelType<TF, TR, TS>>, TF, TR, TS>;
  alias: keyof SR;
}

export interface InheritorsOptions<SF, SR, TF, TR, TS> {
  sharedExistingUniqueField: keyof (SF | TF);
  aliasOnSubclasses: keyof TR;
  typeIdentifierFieldName: keyof SF;
  typeIdentifierEnumTypeName?: string;
  typeIdentifierRequired?: boolean;
  inheritors: Inheritor<SR, TF, TR, TS>[];
}

export interface MasterOptions<SF, SR, TF, TR, TS> {
  target: Spec<Model<ModelType<TF, TR, TS>>, TF, TR, TS>;
  alias: keyof SR;
  ownAliasOnTarget: keyof TS;
  foreignKey: keyof SF;
  foreignKeyType?: NormalType;
  required?: boolean;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
  scope?: Scope;
  targetScope?: Scope;
  keyScope?: Scope;
}

export interface InjectiveOptions<SF, SR, TF, TR, TS> {
  target: Spec<Model<ModelType<TF, TR, TS>>, TF, TR, TS>;
  alias: keyof SR;
  ownAliasOnTarget: keyof TR;
  foreignKey: keyof SF;
  foreignKeyType?: NormalType;
  required?: boolean;
  unique?: boolean;
  primary?: boolean;
  mutable?: boolean;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
  scope?: Scope;
  targetScope?: Scope;
  keyScope?: Scope;
}

export interface RecursiveOptions<F, R, S> {
  alias: keyof R | keyof S;
  key: keyof F;
  keyType?: NormalType;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
}

export function appendRelation<F, R, S>(
  spec: Spec<Model<ModelType<F, R, S>>, F, R, S>,
  relation: Relation<R, S>,
): void {

  if (process.env.NODE_ENV !== 'production') {
    if (!spec) {
      throw new Error('Spec must be provided.');
    }

    if (!relation) {
      throw new Error(`No relation provided to be appended to ${spec.name}.`);
    }

    if (!relation.alias) {
      throw new Error('Relation should have an alias.');
    }

    if (!relation.key) {
      throw new Error('Relation should have a key.');
    }

    if (spec.relations.filter(r => r.alias === relation.alias).length > 0) {
      throw new Error(
        `relation from ${spec.name} to ${relation.model} as ${relation.alias} ` +
        `cannot be applied because there is already another relation with the same alias.`,
      );
    }

    switch (relation.type) {
      case 'SUPERCLASS':
      case 'SUBCLASS':
      case 'MASTER':
      case 'DETAIL':
      case 'RECURSIVE':
      case 'MANY_TO_MANY':
      case 'INJECTIVE':
        break;
      default:
        throw new Error(
          `${relation.type} is not a valid relation type. ` +
          `Please check ${spec.name}.${relation.alias}.`,
        );
    }

    if (relation.type === 'MANY_TO_MANY' && !relation.through) {
      throw new Error(
        `Many to many relations need a join table. ` +
        `Please check ${spec.name}.${relation.alias}`,
      );
    }

    if (relation.type === 'RECURSIVE' && relation.model !== spec.name) {
      throw new Error(
        `Recursive relations must reference their own model. ` +
        `Please check ${spec.name}.${relation.alias}`,
      );
    }

    const checkMod = function checkMod(mod: ModificationActions) {
      switch (mod) {
        case 'RESTRICT':
        case 'CASCADE':
        case 'NO ACTION':
        case 'SET NULL':
        case 'SET DEFAULT':
          break;
        default:
          throw new Error(
            `${mod} is not a valid modification action type. ` +
            `Please check ${spec.name}.${relation.alias}.`,
          );
      }
    };

    checkMod(relation.onDelete);
    checkMod(relation.onUpdate);
  }

  spec.relations.push(relation);
}

function inheritors<SF, SR, SS, TF, TR, TS>(
  spec: Spec<Model<ModelType<SF, SR, SS>>, SF, SR, SS>,
  options: InheritorsOptions<SF, SR, TF, TR, TS>,
) {
  const typeEnumValues: (keyof SR)[] = [];

  options.inheritors.forEach(inheritor => {
    appendRelation(spec, {
      alias: inheritor.alias,
      key: options.sharedExistingUniqueField,
      model: inheritor.target.name,
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      required: false,
      scope: spec.scope,
      type: 'SUBCLASS',
    });

    appendRelation(inheritor.target, {
      alias: options.aliasOnSubclasses,
      key: options.sharedExistingUniqueField,
      model: spec.name,
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      required: false,
      scope: spec.scope,
      type: 'SUPERCLASS',
    });

    typeEnumValues.push(inheritor.alias);
  });

  appendAttribute(spec, <EnumAttribute<any>>{
    mutable: true,
    name: options.typeIdentifierFieldName,
    required: options.typeIdentifierRequired || false,
    scope: spec.scope,
    type: 'ENUM',
    typename: options.typeIdentifierEnumTypeName || spec.name + 'SubclassType',
    values: typeEnumValues,
  });
}

function master<SF, SR, SS, TF, TR, TS>(
  spec: Spec<Model<ModelType<SF, SR, SS>>, SF, SR, SS>,
  options: MasterOptions<SF, SR, TF, TR, TS>,
) {
  appendRelation(spec, {
    alias: options.alias,
    key: options.foreignKey,
    model: options.target.name,
    onDelete: options.onDelete || 'RESTRICT',
    onUpdate: options.onUpdate || 'CASCADE',
    required: options.required || false,
    scope: options.scope || spec.scope,
    type: 'MASTER',
  });

  appendRelation(options.target, {
    alias: options.ownAliasOnTarget,
    key: options.foreignKey,
    model: spec.name,
    onDelete: options.onDelete || 'RESTRICT',
    onUpdate: options.onUpdate || 'CASCADE',
    required: options.required || false,
    scope: options.targetScope || spec.scope,
    type: 'DETAIL',
  });

  appendAttribute(spec, {
    mutable: true,
    name: options.foreignKey,
    required: options.required || false,
    scope: options.keyScope || options.scope || spec.scope,
    type: (options.foreignKeyType || 'INTEGER'),
  });
}

function injective<SF, SR, SS, TF, TR, TS>(
  spec: Spec<Model<ModelType<SF, SR, SS>>, SF, SR, SS>,
  options: InjectiveOptions<SF, SR, TF, TR, TS>,
) {
  appendRelation(spec, {
    alias: options.alias,
    key: options.foreignKey,
    model: options.target.name,
    onDelete: options.onDelete || 'CASCADE',
    onUpdate: options.onUpdate || 'CASCADE',
    required: options.required || false,
    scope: options.scope || spec.scope,
    type: 'MASTER',
  });

  appendRelation(options.target, {
    alias: options.ownAliasOnTarget,
    key: options.foreignKey,
    model: spec.name,
    onDelete: options.onDelete || 'CASCADE',
    onUpdate: options.onUpdate || 'CASCADE',
    required: options.required || false,
    scope: options.targetScope || spec.scope,
    type: 'INJECTIVE',
  });

  appendAttribute(spec, {
    mutable: typeof options.mutable === 'boolean' ? options.mutable : !options.primary,
    name: options.foreignKey,
    primary: options.primary || false,
    required: options.required || false,
    scope: options.keyScope || options.scope || spec.scope,
    type: options.foreignKeyType || 'INTEGER',
    unique: typeof options.unique === 'boolean' ? options.unique : !options.primary,
  });
}

function recursive<SF, SR, SS>(
  spec: Spec<Model<ModelType<SF, SR, SS>>, SF, SR, SS>,
  options: RecursiveOptions<SF, SR, SS>,
) {
  appendRelation(spec, {
    alias: options.alias,
    key: options.key,
    model: spec.name,
    onDelete: options.onDelete || 'RESTRICT',
    onUpdate: options.onUpdate || 'CASCADE',
    required: false,
    scope: spec.scope,
    type: 'RECURSIVE',
  });

  appendAttribute(spec, {
    mutable: true,
    name: options.key,
    required: false,
    scope: spec.scope,
    type: options.keyType || 'INTEGER',
  });
}

export interface RelationsBuilder<SF, SR, SS> {
  inheritors<TF, TR, TS>(options: InheritorsOptions<SF, SR, TF, TR, TS>): void;
  injective<TF, TR, TS>(options: InjectiveOptions<SF, SR, TF, TR, TS>): void;
  master<TF, TR, TS>(options: MasterOptions<SF, SR, TF, TR, TS>): void;
  recursive(options: RecursiveOptions<SF, SR, SS>): void;
}

export function createRelationBuilder<SF, SR, SS>(
  spec: Spec<Model<ModelType<SF, SR, SS>>, SF, SR, SS>,
): RelationsBuilder<SF, SR, SS> {
  return {
    inheritors: <TF, TR, TS>(options: InheritorsOptions<SF, SR, TF, TR, TS>) =>
      inheritors(spec, options),
    injective: <TF, TR, TS>(options: InjectiveOptions<SF, SR, TF, TR, TS>) =>
      injective(spec, options),
    master: <TF, TR, TS>(options: MasterOptions<SF, SR, TF, TR, TS>) =>
      master(spec, options),
    recursive: (options: RecursiveOptions<SF, SR, SS>) => recursive(spec, options),
  };
}
