import { Validator } from 'pretur.validation';
import { appendAttribute, AbstractType, DataTypes, EnumValue } from './attribute';
import { RawModel, UninitializedStateModel } from './model';

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
  owner: string | string[];
  alias: string;
  key: string;
  through?: string;
  required: boolean;
  virtual: boolean;
  onDelete: ModificationActions;
  onUpdate: ModificationActions;
}

export interface Inheritor {
  target: UninitializedStateModel<any>;
  alias: string;
  i18nKey: string;
}

export function inheritor(
  target: UninitializedStateModel<any>,
  alias: string,
  i18nKey: string
) {
  return { target, alias, i18nKey };
}

export interface InheritorsOptions<T> {
  sharedExistingUniqueField: string;
  typeIdentifierField: string;
  aliasOnSubclasses: string;
  inheritors: Inheritor[];
  required?: boolean;
  validator?: Validator<T>;
}

export interface MasterOptions<T> {
  target: UninitializedStateModel<any>;
  alias: string;
  ownAliasOnTarget: string;
  foreignKey?: string;
  foreignKeyType?: AbstractType;
  required?: boolean;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
  validator?: Validator<T>;
  owner?: string;
  targetOwner?: string;
}

export interface InjectiveOptions<T> {
  target: UninitializedStateModel<any>;
  alias: string;
  ownAliasOnTarget: string;
  foreignKey?: string;
  foreignKeyType?: AbstractType;
  required?: boolean;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
  validator?: Validator<T>;
  owner?: string;
  targetOwner?: string;
}

export interface RecursiveOptions<T> {
  alias: string;
  foreignKey?: string;
  foreignKeyType?: AbstractType;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
  validator?: Validator<T>;
}

export interface RelationsBuilder {
  inheritors<T>(options: InheritorsOptions<T>): void;
  master<T>(options: MasterOptions<T>): void;
  injective<T>(options: InjectiveOptions<T>): void;
  recursive<T>(options: RecursiveOptions<T>): void;
}

export function appendRelation(model: RawModel<any>, relation: Relation): void {
  if (!Array.isArray(model.relations)) {
    model.relations = [];
  }
  if (model.relations.filter(r => r.alias === relation.alias).length > 0) {
    throw new Error(`relation from ${model.name} to ${relation.model} as ${relation.alias} ` +
      `cannot be applied because there is already another relation with the same alias.`);
  }
  model.relations.push(relation);
}

export function createRelationBuilder(model: RawModel<any>): RelationsBuilder {

  function inheritors<T>(options: InheritorsOptions<T>) {
    const typeEnumValues: EnumValue<string>[] = [];

    options.inheritors.forEach(inheritor => {
      appendRelation(model, {
        owner: model.owner,
        type: 'SUBCLASS',
        model: inheritor.target.name,
        alias: inheritor.alias,
        key: options.sharedExistingUniqueField,
        required: false,
        virtual: inheritor.target.virtual,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      appendRelation(inheritor.target.rawModel, {
        owner: model.owner,
        type: 'SUPERCLASS',
        model: model.name,
        alias: options.aliasOnSubclasses,
        key: options.sharedExistingUniqueField,
        required: false,
        virtual: model.virtual,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

    });

    const typeEnum = DataTypes.ENUM(model.name + '_SUBCLASS_TYPE', typeEnumValues);

    appendAttribute(model, {
      name: options.typeIdentifierField,
      type: typeEnum,
      required: options.required || false,
      mutable: true,
      validator: options.validator,
    });
  }

  function master<T>(options: MasterOptions<T>) {
    appendRelation(model, {
      owner: options.owner || model.owner,
      type: 'MASTER',
      model: options.target.name,
      alias: options.alias,
      key: options.foreignKey || `${options.alias}Id`,
      required: options.required || false,
      virtual: options.target.virtual,
      onDelete: options.onDelete || 'RESTRICT',
      onUpdate: options.onUpdate || 'CASCADE',
    });

    appendRelation(options.target.rawModel, {
      owner: options.targetOwner || model.owner,
      type: 'DETAIL',
      model: model.name,
      alias: options.ownAliasOnTarget,
      key: options.foreignKey || `${options.alias}Id`,
      required: options.required || false,
      virtual: model.virtual,
      onDelete: options.onDelete || 'RESTRICT',
      onUpdate: options.onUpdate || 'CASCADE',
    });

    appendAttribute(model, {
      name: options.foreignKey || `${options.alias}Id`,
      type: options.foreignKeyType || DataTypes.INTEGER(),
      required: options.required || false,
      validator: options.validator,
    });
  }

  function injective<T>(options: InjectiveOptions<T>) {
    appendRelation(model, {
      owner: options.owner || model.owner,
      type: 'MASTER',
      model: options.target.name,
      alias: options.alias,
      key: options.foreignKey || `${options.alias}Id`,
      required: options.required || false,
      virtual: options.target.virtual,
      onDelete: options.onDelete || 'CASCADE',
      onUpdate: options.onUpdate || 'CASCADE',
    });

    appendRelation(options.target.rawModel, {
      owner: options.targetOwner || model.owner,
      type: 'INJECTIVE',
      model: model.name,
      alias: options.ownAliasOnTarget,
      key: options.foreignKey || `${options.alias}Id`,
      required: options.required || false,
      virtual: model.virtual,
      onDelete: options.onDelete || 'CASCADE',
      onUpdate: options.onUpdate || 'CASCADE',
    });

    appendAttribute(model, {
      name: options.foreignKey || `${options.alias}Id`,
      type: options.foreignKeyType || DataTypes.INTEGER(),
      required: options.required || false,
      validator: options.validator,
    });
  }

  function recursive<T>(options: RecursiveOptions<T>) {
    appendRelation(model, {
      owner: model.owner,
      type: 'RECURSIVE',
      model: model.name,
      alias: options.alias,
      key: options.foreignKey || `${options.alias}Id`,
      required: false,
      virtual: model.virtual,
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    appendAttribute(model, {
      name: options.foreignKey || `${options.alias}Id`,
      type: options.foreignKeyType || DataTypes.INTEGER(),
      required: false,
      validator: options.validator,
    });
  }

  return { inheritors, master, injective, recursive };
}
