import { expect } from 'chai';
import { RawModel } from './model';
import { appendAttribute, createAttributeBuilder, DataTypes } from './attribute';

function mockRawModel(name: string): RawModel<any> {
  return {
    name: name,
    owner: null,
    virtual: false,
    join: false,
    attributes: [],
    relations: [],
    indexes: { unique: [] },
  };
}

describe('attribute', () => {

  describe('validateAttribute', () => {

    it('should fail when name is invalid', () => {
      const model = mockRawModel('A');
      const t = DataTypes.INTEGER();

      expect(() => appendAttribute(model, { name: null, type: t })).to.throw();
      expect(() => appendAttribute(model, { name: <any>1, type: t })).to.throw();
      expect(() => appendAttribute(model, { name: <any>0, type: t })).to.throw();
      expect(() => appendAttribute(model, { name: <any>false, type: t })).to.throw();
    });

    it('should fail when autoIncrement is used with non-primary', () => {
      const model = mockRawModel('A');
      const t = DataTypes.INTEGER();

      expect(() => appendAttribute(model, {
        name: null,
        type: t,
        primary: false,
        autoIncrement: true,
      })).to.throw();
    });

    it('should fail when primary is used with either unique or require or both', () => {
      const model = mockRawModel('A');
      const t = DataTypes.INTEGER();

      expect(() => appendAttribute(model, {
        name: 'a',
        type: t,
        primary: true,
        unique: false,
        required: false,
      })).not.to.throw();

      expect(() => appendAttribute(model, {
        name: 'b',
        type: t,
        primary: true,
        unique: true,
      })).to.throw();

      expect(() => appendAttribute(model, {
        name: 'c',
        type: t,
        primary: true,
        required: true,
      })).to.throw();

      expect(() => appendAttribute(model, {
        name: 'd',
        type: t,
        primary: true,
        unique: true,
        required: true,
      })).to.throw();
    });

    it('should fail when validator doesn\'t validate the provided default value', () => {
      const model = mockRawModel('A');
      const t = DataTypes.INTEGER();

      expect(() => appendAttribute(model, {
        name: 'a',
        type: t,
        defaultValue: 1,
        validator: n => n > 0 ? { data: null, key: 'A' } : null,
      })).to.throw();

      expect(() => appendAttribute(model, {
        name: 'a',
        type: t,
        defaultValue: null,
        validator: n => n === null ? { data: null, key: 'A' } : null,
      })).to.throw();

      expect(() => appendAttribute(model, {
        name: 'a',
        type: t,
        validator: n => n > 0 ? { data: null, key: 'A' } : null,
      })).not.to.throw();
    });

  });

  describe('appendAttribute', () => {

    it('should fail if no model is provided', () => {
      expect(() => appendAttribute(null, <any>{})).to.throw();
    });

    it('should fail if no attribute is provided', () => {
      expect(() => appendAttribute(mockRawModel('A'))).to.throw();
    });

    it('should fail if 2 attributes with the same name are added', () => {
      const model = mockRawModel('A');
      const t = DataTypes.INTEGER();

      expect(() => appendAttribute(model, { name: 'a', type: t })).not.to.throw();
      expect(() => appendAttribute(model, { name: 'a', type: t })).to.throw();
    });

  });

  describe('createAttributeBuilder', () => {

    it('should fail if no model is provided', () => {
      expect(() => createAttributeBuilder(null)).to.throw();
    });

  });

});
