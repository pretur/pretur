import { Validator } from 'pretur.validation';
import { assign, chain } from 'lodash';
import { RawModel } from './model';
import { DataTypes, AbstractType, EnumType, IntegerType, StringType } from './datatypes';

export * from './datatypes';

export interface Attribute<T> {
  name: string;
  type: AbstractType;
  owner?: string | string[];
  required?: boolean;
  unique?: boolean;
  primary?: boolean;
  autoIncrement?: boolean;
  mutable?: boolean;
  defaultValue?: T;
  validator?: Validator<T>;
}

function getCommonDefaults(owner: string | string[]): Attribute<any> {
  return {
    owner,
    name: null,
    type: null,
    required: false,
    unique: false,
    primary: false,
    autoIncrement: false,
    mutable: true,
  };
};

export interface PrimaryKeyOptions<T> {
  name: string;
  type?: IntegerType | StringType;
  owner?: string | string[];
  autoIncrement?: boolean;
  mutable?: boolean;
  defaultValue?: T;
  validator?: Validator<T>;
}

function getPrimaryKeyDefaults(owner: string | string[]): Attribute<any> {
  return assign<Attribute<any>, Attribute<any>>(getCommonDefaults(owner), {
    type: DataTypes.INTEGER(),
    primary: true,
    autoIncrement: true,
    mutable: false,
  });
};

export interface SimpleOptions<T> {
  name: string;
  type: AbstractType;
  owner?: string | string[];
  required?: boolean;
  defaultValue?: T;
  validator?: Validator<T>;
}

export interface UniqueOptions<T> {
  name: string;
  type: AbstractType;
  owner?: string | string[];
  required?: boolean;
  mutable?: boolean;
  validator?: Validator<T>;
}

function getUniqueDefaults(owner: string | string[]): Attribute<any> {
  return assign<Attribute<any>, Attribute<any>>(getCommonDefaults(owner), {
    unique: true,
  });
}

export interface EnumOptions<TKey extends string> {
  name: string;
  type: EnumType<TKey>;
  owner?: string | string[];
  required?: boolean;
  unique?: boolean;
  mutable?: boolean;
  defaultValue?: TKey;
  validator?: Validator<TKey>;
}

export interface AttributeBuilder {
  <T>(options: Attribute<T>): void;
  primaryKey?<T>(options?: PrimaryKeyOptions<T>): void;
  simple?<T>(options: SimpleOptions<T>): void;
  unique?<T>(options: UniqueOptions<T>): void;
  enum?<TKey extends string>(options: EnumOptions<TKey>): void;
}

export function validateAttribute(attribute: Attribute<any>) {
  if (process.env.NODE_ENV !== 'production') {
    if (!attribute.name || typeof attribute.name !== 'string') {
      throw new Error(`Attribute name < ${attribute.name} > is invalid`);
    }

    if (attribute.autoIncrement && !attribute.primary) {
      throw new Error(`Only primary keys can be auto increment. Check ${attribute.name}.`);
    }

    if (attribute.primary && (attribute.unique || attribute.required)) {
      throw new Error(`primary means unique and required. Providing both is redundant.`);
    }

    if (
      attribute.defaultValue !== undefined &&
      attribute.validator &&
      attribute.validator(attribute.defaultValue) !== null
    ) {
      throw new Error(
        `The validator does not validate the defaultValue of ${attribute.defaultValue}`
      );
    }
  }
}

export function appendAttribute(model: RawModel<any>, ...attributes: Attribute<any>[]): void {
  const attribute = assign<{}, Attribute<any>>({}, ...attributes);

  if (process.env.NODE_ENV !== 'production') {
    if (!model) {
      throw new Error('Model must be provided.');
    }

    if (attributes.length === 0) {
      throw new Error(`No attribute provided to be appended to ${model.name}.`);
    }

    if (chain(model.attributes).map('name').includes(attribute.name).value()) {
      throw new Error(
        `Attribute ${attribute.name} of type ${attribute.type.typeName} was added twice.`
      );
    }

    validateAttribute(attribute);
  }

  model.attributes.push(attribute);
}

export function createAttributeBuilder(model: RawModel<any>): AttributeBuilder {
  if (process.env.NODE_ENV !== 'production' && !model) {
    throw new Error('model must be provided');
  }

  const commonDefaults = getCommonDefaults(model.owner);
  const pkDefaults = getPrimaryKeyDefaults(model.owner);
  const uniqueDefaults = getUniqueDefaults(model.owner);

  function attributeBuilder<T>(options: Attribute<T>): void {
    appendAttribute(model, commonDefaults, options);
  }

  const ab = <AttributeBuilder>attributeBuilder;

  ab.primaryKey = function buildPrimaryKey<T>(options?: PrimaryKeyOptions<T>): void {
    appendAttribute(model, pkDefaults, <Attribute<T>>options);
  };

  ab.simple = function buildSimple<T>(options?: SimpleOptions<T>): void {
    appendAttribute(model, commonDefaults, options);
  };

  ab.unique = function buildUnique<T>(options: UniqueOptions<T>): void {
    appendAttribute(model, uniqueDefaults, options);
  };

  ab.enum = function buildEnum<TKey extends string>(options: EnumOptions<TKey>): void {
    appendAttribute(model, commonDefaults, options);
  };

  return ab;
}
