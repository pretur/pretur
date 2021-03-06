/// <reference types="mocha" />

import { expect } from 'chai';
import { createSpec } from './spec';

type MockModel = {
  name: 'a';
  fields: {
    a: number;
    b: string;
    c: number;
    d: number;
    e: number;
    f: number;
    g: number;
  };
  records: {};
  sets: {};
};

describe('spec', () => {

  describe('createSpec', () => {

    it('should properly build an Spec object', () => {
      const spec = createSpec<MockModel>({
        name: 'a',
        scope: 'b',
      });

      expect(spec.join).to.be.false;
      expect(spec.scope).to.deep.equal('b');
      expect(spec.name).to.be.equals('a');
      expect(spec.initialize).to.be.a('function');
    });

    it('should properly call the builder with valid attribute and relation builder', () => {
      const spec = createSpec(
        { name: 'a', scope: undefined! },
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
      const spec = createSpec<MockModel>(
        { name: 'a', scope: undefined! },
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
