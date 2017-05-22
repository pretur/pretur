import { chain } from 'lodash';
import { Spec, Model, ModelType, Owner } from './spec';

export interface AttributeBase<T, K extends keyof T = keyof T> {
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

export interface NormalAttribute<T, K extends keyof T = keyof T> extends AttributeBase<T, K> {
  type: NormalType;
}

export interface EnumAttribute<T, K extends keyof T = keyof T> extends AttributeBase<T, K> {
  type: 'ENUM';
  typename: string;
  values: T[K][];
}

export interface RangeAttribute<T, K extends keyof T = keyof T> extends AttributeBase<T, K> {
  type: 'RANGE';
  subtype: RangeType;
}

export type Attribute<T = any, K extends keyof T = keyof T> =
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

export function appendAttribute<F, R, S>(
  spec: Spec<Model<ModelType<F, R, S>>, F, R, S>,
  attribute: Attribute<F>,
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

export interface AttributeBuilder<F> {
  <K extends keyof F>(options: Attribute<F, K>): void;
  primaryKey<K extends keyof F>(options?: PrimaryKeyOptions<F, K>): void;
}

export function createAttributeBuilder<F, R, S>(
  spec: Spec<Model<ModelType<F, R, S>>, F, R, S>,
): AttributeBuilder<F> {
  if (process.env.NODE_ENV !== 'production' && !spec) {
    throw new Error('spec must be provided');
  }

  function attributeBuilder<K extends keyof F>(options: Attribute<F, K>): void {
    appendAttribute(spec, { ...defaults, owner: spec.owner, ...options });
  }

  const ab = <AttributeBuilder<F>>attributeBuilder;

  ab.primaryKey = function buildPrimaryKey<K extends keyof F>(
    options?: PrimaryKeyOptions<F, K>,
  ): void {
    if (options && options.type && options.type !== 'INTEGER' && options.type !== 'BIGINT') {
      options.autoIncrement = false;
    }
    appendAttribute(spec, { ...primaryDefaults, owner: spec.owner, ...(<any>options) });
  };

  return ab;
}
