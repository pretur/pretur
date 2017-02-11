import { createAttributeBuilder, AttributeBuilder, Attribute } from './attribute';
import { Relation, RelationsBuilder, createRelationBuilder } from './relation';
import { Spec } from './spec';

export type Owner = string | string[];

export interface Indexes {
  unique: string[][];
}

export interface UninitializedStateModel<T> {
  model: Model<T>;
  name: string;
  owner: Owner;
  virtual: boolean;
  join: boolean;
  initialize: () => Spec<T>;
}

export interface Model<T> {
  name: string;
  owner: Owner;
  virtual: boolean;
  join: boolean;
  attributes: Attribute<T, keyof T>[];
  indexes: Indexes;
  relations: Relation[];
}

export interface CreateModelOptions {
  name: string;
  owner: Owner;
  virtual?: boolean;
}

export interface ModelBuilder<T> {
  attribute: AttributeBuilder<T>;
  relation: RelationsBuilder<T>;
  multicolumnUniqueIndex(...fields: (keyof T)[]): void;
}

export function createModel<T>(
  options: CreateModelOptions,
  initializer?: (modelBuilder: ModelBuilder<T>) => void,
): UninitializedStateModel<T> {
  const model: Model<T> = {
    attributes: [],
    indexes: { unique: [] },
    join: false,
    name: options.name,
    owner: options.owner,
    relations: [],
    virtual: options.virtual || false,
  };

  const builder = <ModelBuilder<T>>{
    attribute: createAttributeBuilder(model),
    relation: createRelationBuilder(model),

    multicolumnUniqueIndex(...fields: string[]) {
      model.indexes.unique.push(fields);
    },
  };

  function initialize(): Spec<T> {
    if (typeof initializer === 'function') {
      initializer(builder);
    }
    return new Spec<T>(model);
  }

  return {
    initialize,
    model,
    join: model.join,
    name: model.name,
    owner: model.owner,
    virtual: model.virtual,
  };
}
