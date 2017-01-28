import { Indexes, Model, Owner } from './model';
import { Attribute } from './attribute';
import { Relation } from './relation';
import { uniq, find, assign, castArray, intersection, trim } from 'lodash';

export type AttributeMap<T> = {
  [P in keyof T]?: Attribute<T, P>;
};

export interface Relations<T> {
  superclass: Relation[];
  subclass: Relation[];
  master: Relation[];
  detail: Relation[];
  recursive: Relation[];
  manyToMany: Relation[];
  injective: Relation[];
  byAlias(alias: keyof T): Relation | undefined;
}

function nonVirtual(relation: Relation) {
  return !relation.virtual;
}

function validateOwnder(owner: Owner): boolean {
  if (typeof owner !== 'string') {
    return false;
  }

  return trim(owner) !== '';
}

export function ownersIntersect(first: Owner, second: Owner): boolean {
  const firstAsArray = castArray(first || undefined);
  const secondAsArray = castArray(second || undefined);

  return intersection(firstAsArray, secondAsArray).filter(validateOwnder).length > 0;
}

function populateRelations<T>(relationsObj: Relations<T>, relationsArray: Relation[]) {
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
  private byAlias = (alias: keyof T) => find(this.model.relations, { alias });
  private nonVirtualByAlias = (alias: keyof T) =>
    find(this.model.relations.filter(nonVirtual), { alias });

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

  public get attributes(): AttributeMap<T> {
    const map = <AttributeMap<T>>{};
    this.model.attributes.forEach(attrib => map[attrib.name] = attrib);
    return map;
  }

  public get attributeArray(): Attribute<T, keyof T>[] {
    return this.model.attributes;
  }

  public get indexes(): Indexes {
    return this.model.indexes;
  }

  public get relations(): Relations<T> {
    const rels: Relations<T> = {
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

  public get nonVirtualRelations(): Relations<T> {
    const rels: Relations<T> = {
      byAlias: this.nonVirtualByAlias,
      detail: [],
      injective: [],
      manyToMany: [],
      master: [],
      recursive: [],
      subclass: [],
      superclass: [],
    };

    const nonVirtualRelations = this.model.relations.filter(nonVirtual);

    populateRelations(rels, nonVirtualRelations);

    return rels;
  }

  public get nonVirtualRelationArray(): Relation[] {
    return this.model.relations.filter(nonVirtual);
  }

  public get dependencies(): string[] {
    const allRelations = this.model.relations;
    return uniq([
      ...allRelations.map(r => r.model),
      ...allRelations.filter(r => r.type === 'MANY_TO_MANY').map(r => r.through!),
    ]).sort();
  }

  public get nonVirtualDependencies(): string[] {
    const allRelations = this.model.relations.filter(nonVirtual);
    return uniq([
      ...allRelations.map(r => r.model),
      ...allRelations.filter(r => r.type === 'MANY_TO_MANY').map(r => r.through!),
    ]).sort();
  }

  public constructor(model: Model<T>) {
    this.model = model;
  }

  public filterByOwner(owner: Owner): Spec<T> | undefined {
    if (!owner || !this.model.owner || owner.length === 0 || this.model.owner.length === 0) {
      return this;
    }

    if (!ownersIntersect(owner, this.model.owner)) {
      return;
    }

    const newModel = assign({}, this.model, {
      attributes: this.model.attributes.filter(a => !a.owner || ownersIntersect(owner, a.owner)),
      relations: this.model.relations.filter(r => !r.owner || ownersIntersect(owner, r.owner)),
    });

    return new Spec<T>(newModel);
  }
}

export interface SpecPool {
  [model: string]: Spec<any>;
}

export function buildSpecPool(...specs: Spec<any>[]): SpecPool {
  const pool: SpecPool = {};

  for (const spec of specs) {
    pool[spec.name] = spec;
  }

  return pool;
}
