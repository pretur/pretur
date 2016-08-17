import { Validator } from 'pretur.validation';
import { assign } from 'lodash';
import { appendAttribute, AbstractType, DataTypes, EnumValue } from './attribute';
import { Model, UninitializedStateModel } from './model';

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
  required?: boolean;
  virtual?: boolean;
  onDelete: ModificationActions;
  onUpdate: ModificationActions;
}

export interface Inheritor {
  target: UninitializedStateModel<any>;
  alias: string;
  i18nKey: string;
}

export interface InheritorsOptions<T> {
  sharedExistingUniqueField: string;
  aliasOnSubclasses: string;
  typeIdentifierFieldName?: string;
  typeIdentifierEnumTypeName?: string;
  typeIdentifierRequired?: boolean;
  typeIdentifierValidator?: Validator<T>;
  inheritors: Inheritor[];
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
  owner?: string | string[];
  targetOwner?: string | string[];
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
  owner?: string | string[];
  targetOwner?: string | string[];
}

export interface RecursiveOptions<T> {
  alias: string;
  key?: string;
  keyType?: AbstractType;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
  validator?: Validator<T>;
}

export function appendRelation(model: Model<any>, ...relations: Relation[]): void {
  const relation = assign<{}, Relation>({}, ...relations);

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
        `cannot be applied because there is already another relation with the same alias.`
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
          `Please check ${model.name}.${relation.alias}.`
        );
    }

    if (relation.type === 'MANY_TO_MANY' && !relation.through) {
      throw new Error(
        `Many to many relations need a join table. ` +
        `Please check ${model.name}.${relation.alias}`
      );
    }

    if (relation.type === 'RECURSIVE' && relation.model !== model.name) {
      throw new Error(
        `Recursive relations must reference their own model. ` +
        `Please check ${model.name}.${relation.alias}`
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
            `Please check ${model.name}.${relation.alias}.`
          );
      }
    };

    checkMod(relation.onDelete);
    checkMod(relation.onUpdate);
  }

  model.relations.push(relation);
}

function inheritors<T>(model: Model<any>, options: InheritorsOptions<T>) {
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

    appendRelation(inheritor.target.model, {
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

    typeEnumValues.push({ name: inheritor.alias, i18nKey: inheritor.i18nKey });
  });

  const typeEnum = DataTypes.ENUM(
    options.typeIdentifierEnumTypeName || model.name + 'SubclassType',
    typeEnumValues,
    typeEnumValues.map(t => `'${t.name}'`).join(' | ')
  );

  appendAttribute(model, {
    name: options.typeIdentifierFieldName || 'type',
    type: typeEnum,
    required: !!options.typeIdentifierRequired,
    mutable: true,
    validator: options.typeIdentifierValidator,
  });
}

function master<T>(model: Model<any>, options: MasterOptions<T>) {
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

  appendRelation(options.target.model, {
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

function injective<T>(model: Model<any>, options: InjectiveOptions<T>) {
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

  appendRelation(options.target.model, {
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

function recursive<T>(model: Model<any>, options: RecursiveOptions<T>) {
  appendRelation(model, {
    owner: model.owner,
    type: 'RECURSIVE',
    model: model.name,
    alias: options.alias,
    key: options.key || `${options.alias}Id`,
    required: false,
    virtual: model.virtual,
    onDelete: options.onDelete || 'RESTRICT',
    onUpdate: options.onUpdate || 'CASCADE',
  });

  appendAttribute(model, {
    name: options.key || `${options.alias}Id`,
    type: options.keyType || DataTypes.INTEGER(),
    required: false,
    validator: options.validator,
  });
}

export interface RelationsBuilder {
  inheritors<T>(options: InheritorsOptions<T>): void;
  master<T>(options: MasterOptions<T>): void;
  injective<T>(options: InjectiveOptions<T>): void;
  recursive<T>(options: RecursiveOptions<T>): void;
}

export function createRelationBuilder(model: Model<any>): RelationsBuilder {
  return {
    inheritors: options => inheritors(model, options),
    master: options => master(model, options),
    injective: options => injective(model, options),
    recursive: options => recursive(model, options),
  };
}
