import { Validator } from 'pretur.validation';
import { createAttributeBuilder, AttributeBuilder, Attribute } from './attribute';
import { Relation, RelationsBuilder, createRelationBuilder } from './relation';
import { buildSpecFromModel, Spec } from './spec';

export interface Indexes {
  unique: string[][];
}

export interface UninitializedStateModel<T> {
  model: Model<T>;
  name: string;
  owner: string | string[];
  virtual: boolean;
  join: boolean;
  initialize: () => Spec<T>;
}

export interface Model<T> {
  name: string;
  owner: string | string[];
  virtual: boolean;
  join: boolean;
  attributes: Attribute<any>[];
  indexes: Indexes;
  relations: Relation[];
  validator?: Validator<T>;
}

export interface CreateModelOptions {
  name: string;
  owner: string | string[];
  virtual?: boolean;
}

export interface ModelBuilder<T> {
  attribute: AttributeBuilder;
  relation: RelationsBuilder;
  validator(validator: Validator<T>): void;
  multicolumnUniqueIndex(...fields: string[]): void;
}

export function createModel<T>(
  options: CreateModelOptions,
  initializer?: (modelBuilder: ModelBuilder<T>) => void
): UninitializedStateModel<T> {
  const model: Model<T> = {
    name: options.name,
    owner: options.owner,
    virtual: !!options.virtual,
    join: false,
    attributes: [],
    indexes: { unique: [] },
    relations: [],
  };

  const builder = <ModelBuilder<T>>{
    attribute: createAttributeBuilder(model),
    relation: createRelationBuilder(model),

    validator(validator: Validator<T>) {
      model.validator = validator;
    },

    multicolumnUniqueIndex(...fields: string[]) {
      model.indexes.unique.push(fields);
    },
  };

  function initialize(): Spec<T> {
    if (typeof initializer === 'function') {
      initializer(builder);
    }
    return buildSpecFromModel(model);
  }

  return {
    model: model,
    name: model.name,
    owner: model.owner,
    virtual: model.virtual,
    join: model.join,
    initialize,
  };
}
