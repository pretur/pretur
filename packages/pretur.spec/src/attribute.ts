import { chain } from 'lodash';
import { Spec, Owner } from './spec';

export interface AttributeBase<T extends object, K extends keyof T> {
  name: K;
  owner?: Owner;
  required?: boolean;
  unique?: boolean;
  primary?: boolean;
  autoIncrement?: boolean;
  mutable?: boolean;
  defaultValue?: T[K];
}

export type NormalType = 'INTEGER' | 'BIGINT' | 'BOOLEAN' | 'DATE' | 'DOUBLE' | 'STRING' | 'OBJECT';
export type RangeType = 'INTEGER' | 'BIGINT' | 'DATE';

export interface NormalAttribute<T extends object, K extends keyof T> extends AttributeBase<T, K> {
  type: NormalType;
}

export interface EnumAttribute<T extends object, K extends keyof T> extends AttributeBase<T, K> {
  type: 'ENUM';
  typename: string;
  values: T[K][];
}

export interface RangeAttribute<T extends object, K extends keyof T> extends AttributeBase<T, K> {
  type: 'RANGE';
  subtype: RangeType;
}

export type Attribute<T extends object = any, K extends keyof T = keyof T> =
  | NormalAttribute<T, K>
  | EnumAttribute<T, K>
  | RangeAttribute<T, K>;

const defaults: Partial<Attribute> = {
  autoIncrement: false,
  mutable: true,
  primary: false,
  required: false,
  unique: false,
};

const primaryDefaults: Partial<Attribute> = {
  ...defaults,
  autoIncrement: true,
  mutable: false,
  primary: true,
  type: 'INTEGER',
};

export interface PrimaryKeyOptions<T, K extends keyof T> {
  name: K;
  type?: NormalType;
  autoIncrement?: boolean;
  mutable?: boolean;
}

export function validateAttribute(attribute: Attribute) {
  if (process.env.NODE_ENV !== 'production') {
    if (!attribute.name || typeof attribute.name !== 'string') {
      throw new Error(`Attribute name < ${attribute.name} > is invalid`);
    }

    if (attribute.autoIncrement && !attribute.primary) {
      throw new Error(`Only primary keys can be auto increment. Check ${attribute.name}.`);
    }

    if (attribute.autoIncrement && attribute.type !== 'INTEGER' && attribute.type !== 'BIGINT') {
      throw new Error(`Only integer attributes can be auto incremented. Check ${attribute.name}.`);
    }

    if (attribute.primary && (attribute.unique || attribute.required)) {
      throw new Error(`primary means unique and required. Providing both is redundant.`);
    }
  }
}

export function appendAttribute<T extends object>(
  spec: Spec<T>,
  attribute: Attribute<T>,
): void {
  if (process.env.NODE_ENV !== 'production') {
    if (!spec) {
      throw new Error('Model must be provided.');
    }

    if (!attribute) {
      throw new Error(`No attribute provided to be appended to ${spec.name}.`);
    }

    if (chain(spec.attributes).map('name').includes(attribute.name).value()) {
      throw new Error(
        `Attribute ${attribute.name} of type ${attribute.type.toString()} was added twice.`,
      );
    }

    validateAttribute(attribute);
  }

  spec.attributes.push(attribute);
}

export interface AttributeBuilder<T extends object> {
  <K extends keyof T>(options: Attribute<T, K>): void;
  primaryKey<K extends keyof T>(options?: PrimaryKeyOptions<T, K>): void;
}

export function createAttributeBuilder<T extends object>(spec: Spec<T>): AttributeBuilder<T> {
  if (process.env.NODE_ENV !== 'production' && !spec) {
    throw new Error('spec must be provided');
  }

  function attributeBuilder<K extends keyof T>(options: Attribute<T, K>): void {
    appendAttribute(spec, { ...defaults, owner: spec.owner, ...options });
  }

  const ab = <AttributeBuilder<T>>attributeBuilder;

  ab.primaryKey = function buildPrimaryKey<K extends keyof T>(
    options?: PrimaryKeyOptions<T, K>,
  ): void {
    if (options && options.type === 'STRING' && !options.hasOwnProperty('autoIncrement')) {
      options.autoIncrement = false;
    }
    appendAttribute(spec, { ...primaryDefaults, owner: spec.owner, ...(<any>options) });
  };

  return ab;
}
