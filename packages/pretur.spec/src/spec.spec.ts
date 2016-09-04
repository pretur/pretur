/// <reference types="mocha" />

import { expect } from 'chai';
import { Spec, ownersIntersect } from './spec';
import { Model } from './model';
import { Relation } from './relation';

function mockModel(name: string): Model<any> {
  return {
    name,
    attributes: [],
    indexes: { unique: [] },
    join: false,
    owner: null!,
    relations: [],
    validator: null!,
    virtual: false,
  };
}

describe('ownersIntersect', () => {

  it('should properly check if the two owner definitions intersect', () => {
    expect(ownersIntersect(['', '', 'o'], 'o')).to.be.true;
    expect(ownersIntersect(['', 's', 'o'], 's')).to.be.true;
    expect(ownersIntersect(['', 's', 'o'], ['s', '', 'o'])).to.be.true;
    expect(ownersIntersect('s', ['s', '', 'o'])).to.be.true;
    expect(ownersIntersect('o', ['s', 'o', 'o'])).to.be.true;

    expect(ownersIntersect(['', '  \t \n\n\n ', 'o'], '  \t \n\n\n ')).to.be.false;
    expect(ownersIntersect([' ', '  \t \n\n\n ', 'o'], ' ')).to.be.false;
    expect(ownersIntersect(['', '', 'o'], null)).to.be.false;
    expect(ownersIntersect(['', null!, 'o'], null)).to.be.false;
    expect(ownersIntersect(['', null!, 'o'], null)).to.be.false;
    expect(ownersIntersect(['', undefined!, 'o'], undefined!)).to.be.false;
    expect(ownersIntersect(['', '', 'o'], undefined!)).to.be.false;
    expect(ownersIntersect(['', 's', 'o'], ['t', '', 'i'])).to.be.false;
  });

});

describe('spec', () => {

  it('should sucessfully instantiate a Spec object', () => {
    expect(() => new Spec(mockModel('a'))).not.to.throw();
  });

  it('should properly forward the model properties without caching', () => {
    const model = mockModel('a');
    const spec = new Spec(model);
    const noop = () => null!;

    expect(spec.name).to.be.equals('a');
    expect(spec.owner).to.be.equals(null);
    expect(spec.virtual).to.be.equals(false);
    expect(spec.join).to.be.equals(false);
    expect(spec.validator).to.be.equals(null);

    model.name = 'c';
    model.owner = 'b';
    model.virtual = true;
    model.join = true;
    model.validator = noop;

    expect(spec.name).to.be.equals('c');
    expect(spec.owner).to.be.equals('b');
    expect(spec.virtual).to.be.equals(true);
    expect(spec.join).to.be.equals(true);
    expect(spec.validator).to.be.equals(noop);

    expect(spec.attributeArray).to.be.equals(model.attributes);
    expect(spec.indexes).to.be.equals(model.indexes);
    expect(spec.relationArray).to.be.equals(model.relations);
  });

  it('should properly compute the attribute map', () => {
    const model = mockModel('a');
    const spec = new Spec(model);

    expect(Object.keys(spec.attributes).length).to.be.equals(0);

    model.attributes.push({ name: 'id', owner: null, type: null! });

    expect(Object.keys(spec.attributes).length).to.be.equals(1);
    expect(spec.attributes['id'].name).to.be.equals('id');
  });

  it('should properly compute the relations object', () => {
    const model = mockModel('a');
    const spec = new Spec(model);

    expect(Object.keys(spec.relations.superclass).length).to.be.equals(0);
    expect(Object.keys(spec.relations.subclass).length).to.be.equals(0);
    expect(Object.keys(spec.relations.master).length).to.be.equals(0);
    expect(Object.keys(spec.relations.detail).length).to.be.equals(0);
    expect(Object.keys(spec.relations.recursive).length).to.be.equals(0);
    expect(Object.keys(spec.relations.manyToMany).length).to.be.equals(0);
    expect(Object.keys(spec.relations.injective).length).to.be.equals(0);

    model.relations.push(<Relation>{ alias: 'a', model: 'A', type: 'SUPERCLASS' });
    model.relations.push(<Relation>{ alias: 'a', model: 'A', type: 'SUBCLASS' });
    model.relations.push(<Relation>{ alias: 'a', model: 'A', type: 'MASTER' });
    model.relations.push(<Relation>{ alias: 'a', model: 'A', type: 'DETAIL' });
    model.relations.push(<Relation>{ alias: 'a', model: 'A', type: 'RECURSIVE' });
    model.relations.push(<Relation>{ alias: 'a', model: 'A', type: 'MANY_TO_MANY' });
    model.relations.push(<Relation>{ alias: 'a', model: 'A', type: 'INJECTIVE' });

    model.relations.push(<Relation>{ alias: 'a', model: 'A', type: 'SUBCLASS' });
    model.relations.push(<Relation>{ alias: 'a', model: 'A', type: 'MASTER' });
    model.relations.push(<Relation>{ alias: 'a', model: 'A', type: 'RECURSIVE' });
    model.relations.push(<Relation>{ alias: 'hello', model: 'H', type: 'INJECTIVE' });

    expect(Object.keys(spec.relations.superclass).length).to.be.equals(1);
    expect(Object.keys(spec.relations.subclass).length).to.be.equals(2);
    expect(Object.keys(spec.relations.master).length).to.be.equals(2);
    expect(Object.keys(spec.relations.detail).length).to.be.equals(1);
    expect(Object.keys(spec.relations.recursive).length).to.be.equals(2);
    expect(Object.keys(spec.relations.manyToMany).length).to.be.equals(1);
    expect(Object.keys(spec.relations.injective).length).to.be.equals(2);

    expect(spec.relations.byAlias('hello').model).to.be.equals('H');
  });

  it('should properly compute the non virtual relations object', () => {
    const model = mockModel('a');
    const spec = new Spec(model);

    expect(Object.keys(spec.nonVirtualRelations.superclass).length).to.be.equals(0);
    expect(Object.keys(spec.nonVirtualRelations.subclass).length).to.be.equals(0);
    expect(Object.keys(spec.nonVirtualRelations.master).length).to.be.equals(0);
    expect(Object.keys(spec.nonVirtualRelations.detail).length).to.be.equals(0);
    expect(Object.keys(spec.nonVirtualRelations.recursive).length).to.be.equals(0);
    expect(Object.keys(spec.nonVirtualRelations.manyToMany).length).to.be.equals(0);
    expect(Object.keys(spec.nonVirtualRelations.injective).length).to.be.equals(0);

    model.relations.push(<any>{ alias: 'a', model: 'A', type: 'SUPERCLASS', virtual: false });
    model.relations.push(<any>{ alias: 'a', model: 'A', type: 'SUBCLASS', virtual: true });
    model.relations.push(<any>{ alias: 'a', model: 'A', type: 'MASTER', virtual: true });
    model.relations.push(<any>{ alias: 'a', model: 'A', type: 'DETAIL', virtual: false });
    model.relations.push(<any>{ alias: 'a', model: 'A', type: 'RECURSIVE', virtual: true });
    model.relations.push(<any>{ alias: 'a', model: 'A', type: 'MANY_TO_MANY', virtual: true });
    model.relations.push(<any>{ alias: 'a', model: 'A', type: 'INJECTIVE', virtual: false });

    model.relations.push(<any>{ alias: 'a', model: 'A', type: 'SUBCLASS', virtual: false });
    model.relations.push(<any>{ alias: 'a', model: 'A', type: 'MASTER', virtual: true });
    model.relations.push(<any>{ alias: 'a', model: 'A', type: 'RECURSIVE', virtual: false });
    model.relations.push(<any>{ alias: 'hello', model: 'H', type: 'INJECTIVE', virtual: false });

    expect(Object.keys(spec.nonVirtualRelations.superclass).length).to.be.equals(1);
    expect(Object.keys(spec.nonVirtualRelations.subclass).length).to.be.equals(1);
    expect(Object.keys(spec.nonVirtualRelations.master).length).to.be.equals(0);
    expect(Object.keys(spec.nonVirtualRelations.detail).length).to.be.equals(1);
    expect(Object.keys(spec.nonVirtualRelations.recursive).length).to.be.equals(1);
    expect(Object.keys(spec.nonVirtualRelations.manyToMany).length).to.be.equals(0);
    expect(Object.keys(spec.nonVirtualRelations.injective).length).to.be.equals(2);

    expect(spec.nonVirtualRelations.byAlias('hello').model).to.be.equals('H');

    model.relations.push(<any>{ alias: 'world', model: 'W', type: 'INJECTIVE', virtual: true });

    expect(spec.nonVirtualRelations.byAlias('world')).to.be.undefined;

  });

  it('should properly compute the dependencies', () => {
    const model = mockModel('a');
    const spec = new Spec(model);

    expect(spec.dependencies.length).to.be.equals(0);

    model.relations.push(<any>{ alias: 'a', model: 'C', type: 'INJECTIVE' });
    model.relations.push(<any>{ alias: 'a', model: 'A', through: 'B', type: 'MANY_TO_MANY' });

    expect(spec.dependencies).to.deep.equal(['A', 'B', 'C']);
  });

  it('should properly compute the non virtual dependencies', () => {
    const model = mockModel('a');
    const spec = new Spec(model);

    expect(spec.nonVirtualDependencies.length).to.be.equals(0);

    model.relations.push(<any>{ alias: 'a', model: 'C', type: 'INJECTIVE', virtual: true });
    model.relations.push(<any>{ alias: 'a', model: 'A', through: 'B', type: 'MANY_TO_MANY' });

    expect(spec.nonVirtualDependencies).to.deep.equal(['A', 'B']);
  });

  describe('filterByOwner', () => {

    it('should return the same model if the input or the model owner are not specified', () => {
      const model = mockModel('M');
      const spec = new Spec(model);

      expect(spec.filterByOwner('a')).to.be.equals(spec);
      expect(spec.filterByOwner(['a', 'b'])).to.be.equals(spec);

      model.owner = 'owner';

      expect(spec.filterByOwner(null)).to.be.equals(spec);
      expect(spec.filterByOwner([])).to.be.equals(spec);
    });

    it('should return null if input and the model owner(s) have non in common', () => {
      const model = mockModel('M');
      const spec = new Spec(model);

      model.owner = 'owner';

      expect(spec.filterByOwner('a')).to.be.null;
      expect(spec.filterByOwner(['a', 'b'])).to.be.null;
    });

    it('should return a new spec if there are intersecting owners', () => {
      const model = mockModel('M');
      const spec = new Spec(model);

      model.owner = 'b';

      expect(spec.filterByOwner(['a', 'b'])).not.to.be.null;
      expect(spec.filterByOwner(['a', 'b'])).not.to.be.equals(spec);

      model.owner = ['b', 'c'];

      expect(spec.filterByOwner(['a', 'd'])).to.be.null;
      expect(spec.filterByOwner('a')).to.be.null;
      expect(spec.filterByOwner(['c', 'b'])).not.to.be.null;
      expect(spec.filterByOwner(['c', 'b'])).not.to.be.equals(spec);
      expect(spec.filterByOwner('c')).not.to.be.null;
      expect(spec.filterByOwner('c')).not.to.be.equals(spec);

    });

    it('should properly filter relations', () => {
      const model = mockModel('M');
      const spec = new Spec(model);

      model.owner = 'b';

      model.relations.push(<any>{ alias: '1' });
      model.relations.push(<any>{ alias: '2', owner: 'c' });
      model.relations.push(<any>{ alias: '3', owner: ['c', 'b'] });
      model.relations.push(<any>{ alias: '4', owner: null });

      expect(spec.filterByOwner('b') !.relations.byAlias('1')).not.to.be.undefined;
      expect(spec.filterByOwner('b') !.relations.byAlias('2')).to.be.undefined;
      expect(spec.filterByOwner('b') !.relations.byAlias('3')).not.to.be.undefined;
      expect(spec.filterByOwner('b') !.relations.byAlias('4')).not.to.be.undefined;

      expect(spec.filterByOwner(['b', 'c']) !.relations.byAlias('1')).not.to.be.undefined;
      expect(spec.filterByOwner(['b', 'c']) !.relations.byAlias('2')).not.to.be.undefined;
      expect(spec.filterByOwner(['b', 'c']) !.relations.byAlias('3')).not.to.be.undefined;
      expect(spec.filterByOwner(['b', 'c']) !.relations.byAlias('4')).not.to.be.undefined;
    });

    it('should properly filter attributes', () => {
      const model = mockModel('M');
      const spec = new Spec(model);

      model.owner = 'b';

      model.attributes.push(<any>{ name: '1' });
      model.attributes.push(<any>{ name: '2', owner: 'c' });
      model.attributes.push(<any>{ name: '3', owner: ['c', 'b'] });
      model.attributes.push(<any>{ name: '4', owner: null });

      expect(spec.filterByOwner('b') !.attributes['1']).not.to.be.undefined;
      expect(spec.filterByOwner('b') !.attributes['2']).to.be.undefined;
      expect(spec.filterByOwner('b') !.attributes['3']).not.to.be.undefined;
      expect(spec.filterByOwner('b') !.attributes['4']).not.to.be.undefined;

      expect(spec.filterByOwner(['b', 'c']) !.attributes['1']).not.to.be.undefined;
      expect(spec.filterByOwner(['b', 'c']) !.attributes['2']).not.to.be.undefined;
      expect(spec.filterByOwner(['b', 'c']) !.attributes['3']).not.to.be.undefined;
      expect(spec.filterByOwner(['b', 'c']) !.attributes['4']).not.to.be.undefined;
    });

  });

});
