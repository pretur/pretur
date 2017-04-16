/// <reference types="mocha" />

import { expect } from 'chai';
import { noop } from 'lodash';
import { Spec } from './spec';
import { appendAttribute, createAttributeBuilder } from './attribute';

interface MockModel {
  a: number;
  b: string;
  c: number;
  d: number;
}

function mockSpec(name: string): Spec<MockModel> {
  return {
    name,
    attributes: [],
    indexes: { unique: [] },
    initialize: noop,
    join: false,
    owner: undefined!,
    relations: [],
  };
}

describe('attribute', () => {

  describe('validateAttribute', () => {

    it('should fail when name is invalid', () => {
      const spec = mockSpec('A');
      const t = 'INTEGER';

      expect(() => appendAttribute(spec, { name: undefined!, type: t })).to.throw();
      expect(() => appendAttribute(spec, { name: <any>1, type: t })).to.throw();
      expect(() => appendAttribute(spec, { name: <any>0, type: t })).to.throw();
      expect(() => appendAttribute(spec, { name: <any>false, type: t })).to.throw();
    });

    it('should fail when autoIncrement is used with non-primary', () => {
      const spec = mockSpec('A');
      const t = 'INTEGER';

      expect(() => appendAttribute(spec, {
        autoIncrement: true,
        name: undefined!,
        primary: false,
        type: t,
      })).to.throw();
    });

    it('should fail when autoIncrement is used with non-integers', () => {
      const spec = mockSpec('A');
      const t = 'STRING';

      expect(() => appendAttribute(spec, {
        autoIncrement: true,
        name: undefined!,
        primary: true,
        type: t,
      })).to.throw();
    });

    it('should fail when primary is used with either unique or require or both', () => {
      const spec = mockSpec('A');
      const t = 'INTEGER';

      expect(() => appendAttribute(spec, {
        name: 'a',
        primary: true,
        required: false,
        type: t,
        unique: false,
      })).not.to.throw();

      expect(() => appendAttribute(spec, {
        name: 'b',
        primary: true,
        type: t,
        unique: true,
      })).to.throw();

      expect(() => appendAttribute(spec, {
        name: 'c',
        primary: true,
        required: true,
        type: t,
      })).to.throw();

      expect(() => appendAttribute(spec, {
        name: 'd',
        primary: true,
        required: true,
        type: t,
        unique: true,
      })).to.throw();
    });

  });

  describe('appendAttribute', () => {

    it('spec', () => {
      const spec = mockSpec('A');
      const type = 'INTEGER';

      appendAttribute(spec, { name: 'a', type });
      appendAttribute(spec, { name: 'b', type });
      appendAttribute(spec, { name: 'c', type });

      expect(spec.attributes[0].name).to.be.equals('a');
      expect(spec.attributes[1].name).to.be.equals('b');
      expect(spec.attributes[2].name).to.be.equals('c');
    });

    it('should fail if no spec is provided', () => {
      expect(() => appendAttribute(undefined!, <any>{})).to.throw();
    });

    it('should fail if no attribute is provided', () => {
      expect(() => appendAttribute(mockSpec('A'), undefined!)).to.throw();
    });

    it('should fail if 2 attributes with the same name are added', () => {
      const spec = mockSpec('A');
      const type = 'INTEGER';

      expect(() => appendAttribute(spec, { name: 'a', type })).not.to.throw();
      expect(() => appendAttribute(spec, { name: 'a', type })).to.throw();
    });

  });

  describe('createAttributeBuilder', () => {

    it('should fail if no spec is provided', () => {
      expect(() => createAttributeBuilder(undefined!)).to.throw();
    });

    describe('attributeBuilder', () => {

      it('should properly build a valid attribute', () => {
        const builder = createAttributeBuilder(mockSpec('a'));

        expect(() => builder({
          name: 'a',
          type: 'INTEGER',
        })).not.to.throw();
      });

      it('should properly build a valid integer primary key attribute', () => {
        const builder = createAttributeBuilder(mockSpec('a'));

        expect(() => builder.primaryKey({
          name: 'a',
          type: 'INTEGER',
        })).not.to.throw();
      });

      it('should properly build a valid manual integer primary key attribute', () => {
        const spec = mockSpec('a');
        const builder = createAttributeBuilder(spec);

        expect(() => builder.primaryKey({
          autoIncrement: false,
          name: 'a',
          type: 'INTEGER',
        })).not.to.throw();

        expect(spec.attributes[0].autoIncrement).to.be.false;
      });

      it('should properly build a valid string primary key attribute', () => {
        const builder = createAttributeBuilder(mockSpec('a'));

        expect(() => builder.primaryKey({
          name: 'b',
          type: 'INTEGER',
        })).not.to.throw();
      });

    });

  });

});
