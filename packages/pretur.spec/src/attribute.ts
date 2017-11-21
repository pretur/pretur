import { chain } from 'lodash';
import { Spec, SpecType } from './spec';

export type NormalType = 'INTEGER' | 'BIGINT' | 'BOOLEAN' | 'DATE' | 'DOUBLE' | 'STRING' | 'OBJECT';
export type RangeType = 'INTEGER' | 'BIGINT' | 'DATE';

export interface ArraySubtypeNormal {
  type: NormalType;
}

export interface ArraySubtypeDecimal {
  type: 'DECIMAL';
  precision?: number;
  scale?: number;
}

export interface ArraySubtypeRange {
  type: 'RANGE';
  subtype: RangeType;
}

export interface ArraySubtypeMultidimensional {
  type: 'ARRAY';
  subtype: ArraySubtype;
}

export type ArraySubtype =
  | ArraySubtypeNormal
  | ArraySubtypeDecimal
  | ArraySubtypeRange
  | ArraySubtypeMultidimensional;

export interface AttributeBase<T, K extends keyof T = keyof T> {
  name: K;
  scope?: string;
  required?: boolean;
  unique?: boolean;
  primary?: boolean;
  autoIncrement?: boolean;
  mutable?: boolean;
  defaultValue?: T[K];
}

export interface NormalAttribute<T, K extends keyof T = keyof T> extends AttributeBase<T, K> {
  type: NormalType;
}

export interface DecimalAttribute<T, K extends keyof T = keyof T> extends AttributeBase<T, K> {
  type: 'DECIMAL';
  precision?: number;
  scale?: number;
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

export interface ArrayAttribute<T, K extends keyof T = keyof T> extends AttributeBase<T, K> {
  type: 'ARRAY';
  subtype: ArraySubtype;
}

export type Attribute<T = any, K extends keyof T = keyof T> =
  | NormalAttribute<T, K>
  | DecimalAttribute<T, K>
  | EnumAttribute<T, K>
  | RangeAttribute<T, K>
  | ArrayAttribute<T, K>;

const defaults = {
  autoIncrement: false,
  mutable: true,
  primary: false,
  required: false,
  unique: false,
};

const primaryDefaults = {
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

export function appendAttribute<T extends SpecType>(
  spec: Spec<T>,
  attribute: Attribute<T['fields']>,
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

export function createAttributeBuilder<T extends SpecType>(
  spec: Spec<T>,
): AttributeBuilder<T['fields']> {
  if (process.env.NODE_ENV !== 'production' && !spec) {
    throw new Error('spec must be provided');
  }

  function attributeBuilder<K extends keyof T['fields']>(
    options: Attribute<T['fields'], K>,
  ): void {
    appendAttribute(spec, { ...defaults, scope: spec.scope, ...options });
  }

  const ab = <AttributeBuilder<T['fields']>>attributeBuilder;

  ab.primaryKey = function buildPrimaryKey<K extends keyof T['fields']>(
    options?: PrimaryKeyOptions<T['fields'], K>,
  ): void {
    if (options && options.type && options.type !== 'INTEGER' && options.type !== 'BIGINT') {
      options.autoIncrement = false;
    }
    appendAttribute(spec, { ...primaryDefaults, scope: spec.scope, ...(<any>options) });
  };

  return ab;
}
