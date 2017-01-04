/// <reference types="mocha" />

import { expect } from 'chai';
import { Model } from './model';
import { appendAttribute, createAttributeBuilder, DataTypes } from './attribute';

interface MockModel {
  a: number;
  b: string;
  c: number;
  d: number;
}

function mockModel(name: string): Model<MockModel> {
  return {
    name,
    attributes: [],
    indexes: { unique: [] },
    join: false,
    owner: undefined!,
    relations: [],
    virtual: false,
  };
}

describe('attribute', () => {

  describe('validateAttribute', () => {

    it('should fail when name is invalid', () => {
      const model = mockModel('A');
      const t = DataTypes.INTEGER();

      expect(() => appendAttribute(model, { name: undefined!, type: t })).to.throw();
      expect(() => appendAttribute(model, { name: <any>1, type: t })).to.throw();
      expect(() => appendAttribute(model, { name: <any>0, type: t })).to.throw();
      expect(() => appendAttribute(model, { name: <any>false, type: t })).to.throw();
    });

    it('should fail when type is invalid', () => {
      const model = mockModel('A');
      const t = <any>DataTypes.INTEGER;

      expect(() => appendAttribute(model, { name: 'a', type: t })).to.throw();
    });

    it('should fail when autoIncrement is used with non-primary', () => {
      const model = mockModel('A');
      const t = DataTypes.INTEGER();

      expect(() => appendAttribute(model, {
        autoIncrement: true,
        name: undefined!,
        primary: false,
        type: t,
      })).to.throw();
    });

    it('should fail when autoIncrement is used with non-integers', () => {
      const model = mockModel('A');
      const t = DataTypes.STRING();

      expect(() => appendAttribute(model, {
        autoIncrement: true,
        name: undefined!,
        primary: true,
        type: t,
      })).to.throw();
    });

    it('should fail when primary is used with either unique or require or both', () => {
      const model = mockModel('A');
      const t = DataTypes.INTEGER();

      expect(() => appendAttribute(model, {
        name: 'a',
        primary: true,
        required: false,
        type: t,
        unique: false,
      })).not.to.throw();

      expect(() => appendAttribute(model, {
        name: 'b',
        primary: true,
        type: t,
        unique: true,
      })).to.throw();

      expect(() => appendAttribute(model, {
        name: 'c',
        primary: true,
        required: true,
        type: t,
      })).to.throw();

      expect(() => appendAttribute(model, {
        name: 'd',
        primary: true,
        required: true,
        type: t,
        unique: true,
      })).to.throw();
    });

    it('should fail when validator is provided and is not a string', () => {
      const model = mockModel('A');
      const t = DataTypes.INTEGER();

      expect(() => appendAttribute(model, {
        name: 'a',
        type: t,
        validator: <any>(() => undefined),
      })).to.throw();
    });

  });

  describe('appendAttribute', () => {

    it('should properly append attributes to the model', () => {
      const model = mockModel('A');
      const type = DataTypes.INTEGER();

      appendAttribute(model, { name: 'a', type });
      appendAttribute(model, { name: 'a', type: undefined! }, { name: 'b', type });
      appendAttribute(model, <any>{}, { name: 'c', type });

      expect(model.attributes[0].name).to.be.equals('a');
      expect(model.attributes[1].name).to.be.equals('b');
      expect(model.attributes[2].name).to.be.equals('c');
    });

    it('should fail if no model is provided', () => {
      expect(() => appendAttribute(undefined!, <any>{})).to.throw();
    });

    it('should fail if no attribute is provided', () => {
      expect(() => appendAttribute(mockModel('A'))).to.throw();
    });

    it('should fail if 2 attributes with the same name are added', () => {
      const model = mockModel('A');
      const type = DataTypes.INTEGER();

      expect(() => appendAttribute(model, { name: 'a', type })).not.to.throw();
      expect(() => appendAttribute(model, { name: 'a', type })).to.throw();
    });

  });

  describe('createAttributeBuilder', () => {

    it('should fail if no model is provided', () => {
      expect(() => createAttributeBuilder(undefined!)).to.throw();
    });

    describe('attributeBuilder', () => {

      it('should properly build a valid attribute', () => {
        const builder = createAttributeBuilder(mockModel('a'));

        expect(() => builder({
          name: 'a',
          type: DataTypes.INTEGER(),
        })).not.to.throw();
      });

      it('should properly build a valid integer primary key attribute', () => {
        const builder = createAttributeBuilder(mockModel('a'));

        expect(() => builder.primaryKey({
          name: 'a',
          type: DataTypes.INTEGER(),
        })).not.to.throw();
      });

      it('should properly build a valid manual integer primary key attribute', () => {
        const model = mockModel('a');
        const builder = createAttributeBuilder(model);

        expect(() => builder.primaryKey({
          autoIncrement: false,
          name: 'a',
          type: DataTypes.INTEGER(),
        })).not.to.throw();

        expect(model.attributes[0].autoIncrement).to.be.false;
      });

      it('should properly build a valid string primary key attribute', () => {
        const builder = createAttributeBuilder(mockModel('a'));

        expect(() => builder.primaryKey({
          name: 'b',
          type: DataTypes.STRING(),
        })).not.to.throw();
      });

    });

  });

});
