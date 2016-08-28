import { Validator } from 'pretur.validation';
import { Indexes, Model, Owner } from './model';
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

function ownersIntersect(first: Owner, second: Owner): boolean {
  const f = castArray(first!);
  const s = castArray(second!);

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
  private model: Model<T>;
  private byAlias = (alias: string) => find(this.model.relations, { alias });
  private nonVirtualByAlias = (alias: string) =>
    find(this.model.relations.filter(r => !r.virtual), { alias });

  public get name(): string {
    return this.model.name;
  }

  public get owner(): Owner {
    return this.model.owner;
  }

  public get virtual(): boolean {
    return this.model.virtual;
  }

  public get join(): boolean {
    return this.model.join;
  }

  public get validator(): Validator<T> | undefined {
    return this.model.validator;
  }

  public get attributes(): AttributeMap {
    const map: AttributeMap = {};
    this.model.attributes.forEach(attrib => map[attrib.name] = attrib);
    return map;
  }

  public get attributeArray(): Attribute<any>[] {
    return this.model.attributes;
  }

  public get indexes(): Indexes {
    return this.model.indexes;
  }

  public get relations(): Relations {
    const rels: Relations = {
      byAlias: this.byAlias,
      detail: [],
      injective: [],
      manyToMany: [],
      master: [],
      recursive: [],
      subclass: [],
      superclass: [],
    };

    populateRelations(rels, this.model.relations);

    return rels;
  }

  public get relationArray(): Relation[] {
    return this.model.relations;
  }

  public get nonVirtualRelations(): Relations {
    const rels: Relations = {
      byAlias: this.nonVirtualByAlias,
      detail: [],
      injective: [],
      manyToMany: [],
      master: [],
      recursive: [],
      subclass: [],
      superclass: [],
    };

    const nonVirtualRelations = this.model.relations.filter(r => !r.virtual);

    populateRelations(rels, nonVirtualRelations);

    return rels;
  }

  public get nonVirtualRelationArray(): Relation[] {
    return this.model.relations.filter(r => !r.virtual);
  }

  public get dependencies(): string[] {
    const allRelations = this.model.relations;
    return uniq([
      ...allRelations.map(r => r.model),
      ...allRelations.filter(r => r.type === 'MANY_TO_MANY').map(r => r.through!),
    ]).sort();
  }

  public get nonVirtualDependencies(): string[] {
    const allRelations = this.model.relations.filter(r => !r.virtual);
    return uniq([
      ...allRelations.map(r => r.model),
      ...allRelations.filter(r => r.type === 'MANY_TO_MANY').map(r => r.through!),
    ]).sort();
  }

  public constructor(model: Model<T>) {
    this.model = model;
  }

  public filterByOwner(owner: Owner): Spec<T> | null {
    if (!owner || !this.model.owner || owner.length === 0 || this.model.owner.length === 0) {
      return this;
    }

    if (!ownersIntersect(owner, this.model.owner)) {
      return null;
    }

    const newModel = assign({}, this.model, {
      attributes: this.model.attributes.filter(a => !a.owner || ownersIntersect(owner, a.owner)),
      relations: this.model.relations.filter(r => !r.owner || ownersIntersect(owner, r.owner)),
    });

    return new Spec<T>(newModel);
  }
}
