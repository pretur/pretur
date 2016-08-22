import { Validator } from 'pretur.validation';
import { Indexes, Model } from './model';
import { Attribute } from './attribute';
import { Relation } from './relation';
import { uniq, find, assign, castArray, intersection } from 'lodash';

export interface AttributeMap {
  [name: string]: Attribute<any>;
}

export interface Relations {
  superclass: Relation[];
  subclass: Relation[];
  master: Relation[];
  detail: Relation[];
  recursive: Relation[];
  manyToMany: Relation[];
  injective: Relation[];
  byAlias(alias: string): Relation;
}

function ownersIntersect(first: string | string[], second: string | string[]): boolean {
  const f = castArray(first);
  const s = castArray(second);

  return intersection(f, s).filter(i => i).length > 0;
}

function populateRelations(relationsObj: Relations, relationsArray: Relation[]) {
  relationsArray.forEach(relation => {
    switch (relation.type) {
      case 'SUPERCLASS':
        relationsObj.superclass.push(relation);
        break;
      case 'SUBCLASS':
        relationsObj.subclass.push(relation);
        break;
      case 'MASTER':
        relationsObj.master.push(relation);
        break;
      case 'DETAIL':
        relationsObj.detail.push(relation);
        break;
      case 'RECURSIVE':
        relationsObj.recursive.push(relation);
        break;
      case 'MANY_TO_MANY':
        relationsObj.manyToMany.push(relation);
        break;
      case 'INJECTIVE':
        relationsObj.injective.push(relation);
        break;
    }
  });
}

export class Spec<T> {
  private _model: Model<T>;
  private _byAlias = alias => find(this._model.relations, { alias });
  private _nonVirtualByAlias = alias =>
    find(this._model.relations.filter(r => !r.virtual), { alias });

  public get name(): string {
    return this._model.name;
  }

  public get owner(): string | string[] {
    return this._model.owner;
  }

  public get virtual(): boolean {
    return this._model.virtual;
  }

  public get join(): boolean {
    return this._model.join;
  }

  public get validator(): Validator<T> {
    return this._model.validator;
  }

  public get attributes(): AttributeMap {
    const map: AttributeMap = {};
    this._model.attributes.forEach(attrib => map[attrib.name] = attrib);
    return map;
  }

  public get attributeArray(): Attribute<any>[] {
    return this._model.attributes;
  }

  public get indexes(): Indexes {
    return this._model.indexes;
  }

  public get relations(): Relations {
    const rels: Relations = {
      superclass: [],
      subclass: [],
      master: [],
      detail: [],
      recursive: [],
      manyToMany: [],
      injective: [],
      byAlias: this._byAlias,
    };

    populateRelations(rels, this._model.relations);

    return rels;
  }

  public get relationArray(): Relation[] {
    return this._model.relations;
  }

  public get nonVirtualRelations(): Relations {
    const rels: Relations = {
      superclass: [],
      subclass: [],
      master: [],
      detail: [],
      recursive: [],
      manyToMany: [],
      injective: [],
      byAlias: this._nonVirtualByAlias,
    };

    const nonVirtualRelations = this._model.relations.filter(r => !r.virtual);

    populateRelations(rels, nonVirtualRelations);

    return rels;
  }

  public get nonVirtualRelationArray(): Relation[] {
    return this._model.relations.filter(r => !r.virtual);
  }

  public get dependencies(): string[] {
    const allRelations = this._model.relations;
    return uniq([
      ...allRelations.map(r => r.model),
      ...allRelations.filter(r => r.type === 'MANY_TO_MANY').map(r => r.through),
    ]).sort();
  }

  public get nonVirtualDependencies(): string[] {
    const allRelations = this._model.relations.filter(r => !r.virtual);
    return uniq([
      ...allRelations.map(r => r.model),
      ...allRelations.filter(r => r.type === 'MANY_TO_MANY').map(r => r.through),
    ]).sort();
  }

  public constructor(model: Model<T>) {
    this._model = model;
  }

  public filterByOwner(owner: string | string[]): Spec<T> {
    if (!owner || !this._model.owner || owner.length === 0 || this._model.owner.length === 0) {
      return this;
    }

    if (!ownersIntersect(owner, this._model.owner)) {
      return null;
    }

    const newModel = assign<{}, Model<T>>({}, this._model, {
      attributes: this._model.attributes.filter(a => !a.owner || ownersIntersect(owner, a.owner)),
      relations: this._model.relations.filter(r => !r.owner || ownersIntersect(owner, r.owner)),
    });

    return new Spec<T>(newModel);
  }
}
