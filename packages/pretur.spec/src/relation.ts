import { assign } from 'lodash';
import { appendAttribute, AbstractType, DataTypes, EnumValue } from './attribute';
import { Model, UninitializedStateModel, Owner } from './model';

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

export interface Relation {
  type: RelationType;
  model: string;
  owner?: Owner;
  alias: string;
  key: string;
  through?: string;
  required?: boolean;
  virtual?: boolean;
  onDelete: ModificationActions;
  onUpdate: ModificationActions;
}

export interface Inheritor<TSource, TTarget> {
  target: UninitializedStateModel<TTarget>;
  alias: keyof TSource;
  i18nKey: string;
}

export interface InheritorsOptions<TSource, TTarget> {
  sharedExistingUniqueField: keyof TTarget;
  aliasOnSubclasses: keyof TTarget;
  typeIdentifierFieldName: keyof TSource;
  typeIdentifierEnumTypeName?: string;
  typeIdentifierRequired?: boolean;
  inheritors: Inheritor<TSource, TTarget>[];
}

export interface MasterOptions<TSource, TTarget> {
  target: UninitializedStateModel<TTarget>;
  alias: keyof TSource;
  ownAliasOnTarget: keyof TTarget;
  foreignKey: keyof TSource;
  foreignKeyType?: AbstractType;
  required?: boolean;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
  owner?: Owner;
  targetOwner?: Owner;
  keyOwner?: Owner;
}

export interface InjectiveOptions<TSource, TTarget> {
  target: UninitializedStateModel<TTarget>;
  alias: keyof TSource;
  ownAliasOnTarget: keyof TTarget;
  foreignKey: keyof TSource;
  foreignKeyType?: AbstractType;
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
  keyType?: AbstractType;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
}

export function appendRelation<T>(model: Model<T>, ...relations: Relation[]): void {
  const relation = assign<Relation>({}, ...relations);

  if (process.env.NODE_ENV !== 'production') {
    if (!model) {
      throw new Error('Model must be provided.');
    }

    if (relations.length === 0) {
      throw new Error(`No relation provided to be appended to ${model.name}.`);
    }

    if (!relation.alias) {
      throw new Error('Relation should have an alias.');
    }

    if (!relation.key) {
      throw new Error('Relation should have a key.');
    }

    if (model.relations.filter(r => r.alias === relation.alias).length > 0) {
      throw new Error(
        `relation from ${model.name} to ${relation.model} as ${relation.alias} ` +
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
          `Please check ${model.name}.${relation.alias}.`,
        );
    }

    if (relation.type === 'MANY_TO_MANY' && !relation.through) {
      throw new Error(
        `Many to many relations need a join table. ` +
        `Please check ${model.name}.${relation.alias}`,
      );
    }

    if (relation.type === 'RECURSIVE' && relation.model !== model.name) {
      throw new Error(
        `Recursive relations must reference their own model. ` +
        `Please check ${model.name}.${relation.alias}`,
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
            `Please check ${model.name}.${relation.alias}.`,
          );
      }
    };

    checkMod(relation.onDelete);
    checkMod(relation.onUpdate);
  }

  model.relations.push(relation);
}

function inheritors<TSource, TTarget>(
  model: Model<TSource>,
  options: InheritorsOptions<TSource, TTarget>,
) {
  const typeEnumValues: EnumValue<string>[] = [];

  options.inheritors.forEach(inheritor => {
    appendRelation(model, {
      alias: inheritor.alias,
      key: options.sharedExistingUniqueField,
      model: inheritor.target.name,
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      owner: model.owner,
      required: false,
      type: 'SUBCLASS',
      virtual: inheritor.target.virtual,
    });

    appendRelation(inheritor.target.model, {
      alias: options.aliasOnSubclasses,
      key: options.sharedExistingUniqueField,
      model: model.name,
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      owner: model.owner,
      required: false,
      type: 'SUPERCLASS',
      virtual: model.virtual,
    });

    typeEnumValues.push({ i18nKey: inheritor.i18nKey, name: inheritor.alias });
  });

  const typeEnum = DataTypes.ENUM(
    options.typeIdentifierEnumTypeName || model.name + 'SubclassType',
    typeEnumValues,
  );

  appendAttribute(model, {
    mutable: true,
    name: options.typeIdentifierFieldName,
    owner: model.owner,
    required: options.typeIdentifierRequired || false,
    type: typeEnum,
  });
}

function master<TSource, TTarget>(model: Model<TSource>, options: MasterOptions<TSource, TTarget>) {
  appendRelation(model, {
    alias: options.alias,
    key: options.foreignKey,
    model: options.target.name,
    onDelete: options.onDelete || 'RESTRICT',
    onUpdate: options.onUpdate || 'CASCADE',
    owner: options.owner || model.owner,
    required: options.required || false,
    type: 'MASTER',
    virtual: options.target.virtual,
  });

  appendRelation(options.target.model, {
    alias: options.ownAliasOnTarget,
    key: options.foreignKey,
    model: model.name,
    onDelete: options.onDelete || 'RESTRICT',
    onUpdate: options.onUpdate || 'CASCADE',
    owner: options.targetOwner || model.owner,
    required: options.required || false,
    type: 'DETAIL',
    virtual: model.virtual,
  });

  appendAttribute(model, {
    mutable: true,
    name: options.foreignKey,
    owner: options.keyOwner || options.owner || model.owner,
    required: options.required || false,
    type: options.foreignKeyType || DataTypes.INTEGER(),
  });
}

function injective<TSource, TTarget>(
  model: Model<TSource>,
  options: InjectiveOptions<TSource, TTarget>,
) {
  appendRelation(model, {
    alias: options.alias,
    key: options.foreignKey,
    model: options.target.name,
    onDelete: options.onDelete || 'CASCADE',
    onUpdate: options.onUpdate || 'CASCADE',
    owner: options.owner || model.owner,
    required: options.required || false,
    type: 'MASTER',
    virtual: options.target.virtual,
  });

  appendRelation(options.target.model, {
    alias: options.ownAliasOnTarget,
    key: options.foreignKey,
    model: model.name,
    onDelete: options.onDelete || 'CASCADE',
    onUpdate: options.onUpdate || 'CASCADE',
    owner: options.targetOwner || model.owner,
    required: options.required || false,
    type: 'INJECTIVE',
    virtual: model.virtual,
  });

  appendAttribute(model, {
    mutable: typeof options.mutable === 'boolean' ? options.mutable : !options.primary,
    name: options.foreignKey,
    owner: options.keyOwner || options.owner || model.owner,
    primary: options.primary || false,
    required: options.required || false,
    type: options.foreignKeyType || DataTypes.INTEGER(),
    unique: typeof options.unique === 'boolean' ? options.unique : !options.primary,
  });
}

function recursive<T>(model: Model<T>, options: RecursiveOptions<T>) {
  appendRelation(model, {
    alias: options.alias,
    key: options.key,
    model: model.name,
    onDelete: options.onDelete || 'RESTRICT',
    onUpdate: options.onUpdate || 'CASCADE',
    owner: model.owner,
    required: false,
    type: 'RECURSIVE',
    virtual: model.virtual,
  });

  appendAttribute(model, {
    mutable: true,
    name: options.key,
    owner: model.owner,
    required: false,
    type: options.keyType || DataTypes.INTEGER(),
  });
}

export interface RelationsBuilder<TSource> {
  inheritors<TTarget>(options: InheritorsOptions<TSource, TTarget>): void;
  master<TTarget>(options: MasterOptions<TSource, TTarget>): void;
  injective<TTarget>(options: InjectiveOptions<TSource, TTarget>): void;
  recursive(options: RecursiveOptions<TSource>): void;
}

export function createRelationBuilder<TSource>(model: Model<TSource>): RelationsBuilder<TSource> {
  return {
    inheritors: <TTarget>(options: InheritorsOptions<TSource, TTarget>) =>
      inheritors(model, options),
    injective: <TTarget>(options: InjectiveOptions<TSource, TTarget>) => injective(model, options),
    master: <TTarget>(options: MasterOptions<TSource, TTarget>) => master(model, options),
    recursive: (options: RecursiveOptions<TSource>) => recursive(model, options),
  };
}
