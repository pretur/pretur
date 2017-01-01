/// <reference types="mocha" />

import { expect } from 'chai';
import { createModel } from './model';

describe('model', () => {

  describe('createModel', () => {

    it('should properly build an UninitializedStateModel object', () => {
      const model = createModel({
        name: 'a',
        owner: ['b', 'c'],
        virtual: false,
      });

      expect(model.join).to.be.false;
      expect(model.owner).to.deep.equal(['b', 'c']);
      expect(model.name).to.be.equals('a');
      expect(model.virtual).to.be.false;
      expect(model.initialize).to.be.a('function');
    });

    it('should properly call the builder with valid attribute and relation builder', () => {
      const model = createModel(
        { name: 'a', owner: null! },
        ({attribute, relation}) => {
          expect(attribute).to.be.a('function');
          expect(attribute.primaryKey).to.be.a('function');
          expect(relation.inheritors).to.be.a('function');
          expect(relation.injective).to.be.a('function');
          expect(relation.master).to.be.a('function');
          expect(relation.recursive).to.be.a('function');
        },
      );

      model.initialize();
    });

    it('should properly call the builder with valid multicolumnUniqueIndex builder', () => {
      const model = createModel(
        { name: 'a', owner: null! },
        ({multicolumnUniqueIndex}) => {
          expect(multicolumnUniqueIndex).to.be.a('function');
          multicolumnUniqueIndex('a', 'b');
          multicolumnUniqueIndex('c', 'd');
          multicolumnUniqueIndex('e', 'f', 'g');
        },
      );

      model.initialize();

      expect(model.model.indexes.unique[0]).to.deep.equal(['a', 'b']);
      expect(model.model.indexes.unique[1]).to.deep.equal(['c', 'd']);
      expect(model.model.indexes.unique[2]).to.deep.equal(['e', 'f', 'g']);
    });

    it('should properly call the builder with valid validator setter', () => {
      const noop = () => null!;
      const model = createModel(
        { name: 'a', owner: null! },
        ({validator}) => {
          expect(validator).to.be.a('function');
          validator(noop);
        },
      );

      model.initialize();

      expect(model.model.validator).to.be.equals(noop);
    });

  });

});
