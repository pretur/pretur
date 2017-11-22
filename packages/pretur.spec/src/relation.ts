import { appendAttribute, NormalType } from './attribute';
import { Spec, SpecType } from './spec';

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

export interface Relation<T extends SpecType> {
  type: RelationType;
  target: { scope: string; model: string };
  through?: { scope: string; model: string };
  alias: keyof T['records'] | keyof T['sets'];
  key: string;
  required?: boolean;
  onDelete: ModificationActions;
  onUpdate: ModificationActions;
}

export interface ForeignKey<N extends string> {
  name: N;
  type?: NormalType;
  required?: boolean;
  unique?: boolean;
  primary?: boolean;
  mutable?: boolean;
  elide?: boolean;
}

export interface Inheritor<S extends SpecType, T extends SpecType> {
  target: Spec<T>;
  alias: keyof S['records'];
}

export interface InheritorsOptions<S extends SpecType, T extends SpecType> {
  sharedExistingUniqueField: keyof (S['fields'] | T['fields']);
  aliasOnSubclasses: keyof T['records'];
  typeIdentifierFieldName: keyof S['fields'];
  typeIdentifierRequired?: boolean;
  inheritors: Inheritor<S, T>[];
}

export interface MasterOptions<S extends SpecType, T extends SpecType> {
  target: Spec<T>;
  alias: keyof S['records'];
  ownAliasOnTarget: keyof T['sets'];
  foreignKey: ForeignKey<keyof S['fields']>;
  required?: boolean;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
}

export interface InjectiveOptions<S extends SpecType, T extends SpecType> {
  target: Spec<T>;
  alias: keyof S['records'];
  ownAliasOnTarget: keyof T['records'];
  foreignKey: ForeignKey<keyof S['fields']>;
  required?: boolean;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
  scope?: string;
  targetScope?: string;
}

export interface RecursiveOptions<S extends SpecType> {
  alias: keyof S['records'] | keyof S['sets'];
  key: keyof S['fields'];
  keyType?: NormalType;
  onDelete?: ModificationActions;
  onUpdate?: ModificationActions;
}

export function appendRelation<T extends SpecType>(spec: Spec<T>, relation: Relation<T>): void {
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
        `relation from ${spec.name} to ${relation.target.model} as ${relation.alias} ` +
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

    if (relation.type === 'RECURSIVE' && relation.target.model !== spec.name) {
      throw new Error(
        `Recursive relations must reference their own model. ` +
        `Please check ${spec.name}.${relation.alias}`,
      );
    }

    const checkMod = (mod: ModificationActions) => {
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

function inheritors<S extends SpecType, T extends SpecType>(
  spec: Spec<S>,
  options: InheritorsOptions<S, T>,
) {
  const typeEnumValues: (keyof S['records'])[] = [];

  for (const inheritor of options.inheritors) {
    appendRelation(spec, {
      alias: inheritor.alias,
      key: options.sharedExistingUniqueField,
      target: { scope: inheritor.target.scope, model: inheritor.target.name },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      required: false,
      type: 'SUBCLASS',
    });

    appendRelation(inheritor.target, {
      alias: options.aliasOnSubclasses,
      key: options.sharedExistingUniqueField,
      target: { scope: spec.scope, model: spec.name },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      required: false,
      type: 'SUPERCLASS',
    });

    typeEnumValues.push(inheritor.alias);
  }

  appendAttribute(spec, {
    mutable: true,
    name: options.typeIdentifierFieldName,
    required: options.typeIdentifierRequired || false,
    type: 'ENUM',
    typename: spec.name + 'SubclassType',
    values: typeEnumValues,
  });
}

function master<S extends SpecType, T extends SpecType>(
  spec: Spec<S>,
  options: MasterOptions<S, T>,
) {
  appendRelation(spec, {
    alias: options.alias,
    key: options.foreignKey.name,
    target: { scope: options.target.scope, model: options.target.name },
    onDelete: options.onDelete || 'RESTRICT',
    onUpdate: options.onUpdate || 'CASCADE',
    required: options.required || false,
    type: 'MASTER',
  });

  appendRelation(options.target, {
    alias: options.ownAliasOnTarget,
    key: options.foreignKey.name,
    target: { scope: spec.scope, model: spec.name },
    onDelete: options.onDelete || 'RESTRICT',
    onUpdate: options.onUpdate || 'CASCADE',
    required: options.required || false,
    type: 'DETAIL',
  });

  if (options.foreignKey.elide !== true) {
    appendAttribute(spec, {
      mutable: typeof options.foreignKey.mutable === 'boolean'
        ? options.foreignKey.mutable
        : !options.foreignKey.primary,
      name: options.foreignKey.name,
      primary: options.foreignKey.primary || false,
      required: typeof options.foreignKey.required === 'boolean'
        ? options.foreignKey.required
        : (!options.foreignKey.primary && options.required) || false,
      type: (options.foreignKey.type || 'INTEGER'),
      unique: options.foreignKey.unique || false,
    });
  }
}

function injective<S extends SpecType, T extends SpecType>(
  spec: Spec<S>,
  options: InjectiveOptions<S, T>,
) {
  appendRelation(spec, {
    alias: options.alias,
    key: options.foreignKey.name,
    target: { scope: options.target.scope, model: options.target.name },
    onDelete: options.onDelete || 'CASCADE',
    onUpdate: options.onUpdate || 'CASCADE',
    required: options.required || false,
    type: 'MASTER',
  });

  appendRelation(options.target, {
    alias: options.ownAliasOnTarget,
    key: options.foreignKey.name,
    target: { scope: spec.scope, model: spec.name },
    onDelete: options.onDelete || 'CASCADE',
    onUpdate: options.onUpdate || 'CASCADE',
    required: options.required || false,
    type: 'INJECTIVE',
  });

  if (options.foreignKey.elide !== true) {
    appendAttribute(spec, {
      mutable: typeof options.foreignKey.mutable === 'boolean'
        ? options.foreignKey.mutable
        : !options.foreignKey.primary,
      name: options.foreignKey.name,
      primary: options.foreignKey.primary || false,
      required: typeof options.foreignKey.required === 'boolean'
        ? options.foreignKey.required
        : (!options.foreignKey.primary && options.required) || false,
      type: options.foreignKey.type || 'INTEGER',
      unique: typeof options.foreignKey.unique === 'boolean'
        ? options.foreignKey.unique
        : !options.foreignKey.primary,
    });
  }
}

function recursive<S extends SpecType>(spec: Spec<S>, options: RecursiveOptions<S>) {
  appendRelation(spec, {
    alias: options.alias,
    key: options.key,
    target: { scope: spec.scope, model: spec.name },
    onDelete: options.onDelete || 'RESTRICT',
    onUpdate: options.onUpdate || 'CASCADE',
    required: false,
    type: 'RECURSIVE',
  });

  appendAttribute(spec, {
    mutable: true,
    name: options.key,
    required: false,
    type: options.keyType || 'INTEGER',
  });
}

export interface RelationsBuilder<S extends SpecType> {
  inheritors<T extends SpecType>(options: InheritorsOptions<S, T>): void;
  injective<T extends SpecType>(options: InjectiveOptions<S, T>): void;
  master<T extends SpecType>(options: MasterOptions<S, T>): void;
  recursive(options: RecursiveOptions<S>): void;
}

export function createRelationBuilder<S extends SpecType>(spec: Spec<S>): RelationsBuilder<S> {
  return {
    inheritors: <T extends SpecType>(options: InheritorsOptions<S, T>) => inheritors(spec, options),
    injective: <T extends SpecType>(options: InjectiveOptions<S, T>) => injective(spec, options),
    master: <T extends SpecType>(options: MasterOptions<S, T>) => master(spec, options),
    recursive: (options: RecursiveOptions<S>) => recursive(spec, options),
  };
}
