import { Validator } from 'pretur.validation';
import { assign } from 'lodash';
import { createAttributeBuilder, AttributeBuilder, Attribute } from './attribute';
import { Relation, RelationsBuilder, createRelationBuilder } from './relation';
import { buildModelFromRaw, Model } from './api';

export interface Indexes {
  unique: string[][];
}

export interface ModelBuilder<T> {
  attribute: AttributeBuilder;
  relation: RelationsBuilder;
  validator(validator: Validator<T>): void;
  multicolumnUniqueIndex(...fields: string[]): void;
}

export interface UninitializedStateModel<T> {
  rawModel: RawModel<T>;
  name: string;
  owner: string | string[];
  virtual: boolean;
  join: boolean;
  initialize: () => Model<T>;
}

export interface RawModel<T> {
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
  owner: string;
  virtual?: boolean;
}

const defaultCreateModelOptions: CreateModelOptions = {
  name: null,
  owner: null,
  virtual: false,
};

export function createModel<T>(
  options: CreateModelOptions,
  initializer: (modelBuilder: ModelBuilder<T>) => void
): UninitializedStateModel<T> {
  const normalizedOptions = assign<{}, CreateModelOptions>({}, defaultCreateModelOptions, options);

  const model: RawModel<T> = {
    name: normalizedOptions.name,
    owner: normalizedOptions.owner,
    virtual: normalizedOptions.virtual,
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

  function initialize(): Model<T> {
    if (typeof initializer === 'function') {
      initializer(builder);
    }
    return buildModelFromRaw(model);
  }

  return {
    rawModel: model,
    name: model.name,
    owner: model.owner,
    virtual: model.virtual,
    join: model.join,
    initialize,
  };
}
