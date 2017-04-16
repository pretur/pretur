/// <reference types="mocha" />

import { expect } from 'chai';
import { createSpec, ownersIntersect } from './spec';

interface MockSpec {
  a: number;
  b: string;
  c: number;
  d: number;
  e: number;
  f: number;
  g: number;
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
    expect(ownersIntersect(['', '', 'o'], undefined!)).to.be.false;
    expect(ownersIntersect(['', undefined!, 'o'], undefined!)).to.be.false;
    expect(ownersIntersect(['', undefined!, 'o'], undefined!)).to.be.false;
    expect(ownersIntersect(['', undefined!, 'o'], undefined!)).to.be.false;
    expect(ownersIntersect(['', '', 'o'], undefined!)).to.be.false;
    expect(ownersIntersect(['', 's', 'o'], ['t', '', 'i'])).to.be.false;
  });

});

describe('spec', () => {

  describe('createSpec', () => {

    it('should properly build an Spec object', () => {
      const spec = createSpec<MockSpec>({
        name: 'a',
        owner: ['b', 'c'],
      });

      expect(spec.join).to.be.false;
      expect(spec.owner).to.deep.equal(['b', 'c']);
      expect(spec.name).to.be.equals('a');
      expect(spec.initialize).to.be.a('function');
    });

    it('should properly call the builder with valid attribute and relation builder', () => {
      const spec = createSpec(
        { name: 'a', owner: undefined! },
        ({ attribute, relation }) => {
          expect(attribute).to.be.a('function');
          expect(attribute.primaryKey).to.be.a('function');
          expect(relation.inheritors).to.be.a('function');
          expect(relation.injective).to.be.a('function');
          expect(relation.master).to.be.a('function');
          expect(relation.recursive).to.be.a('function');
        },
      );

      spec.initialize();
    });

    it('should properly call the builder with valid multicolumnUniqueIndex builder', () => {
      const spec = createSpec<MockSpec>(
        { name: 'a', owner: undefined! },
        ({ multicolumnUniqueIndex }) => {
          expect(multicolumnUniqueIndex).to.be.a('function');
          multicolumnUniqueIndex('a', 'b');
          multicolumnUniqueIndex('c', 'd');
          multicolumnUniqueIndex('e', 'f', 'g');
        },
      );

      spec.initialize();

      expect(spec.indexes.unique[0]).to.deep.equal(['a', 'b']);
      expect(spec.indexes.unique[1]).to.deep.equal(['c', 'd']);
      expect(spec.indexes.unique[2]).to.deep.equal(['e', 'f', 'g']);
    });

  });

});
