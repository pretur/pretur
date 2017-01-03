import { assign, chain } from 'lodash';
import { Model, Owner } from './model';
import { DataTypes, AbstractType, IntegerType, StringType } from './datatypes';

export * from './datatypes';

export interface Attribute<T, K extends keyof T> {
  name: K;
  type: AbstractType;
  owner?: Owner;
  required?: boolean;
  unique?: boolean;
  primary?: boolean;
  autoIncrement?: boolean;
  mutable?: boolean;
  defaultValue?: T[K];
  validator?: string;
}

function getCommonDefaults(owner: Owner): Attribute<any, string> {
  return {
    owner,
    autoIncrement: false,
    mutable: true,
    name: undefined!,
    primary: false,
    required: false,
    type: undefined!,
    unique: false,
  };
}

export interface PrimaryKeyOptions<T, K extends keyof T> {
  name: K;
  type?: IntegerType | StringType;
  autoIncrement?: boolean;
  mutable?: boolean;
  validator?: string;
}

function getPrimaryKeyDefaults(owner: Owner): Attribute<any, string> {
  return assign(getCommonDefaults(owner), {
    autoIncrement: true,
    mutable: false,
    primary: true,
    type: DataTypes.INTEGER(),
  });
}

export function validateAttribute(attribute: Attribute<any, string>) {
  if (process.env.NODE_ENV !== 'production') {
    if (!attribute.name || typeof attribute.name !== 'string') {
      throw new Error(`Attribute name < ${attribute.name} > is invalid`);
    }

    if (!(attribute.type instanceof AbstractType)) {
      throw new Error(`Attribute ${attribute.name} does not have a valid type.`);
    }

    if (attribute.autoIncrement && !attribute.primary) {
      throw new Error(`Only primary keys can be auto increment. Check ${attribute.name}.`);
    }

    if (attribute.autoIncrement && !IntegerType.is(attribute.type)) {
      throw new Error(`Only integer attributes can be auto incremented. Check ${attribute.name}.`);
    }

    if (attribute.primary && (attribute.unique || attribute.required)) {
      throw new Error(`primary means unique and required. Providing both is redundant.`);
    }

    if (attribute.validator && typeof attribute.validator !== 'string') {
      throw new Error(`Attribute ${attribute.name} has non string validator.`);
    }
  }
}

export function appendAttribute<T>(model: Model<T>, ...attributes: Attribute<T, keyof T>[]): void {
  const attribute = assign<Attribute<T, keyof T>>({}, ...attributes);

  if (process.env.NODE_ENV !== 'production') {
    if (!model) {
      throw new Error('Model must be provided.');
    }

    if (attributes.length === 0) {
      throw new Error(`No attribute provided to be appended to ${model.name}.`);
    }

    if (chain(model.attributes).map('name').includes(attribute.name).value()) {
      throw new Error(
        `Attribute ${attribute.name} of type ${attribute.type.typeName} was added twice.`,
      );
    }

    validateAttribute(attribute);
  }

  model.attributes.push(attribute);
}

export interface AttributeBuilder<T> {
  <K extends keyof T>(options: Attribute<T, K>): void;
  primaryKey<K extends keyof T>(options?: PrimaryKeyOptions<T, K>): void;
}

export function createAttributeBuilder<T>(model: Model<T>): AttributeBuilder<T> {
  if (process.env.NODE_ENV !== 'production' && !model) {
    throw new Error('model must be provided');
  }

  const commonDefaults = getCommonDefaults(model.owner);
  const pkDefaults = getPrimaryKeyDefaults(model.owner);

  function attributeBuilder<K extends keyof T>(options: Attribute<T, K>): void {
    appendAttribute(model, commonDefaults, options);
  }

  const ab = <AttributeBuilder<T>>attributeBuilder;

  ab.primaryKey
    = function buildPrimaryKey<K extends keyof T>(options?: PrimaryKeyOptions<T, K>): void {
      if (options && StringType.is(options.type) && !('autoIncrement' in options)) {
        options.autoIncrement = false;
      }
      appendAttribute(model, pkDefaults, <Attribute<T, K>>options);
    };

  return ab;
}
