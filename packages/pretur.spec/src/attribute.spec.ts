import { expect } from 'chai';
import { Model } from './model';
import { appendAttribute, createAttributeBuilder, DataTypes } from './attribute';

function mockModel(name: string): Model<any> {
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
      const model = mockModel('A');
      const t = DataTypes.INTEGER();

      expect(() => appendAttribute(model, { name: null, type: t })).to.throw();
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
        name: null,
        type: t,
        primary: false,
        autoIncrement: true,
      })).to.throw();
    });

    it('should fail when autoIncrement is used with non-integers', () => {
      const model = mockModel('A');
      const t = DataTypes.STRING();

      expect(() => appendAttribute(model, {
        name: null,
        type: t,
        primary: true,
        autoIncrement: true,
      })).to.throw();
    });

    it('should fail when primary is used with either unique or require or both', () => {
      const model = mockModel('A');
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

    it('should fail when validator is provided and is not a function', () => {
      const model = mockModel('A');
      const t = DataTypes.INTEGER();

      expect(() => appendAttribute(model, {
        name: 'a',
        type: t,
        validator: <any>'blah',
      })).to.throw();
    });

    it('should fail when the validator cannot validate the provided default value', () => {
      const model = mockModel('A');
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

    it('should properly append attributes to the model', () => {
      const model = mockModel('A');
      const type = DataTypes.INTEGER();

      appendAttribute(model, { name: 'a', type });
      appendAttribute(model, { name: 'a', type: null }, { name: 'b', type });
      appendAttribute(model, <any>{}, { name: 'c', type });

      expect(model.attributes[0].name).to.be.equals('a');
      expect(model.attributes[1].name).to.be.equals('b');
      expect(model.attributes[2].name).to.be.equals('c');
    });

    it('should fail if no model is provided', () => {
      expect(() => appendAttribute(null, <any>{})).to.throw();
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

    it('should fail if 2 or more attributes are marked primary', () => {
      const model = mockModel('A');
      const type = DataTypes.INTEGER();

      expect(() => appendAttribute(model, { name: 'a', type, primary: true })).not.to.throw();
      expect(() => appendAttribute(model, { name: 'b', type, primary: true })).to.throw();
      expect(() => appendAttribute(model, { name: 'c', type, primary: true })).to.throw();
    });

  });

  describe('createAttributeBuilder', () => {

    it('should fail if no model is provided', () => {
      expect(() => createAttributeBuilder(null)).to.throw();
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
          name: 'a',
          type: DataTypes.INTEGER(),
          autoIncrement: false,
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
