import { appendAttribute, NormalType } from './attribute';
import { Spec, Owner } from './spec';

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

export interface Relation<T extends object, K extends string = string> {
  type: RelationType;
  model: string;
  owner?: Owner;
  alias: keyof T;
  key: K;
  through?: string;
  required?: boolean;
  onDelete: ModificationActions;
  onUpdate: ModificationActions;
}

export interface Inheritor<TSource extends object, TTarget extends object> {
  target: Spec<TTarget>;
  alias: keyof TSource;
}

export interface InheritorsOptions<TSource extends object, TTarget extends object> {
  sharedExistingUniqueField: keyof TTarget;
  aliasOnSubclasses: keyof TTarget;
  typeIdentifierFieldName: keyof TSource;
  typeIdentifierEnumTypeName?: string;
  typeIdentifierRequired?: boolean;
  inheritors: Inheritor<TSource, TTarget>[];
}

export interface MasterOptions<TSource extends object, TTarget extends object> {
  target: Spec<TTarget>;
  alias: keyof TSource;
  ownAliasOnTarget: keyof TTarget;
  foreignKey: keyof TSource;
  foreignKeyType?: NormalType;
  required?: boolean;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
  owner?: Owner;
  targetOwner?: Owner;
  keyOwner?: Owner;
}

export interface InjectiveOptions<TSource extends object, TTarget extends object> {
  target: Spec<TTarget>;
  alias: keyof TSource;
  ownAliasOnTarget: keyof TTarget;
  foreignKey: keyof TSource;
  foreignKeyType?: NormalType;
  required?: boolean;
  unique?: boolean;
  primary?: boolean;
  mutable?: boolean;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
  owner?: Owner;
  targetOwner?: Owner;
  keyOwner?: Owner;
}

export interface RecursiveOptions<T> {
  alias: keyof T;
  key: keyof T;
  keyType?: NormalType;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
}

export function appendRelation<T extends object>(spec: Spec<T>, relation: Relation<T>): void {

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

function inheritors<TSource extends object, TTarget extends object>(
  spec: Spec<TSource>,
  options: InheritorsOptions<TSource, TTarget>,
) {
  const typeEnumValues: string[] = [];

  options.inheritors.forEach(inheritor => {
    appendRelation(spec, {
      alias: inheritor.alias,
      key: options.sharedExistingUniqueField,
      model: inheritor.target.name,
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      owner: spec.owner,
      required: false,
      type: 'SUBCLASS',
    });

    appendRelation(inheritor.target, {
      alias: options.aliasOnSubclasses,
      key: options.sharedExistingUniqueField,
      model: spec.name,
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      owner: spec.owner,
      required: false,
      type: 'SUPERCLASS',
    });

    typeEnumValues.push(inheritor.alias);
  });

  appendAttribute(spec, {
    mutable: true,
    name: options.typeIdentifierFieldName,
    owner: spec.owner,
    required: options.typeIdentifierRequired || false,
    type: 'ENUM',
    typename: options.typeIdentifierEnumTypeName || spec.name + 'SubclassType',
    values: typeEnumValues,
  });
}

function master<TSource extends object, TTarget extends object>(
  spec: Spec<TSource>,
  options: MasterOptions<TSource, TTarget>,
) {
  appendRelation(spec, {
    alias: options.alias,
    key: options.foreignKey,
    model: options.target.name,
    onDelete: options.onDelete || 'RESTRICT',
    onUpdate: options.onUpdate || 'CASCADE',
    owner: options.owner || spec.owner,
    required: options.required || false,
    type: 'MASTER',
  });

  appendRelation(options.target, {
    alias: options.ownAliasOnTarget,
    key: options.foreignKey,
    model: spec.name,
    onDelete: options.onDelete || 'RESTRICT',
    onUpdate: options.onUpdate || 'CASCADE',
    owner: options.targetOwner || spec.owner,
    required: options.required || false,
    type: 'DETAIL',
  });

  appendAttribute(spec, {
    mutable: true,
    name: options.foreignKey,
    owner: options.keyOwner || options.owner || spec.owner,
    required: options.required || false,
    type: (options.foreignKeyType || 'INTEGER'),
  });
}

function injective<TSource extends object, TTarget extends object>(
  spec: Spec<TSource>,
  options: InjectiveOptions<TSource, TTarget>,
) {
  appendRelation(spec, {
    alias: options.alias,
    key: options.foreignKey,
    model: options.target.name,
    onDelete: options.onDelete || 'CASCADE',
    onUpdate: options.onUpdate || 'CASCADE',
    owner: options.owner || spec.owner,
    required: options.required || false,
    type: 'MASTER',
  });

  appendRelation(options.target, {
    alias: options.ownAliasOnTarget,
    key: options.foreignKey,
    model: spec.name,
    onDelete: options.onDelete || 'CASCADE',
    onUpdate: options.onUpdate || 'CASCADE',
    owner: options.targetOwner || spec.owner,
    required: options.required || false,
    type: 'INJECTIVE',
  });

  appendAttribute(spec, {
    mutable: typeof options.mutable === 'boolean' ? options.mutable : !options.primary,
    name: options.foreignKey,
    owner: options.keyOwner || options.owner || spec.owner,
    primary: options.primary || false,
    required: options.required || false,
    type: options.foreignKeyType || 'INTEGER',
    unique: typeof options.unique === 'boolean' ? options.unique : !options.primary,
  });
}

function recursive<T extends object>(spec: Spec<T>, options: RecursiveOptions<T>) {
  appendRelation(spec, {
    alias: options.alias,
    key: options.key,
    model: spec.name,
    onDelete: options.onDelete || 'RESTRICT',
    onUpdate: options.onUpdate || 'CASCADE',
    owner: spec.owner,
    required: false,
    type: 'RECURSIVE',
  });

  appendAttribute(spec, {
    mutable: true,
    name: options.key,
    owner: spec.owner,
    required: false,
    type: options.keyType || 'INTEGER',
  });
}

export interface RelationsBuilder<TSource extends object> {
  inheritors<TTarget extends object>(options: InheritorsOptions<TSource, TTarget>): void;
  master<TTarget extends object>(options: MasterOptions<TSource, TTarget>): void;
  injective<TTarget extends object>(options: InjectiveOptions<TSource, TTarget>): void;
  recursive(options: RecursiveOptions<TSource>): void;
}

export function createRelationBuilder<TSource extends object>(
  spec: Spec<TSource>,
): RelationsBuilder<TSource> {
  return {
    inheritors: <TTarget extends object>(options: InheritorsOptions<TSource, TTarget>) =>
      inheritors(spec, options),
    injective: <TTarget extends object>(options: InjectiveOptions<TSource, TTarget>) =>
      injective(spec, options),
    master: <TTarget extends object>(options: MasterOptions<TSource, TTarget>) =>
      master(spec, options),
    recursive: (options: RecursiveOptions<TSource>) => recursive(spec, options),
  };
}
