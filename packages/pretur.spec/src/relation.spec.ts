/// <reference types="mocha" />

import { expect } from 'chai';
import { noop } from 'lodash';
import { Spec } from './spec';
import { EnumAttribute } from './attribute';
import {
  Relation,
  appendRelation,
  InheritorsOptions,
  Inheritor,
  createRelationBuilder,
} from './relation';

interface MockModel {
  id: number;
  type: string;
  main: MockModel;
  master: MockModel;
  masterId: number;
  someId: number;
  details: MockModel[];
  parent: MockModel;
}

interface Child1 {
  id: number;
  main: MockModel;
  a: number;
}

interface Child2 {
  id: number;
  main: MockModel;
  b: number;
}

interface Child3 {
  id: number;
  main: MockModel;
  c: number;
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

const baseRelation = <Relation>{
  alias: undefined!,
  key: 'aId',
  model: 'A',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  owner: undefined!,
  type: undefined!,
};

describe('relation', () => {

  describe('appendRelation', () => {

    it('should properly append the relation to the model', () => {
      const spec = mockSpec('A');

      appendRelation(spec, { ...baseRelation, alias: 'id', type: 'RECURSIVE' });
      appendRelation(spec, { ...baseRelation, alias: 'type', type: 'RECURSIVE' });

      expect(spec.relations[0].alias).to.be.equals('id');
      expect(spec.relations[1].alias).to.be.equals('type');
    });

    it('should fail when spec is invalid', () => {
      expect(() => appendRelation(undefined!, undefined!)).to.throw();
    });

    it('should fail when no relations are provided', () => {
      expect(() => appendRelation(mockSpec('A'), undefined!)).to.throw();
    });

    it('should fail when alias is invalid', () => {
      const spec = mockSpec('A');

      expect(() =>
        appendRelation(spec, { ...baseRelation, alias: undefined!, type: 'RECURSIVE' }),
      ).to.throw();
    });

    it('should fail when key is invalid', () => {
      const spec = mockSpec('A');

      expect(() =>
        appendRelation(spec, { ...baseRelation, alias: 'id', key: undefined, type: 'RECURSIVE' }),
      ).to.throw();
    });

    it('should fail when alias is repeated', () => {
      const spec = mockSpec('A');

      expect(() =>
        appendRelation(spec, { ...baseRelation, alias: 'id', type: 'RECURSIVE' }),
      ).not.to.throw();

      expect(() =>
        appendRelation(spec, { ...baseRelation, alias: 'id', type: 'RECURSIVE' }),
      ).to.throw();
    });

    it('should fail when type is invalid', () => {
      const spec = mockSpec('A');

      expect(() =>
        appendRelation(spec, { ...baseRelation, alias: 'id', type: <any>'BLAH' }),
      ).to.throw();
    });

    it('should fail when type is many to many but through is not provided', () => {
      const spec = mockSpec('A');

      expect(() =>
        appendRelation(spec, { ...baseRelation, alias: 'id', type: 'MANY_TO_MANY' }),
      ).to.throw();
    });

    it('should fail when type is recursive but model is different', () => {
      const spec = mockSpec('A');

      expect(() =>
        appendRelation(spec, { ...baseRelation, alias: 'id', model: 'B', type: 'RECURSIVE' }),
      ).to.throw();
    });

    it('should fail when onUpdate or onDelete are invalid', () => {
      const spec = mockSpec('A');

      expect(() =>
        appendRelation(spec, {
          ...baseRelation,
          alias: 'id',
          onDelete: <any>'A',
          type: 'RECURSIVE',
        }),
      ).to.throw();

      expect(() =>
        appendRelation(spec, {
          ...baseRelation,
          alias: 'id',
          onUpdate: <any>'A',
          type: 'RECURSIVE',
        }),
      ).to.throw();
    });

  });

  describe('createRelationBuilder', () => {

    describe('inheritors builder', () => {

      it('should properly initialize an inheritors builder', () => {
        const main = mockSpec('Main');
        expect(() =>
          createRelationBuilder(main).inheritors,
        ).not.to.throw();
      });

      interface TestCase {
        (
          main: Spec<any>,
          inheritor: <T extends object>(
            name: string,
            alias: keyof T,
            i18nKey: string,
          ) => Inheritor<any, any, any, any>,
          appendInheritorGroup: <T extends object>(
            options: InheritorsOptions<any, any, any, any, any>,
          ) => void,
        ): void;
      }

      function assetEnumType(
        main: Spec<any>,
        index: number,
        typeName: string,
        typeEnumName: string,
        enumValueNames: string[],
      ) {
        const attribute = <EnumAttribute<any, string>>main.attributes[index];
        expect(attribute.mutable).to.be.true;
        expect(attribute.name).to.be.equals(typeName);
        expect(attribute.type).to.be.equals('ENUM');
        expect(attribute.typename).to.be.equals(typeEnumName);
        expect(attribute.values).to.deep.equal(enumValueNames);
      }

      const testCases: [string, TestCase][] = [
        [
          'should add the type enum to the main spec',
          (main, inheritor, append) => {
            append({
              aliasOnSubclasses: 'main',
              inheritors: [
                inheritor<Child1 & Child2 & Child3>('Child1', 'a', 'A'),
                inheritor<Child1 & Child2 & Child3>('Child2', 'b', 'A'),
                inheritor<Child1 & Child2 & Child3>('Child3', 'c', 'A'),
              ],
              sharedExistingUniqueField: 'id',
              typeIdentifierFieldName: 'type',
            });

            assetEnumType(main, 0, 'type', 'MainSubclassType', ['a', 'b', 'c']);
          },
        ],
        [
          'should correctly add the subclass/superclass relation pairs',
          (main, inheritor, append) => {
            main.owner = 'owner';

            const child1 = inheritor<Child1 & Child2 & Child3>('Child1', 'a', 'A');
            const child2 = inheritor<Child1 & Child2 & Child3>('Child2', 'b', 'A');
            const child3 = inheritor<Child1 & Child2 & Child3>('Child3', 'c', 'A');

            append({
              aliasOnSubclasses: 'main',
              inheritors: [child1, child2, child3],
              sharedExistingUniqueField: 'id',
              typeIdentifierFieldName: 'type',
            });

            expect(main.relations[0].owner).to.be.equals('owner');
            expect(main.relations[0].type).to.be.equals('SUBCLASS');
            expect(main.relations[0].model).to.be.equals('Child1');
            expect(main.relations[0].alias).to.be.equals('a');
            expect(main.relations[0].key).to.be.equals('id');

            expect(child1.target.relations[0].owner).to.be.equals('owner');
            expect(child1.target.relations[0].type).to.be.equals('SUPERCLASS');
            expect(child1.target.relations[0].model).to.be.equals('Main');
            expect(child1.target.relations[0].alias).to.be.equals('main');
            expect(child1.target.relations[0].key).to.be.equals('id');

            expect(main.relations[1].owner).to.be.equals('owner');
            expect(main.relations[1].type).to.be.equals('SUBCLASS');
            expect(main.relations[1].model).to.be.equals('Child2');
            expect(main.relations[1].alias).to.be.equals('b');
            expect(main.relations[1].key).to.be.equals('id');

            expect(child2.target.relations[0].owner).to.be.equals('owner');
            expect(child2.target.relations[0].type).to.be.equals('SUPERCLASS');
            expect(child2.target.relations[0].model).to.be.equals('Main');
            expect(child2.target.relations[0].alias).to.be.equals('main');
            expect(child2.target.relations[0].key).to.be.equals('id');

            expect(main.relations[2].owner).to.be.equals('owner');
            expect(main.relations[2].type).to.be.equals('SUBCLASS');
            expect(main.relations[2].model).to.be.equals('Child3');
            expect(main.relations[2].alias).to.be.equals('c');
            expect(main.relations[2].key).to.be.equals('id');

            expect(child3.target.relations[0].owner).to.be.equals('owner');
            expect(child3.target.relations[0].type).to.be.equals('SUPERCLASS');
            expect(child3.target.relations[0].model).to.be.equals('Main');
            expect(child3.target.relations[0].alias).to.be.equals('main');
            expect(child3.target.relations[0].key).to.be.equals('id');
          },
        ],
      ];

      testCases.forEach(([expectation, testCase]) => {
        const main = mockSpec('Main');
        const inheritor = (name: string, alias: string, i18nKey: string) => ({
          alias,
          i18nKey,
          target: mockSpec(name),
        });
        const appendInheritorGroup = createRelationBuilder(main).inheritors;

        it(expectation, () => {
          testCase(main, <any>inheritor, appendInheritorGroup);
        });
      });

    });

    describe('master builder', () => {

      it('should properly initialize a master builder', () => {
        const main = mockSpec('Main');
        expect(() =>
          createRelationBuilder(main).inheritors,
        ).not.to.throw();
      });

      it('should properly append master/detail relations and fk on source', () => {
        const master = mockSpec('Master');
        const detail = mockSpec('Detail');

        createRelationBuilder(detail).master({
          alias: 'master',
          foreignKey: 'masterId',
          ownAliasOnTarget: 'details',
          target: master,
        });

        expect(master.relations[0].alias).to.be.equals('details');
        expect(master.relations[0].type).to.be.equals('DETAIL');

        expect(detail.relations[0].alias).to.be.equals('master');
        expect(detail.relations[0].type).to.be.equals('MASTER');

        expect(detail.attributes[0].mutable).to.be.true;
        expect(detail.attributes[0].name).to.be.equals('masterId');
        expect(detail.attributes[0].type).to.be.equals('INTEGER');
      });

      it('should properly override the properties of relations and the fk attribute', () => {
        const master = mockSpec('Master');
        const detail = mockSpec('Detail');

        createRelationBuilder(detail).master({
          alias: 'master',
          foreignKey: 'someId',
          foreignKeyType: 'STRING',
          onDelete: 'RESTRICT',
          onUpdate: 'NO ACTION',
          ownAliasOnTarget: 'details',
          owner: 'owner',
          required: true,
          target: master,
          targetOwner: 'owner2',
        });

        expect(master.relations[0].owner).to.be.equals('owner2');
        expect(master.relations[0].type).to.be.equals('DETAIL');
        expect(master.relations[0].model).to.be.equals('Detail');
        expect(master.relations[0].alias).to.be.equals('details');
        expect(master.relations[0].key).to.be.equals('someId');
        expect(master.relations[0].required).to.be.equals(true);
        expect(master.relations[0].onDelete).to.be.equals('RESTRICT');
        expect(master.relations[0].onUpdate).to.be.equals('NO ACTION');

        expect(detail.relations[0].owner).to.be.equals('owner');
        expect(detail.relations[0].type).to.be.equals('MASTER');
        expect(detail.relations[0].model).to.be.equals('Master');
        expect(detail.relations[0].alias).to.be.equals('master');
        expect(detail.relations[0].key).to.be.equals('someId');
        expect(detail.relations[0].required).to.be.equals(true);
        expect(detail.relations[0].onDelete).to.be.equals('RESTRICT');
        expect(detail.relations[0].onUpdate).to.be.equals('NO ACTION');

        expect(detail.attributes[0].mutable).to.be.true;
        expect(detail.attributes[0].name).to.be.equals('someId');
        expect(detail.attributes[0].type).to.be.equals('STRING');
        expect(detail.attributes[0].required).to.be.equals(true);
      });

    });

    describe('injective builder', () => {

      it('should properly initialize a injective builder', () => {
        const main = mockSpec('Main');
        expect(() =>
          createRelationBuilder(main).inheritors,
        ).not.to.throw();
      });

      it('should properly append injective/master relations and fk on source', () => {
        const master = mockSpec('Master');
        const injected = mockSpec('Injected');

        createRelationBuilder(injected).injective({
          alias: 'master',
          foreignKey: 'masterId',
          ownAliasOnTarget: 'someId',
          target: master,
        });

        expect(master.relations[0].alias).to.be.equals('someId');
        expect(master.relations[0].type).to.be.equals('INJECTIVE');

        expect(injected.relations[0].alias).to.be.equals('master');
        expect(injected.relations[0].type).to.be.equals('MASTER');

        expect(injected.attributes[0].mutable).to.be.true;
        expect(injected.attributes[0].name).to.be.equals('masterId');
        expect(injected.attributes[0].type).to.be.equals('INTEGER');
        expect(injected.attributes[0].unique).to.be.true;
        expect(injected.attributes[0].primary).to.be.false;
      });

      it('should properly override the properties of relations and the fk attribute', () => {
        const master = mockSpec('Master');
        const injected = mockSpec('Injected');

        createRelationBuilder(injected).injective({
          alias: 'master',
          foreignKey: 'someId',
          foreignKeyType: 'STRING',
          mutable: false,
          onDelete: 'RESTRICT',
          onUpdate: 'NO ACTION',
          ownAliasOnTarget: 'details',
          owner: 'owner',
          required: true,
          target: master,
          targetOwner: 'owner2',
          unique: false,
        });

        expect(master.relations[0].owner).to.be.equals('owner2');
        expect(master.relations[0].type).to.be.equals('INJECTIVE');
        expect(master.relations[0].model).to.be.equals('Injected');
        expect(master.relations[0].alias).to.be.equals('details');
        expect(master.relations[0].key).to.be.equals('someId');
        expect(master.relations[0].required).to.be.true;
        expect(master.relations[0].onDelete).to.be.equals('RESTRICT');
        expect(master.relations[0].onUpdate).to.be.equals('NO ACTION');

        expect(injected.relations[0].owner).to.be.equals('owner');
        expect(injected.relations[0].type).to.be.equals('MASTER');
        expect(injected.relations[0].model).to.be.equals('Master');
        expect(injected.relations[0].alias).to.be.equals('master');
        expect(injected.relations[0].key).to.be.equals('someId');
        expect(injected.relations[0].required).to.be.true;
        expect(injected.relations[0].onDelete).to.be.equals('RESTRICT');
        expect(injected.relations[0].onUpdate).to.be.equals('NO ACTION');

        expect(injected.attributes[0].mutable).to.be.false;
        expect(injected.attributes[0].name).to.be.equals('someId');
        expect(injected.attributes[0].type).to.be.equals('STRING');
        expect(injected.attributes[0].required).to.be.true;
        expect(injected.attributes[0].unique).to.be.false;
      });

      it('should properly override the fk attribute for primary case', () => {
        const master = mockSpec('Master');
        const injected = mockSpec('Injected');

        createRelationBuilder(injected).injective({
          alias: 'master',
          foreignKey: 'someId',
          onDelete: 'RESTRICT',
          onUpdate: 'NO ACTION',
          ownAliasOnTarget: 'details',
          owner: 'owner',
          primary: true,
          target: master,
          targetOwner: 'owner2',
        });

        expect(injected.attributes[0].mutable).to.be.false;
        expect(injected.attributes[0].required).to.be.false;
        expect(injected.attributes[0].unique).to.be.false;
      });

    });

    describe('recursive builder', () => {

      it('should properly initialize a recursive builder', () => {
        const main = mockSpec('Main');
        expect(() =>
          createRelationBuilder(main).recursive,
        ).not.to.throw();
      });

      it('should properly append the recursive relation and its key', () => {
        const master = mockSpec('Master');

        createRelationBuilder(master).recursive({
          alias: 'parent',
          key: 'id',
        });

        expect(master.relations[0].alias).to.be.equals('parent');
        expect(master.relations[0].type).to.be.equals('RECURSIVE');

        expect(master.attributes[0].mutable).to.be.true;
        expect(master.attributes[0].name).to.be.equals('id');
        expect(master.attributes[0].type).to.be.equals('INTEGER');
      });

      it('should properly override the properties of the relation and the key', () => {
        const master = mockSpec('Master');

        master.owner = 'owner';

        createRelationBuilder(master).recursive({
          alias: 'parent',
          key: 'someId',
          keyType: 'STRING',
          onDelete: 'RESTRICT',
          onUpdate: 'NO ACTION',
        });

        expect(master.relations[0].owner).to.be.equals('owner');
        expect(master.relations[0].type).to.be.equals('RECURSIVE');
        expect(master.relations[0].model).to.be.equals('Master');
        expect(master.relations[0].alias).to.be.equals('parent');
        expect(master.relations[0].key).to.be.equals('someId');
        expect(master.relations[0].required).to.be.equals(false);
        expect(master.relations[0].onDelete).to.be.equals('RESTRICT');
        expect(master.relations[0].onUpdate).to.be.equals('NO ACTION');

        expect(master.attributes[0].name).to.be.equals('someId');
        expect(master.attributes[0].type).to.be.equals('STRING');
        expect(master.attributes[0].required).to.be.equals(false);
      });

    });

  });

});
