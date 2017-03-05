/// <reference types="mocha" />

import { expect } from 'chai';
import { Model, UninitializedStateModel } from './model';
import { EnumType, IntegerType, DataTypes, StringType } from './attribute';
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

function mockUninitializedStateModel(model: Model<any>): UninitializedStateModel<any> {
  return {
    model,
    initialize: () => undefined!,
    join: model.join,
    name: model.name,
    owner: model.owner,
    virtual: model.virtual,
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
      const model = mockModel('A');

      appendRelation(model, baseRelation, <any>{ alias: 'a', type: 'RECURSIVE' });
      appendRelation(model, baseRelation, <any>{ alias: 'b', type: 'RECURSIVE' });

      expect(model.relations[0].alias).to.be.equals('a');
      expect(model.relations[1].alias).to.be.equals('b');
    });

    it('should fail when model is invalid', () => {
      expect(() => appendRelation(undefined!)).to.throw();
    });

    it('should fail when no relations are provided', () => {
      expect(() => appendRelation(mockModel('A'))).to.throw();
    });

    it('should fail when alias is invalid', () => {
      const model = mockModel('A');

      expect(() =>
        appendRelation(model, baseRelation, <any>{ alias: undefined, type: 'RECURSIVE' }),
      ).to.throw();
    });

    it('should fail when key is invalid', () => {
      const model = mockModel('A');

      expect(() =>
        appendRelation(model, baseRelation, <any>{ alias: 'a', key: undefined, type: 'RECURSIVE' }),
      ).to.throw();
    });

    it('should fail when alias is repeated', () => {
      const model = mockModel('A');

      expect(() =>
        appendRelation(model, baseRelation, <any>{ alias: 'a', type: 'RECURSIVE' }),
      ).not.to.throw();

      expect(() =>
        appendRelation(model, baseRelation, <any>{ alias: 'a', type: 'RECURSIVE' }),
      ).to.throw();
    });

    it('should fail when type is invalid', () => {
      const model = mockModel('A');

      expect(() =>
        appendRelation(model, baseRelation, <any>{ alias: 'a', type: 'BLAH' }),
      ).to.throw();
    });

    it('should fail when type is many to many but through is not provided', () => {
      const model = mockModel('A');

      expect(() =>
        appendRelation(model, baseRelation, <any>{ alias: 'a', type: 'MANY_TO_MANY' }),
      ).to.throw();
    });

    it('should fail when type is recursive but model is different', () => {
      const model = mockModel('A');

      expect(() =>
        appendRelation(model, baseRelation, <any>{ alias: 'a', model: 'B', type: 'RECURSIVE' }),
      ).to.throw();
    });

    it('should fail when onUpdate or onDelete are invalid', () => {
      const model = mockModel('A');

      expect(() =>
        appendRelation(model, baseRelation, <any>{ alias: 'a', onDelete: 'A', type: 'RECURSIVE' }),
      ).to.throw();

      expect(() =>
        appendRelation(model, baseRelation, <any>{ alias: 'a', onUpdate: 'A', type: 'RECURSIVE' }),
      ).to.throw();
    });

  });

  describe('createRelationBuilder', () => {

    describe('inheritors builder', () => {

      it('should properly initialize an inheritors builder', () => {
        const main = mockModel('Main');
        expect(() =>
          createRelationBuilder(main).inheritors,
        ).not.to.throw();
      });

      interface TestCase {
        (
          main: Model<any>,
          inheritor: <T>(name: string, alias: keyof T, i18nKey: string) => Inheritor<MockModel, T>,
          appendInheritorGroup: <T>(options: InheritorsOptions<MockModel, T>) => void
        ): void;
      }

      function assetEnumType(
        main: Model<any>,
        index: number,
        typeName: string,
        typeEnumName: string,
        enumValueNames: string[],
      ) {
        expect(main.attributes[index].mutable).to.be.true;
        expect(main.attributes[index].name).to.be.equals(typeName);
        expect(main.attributes[index].type).to.be.instanceof(EnumType);
        expect((<EnumType<string>>main.attributes[index].type).name)
          .to.be.equals(typeEnumName);
        expect((<EnumType<string>>main.attributes[index].type).values.map(v => v.name))
          .to.deep.equal(enumValueNames);
      }

      const testCases: [string, TestCase][] = [
        [
          'should add the type enum to the main model',
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
            main.virtual = true;

            const child1 = inheritor<Child1 & Child2 & Child3>('Child1', 'a', 'A');
            const child2 = inheritor<Child1 & Child2 & Child3>('Child2', 'b', 'A');
            const child3 = inheritor<Child1 & Child2 & Child3>('Child3', 'c', 'A');

            child3.target.virtual = true;
            child3.target.model.virtual = true;

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
            expect(main.relations[0].virtual).to.be.false;

            expect(child1.target.model.relations[0].owner).to.be.equals('owner');
            expect(child1.target.model.relations[0].type).to.be.equals('SUPERCLASS');
            expect(child1.target.model.relations[0].model).to.be.equals('Main');
            expect(child1.target.model.relations[0].alias).to.be.equals('main');
            expect(child1.target.model.relations[0].key).to.be.equals('id');
            expect(child1.target.model.relations[0].virtual).to.be.true;

            expect(main.relations[1].owner).to.be.equals('owner');
            expect(main.relations[1].type).to.be.equals('SUBCLASS');
            expect(main.relations[1].model).to.be.equals('Child2');
            expect(main.relations[1].alias).to.be.equals('b');
            expect(main.relations[1].key).to.be.equals('id');
            expect(main.relations[1].virtual).to.be.false;

            expect(child2.target.model.relations[0].owner).to.be.equals('owner');
            expect(child2.target.model.relations[0].type).to.be.equals('SUPERCLASS');
            expect(child2.target.model.relations[0].model).to.be.equals('Main');
            expect(child2.target.model.relations[0].alias).to.be.equals('main');
            expect(child2.target.model.relations[0].key).to.be.equals('id');
            expect(child2.target.model.relations[0].virtual).to.be.true;

            expect(main.relations[2].owner).to.be.equals('owner');
            expect(main.relations[2].type).to.be.equals('SUBCLASS');
            expect(main.relations[2].model).to.be.equals('Child3');
            expect(main.relations[2].alias).to.be.equals('c');
            expect(main.relations[2].key).to.be.equals('id');
            expect(main.relations[2].virtual).to.be.true;

            expect(child3.target.model.relations[0].owner).to.be.equals('owner');
            expect(child3.target.model.relations[0].type).to.be.equals('SUPERCLASS');
            expect(child3.target.model.relations[0].model).to.be.equals('Main');
            expect(child3.target.model.relations[0].alias).to.be.equals('main');
            expect(child3.target.model.relations[0].key).to.be.equals('id');
            expect(child3.target.model.relations[0].virtual).to.be.true;
          },
        ],
      ];

      testCases.forEach(([expectation, testCase]) => {
        const main = mockModel('Main');
        const inheritor = (name: string, alias: string, i18nKey: string) => ({
          alias,
          i18nKey,
          target: mockUninitializedStateModel(mockModel(name)),
        });
        const appendInheritorGroup = createRelationBuilder(main).inheritors;

        it(expectation, () => {
          testCase(main, <any>inheritor, appendInheritorGroup);
        });
      });

    });

    describe('master builder', () => {

      it('should properly initialize a master builder', () => {
        const main = mockModel('Main');
        expect(() =>
          createRelationBuilder(main).inheritors,
        ).not.to.throw();
      });

      it('should properly append master/detail relations and fk on source', () => {
        const master = mockModel('Master');
        const detail = mockModel('Detail');

        createRelationBuilder(detail).master({
          alias: 'master',
          foreignKey: 'masterId',
          ownAliasOnTarget: 'details',
          target: mockUninitializedStateModel(master),
        });

        expect(master.relations[0].alias).to.be.equals('details');
        expect(master.relations[0].type).to.be.equals('DETAIL');

        expect(detail.relations[0].alias).to.be.equals('master');
        expect(detail.relations[0].type).to.be.equals('MASTER');

        expect(detail.attributes[0].mutable).to.be.true;
        expect(detail.attributes[0].name).to.be.equals('masterId');
        expect(detail.attributes[0].type).to.be.instanceof(IntegerType);
      });

      it('should properly override the properties of relations and the fk attribute', () => {
        const master = mockModel('Master');
        const detail = mockModel('Detail');

        detail.virtual = true;

        createRelationBuilder(detail).master({
          alias: 'master',
          foreignKey: 'someId',
          foreignKeyType: DataTypes.STRING(),
          onDelete: 'RESTRICT',
          onUpdate: 'NO ACTION',
          ownAliasOnTarget: 'details',
          owner: 'owner',
          required: true,
          target: mockUninitializedStateModel(master),
          targetOwner: 'owner2',
        });

        expect(master.relations[0].owner).to.be.equals('owner2');
        expect(master.relations[0].type).to.be.equals('DETAIL');
        expect(master.relations[0].model).to.be.equals('Detail');
        expect(master.relations[0].alias).to.be.equals('details');
        expect(master.relations[0].key).to.be.equals('someId');
        expect(master.relations[0].required).to.be.equals(true);
        expect(master.relations[0].virtual).to.be.equals(true);
        expect(master.relations[0].onDelete).to.be.equals('RESTRICT');
        expect(master.relations[0].onUpdate).to.be.equals('NO ACTION');

        expect(detail.relations[0].owner).to.be.equals('owner');
        expect(detail.relations[0].type).to.be.equals('MASTER');
        expect(detail.relations[0].model).to.be.equals('Master');
        expect(detail.relations[0].alias).to.be.equals('master');
        expect(detail.relations[0].key).to.be.equals('someId');
        expect(detail.relations[0].required).to.be.equals(true);
        expect(detail.relations[0].virtual).to.be.equals(false);
        expect(detail.relations[0].onDelete).to.be.equals('RESTRICT');
        expect(detail.relations[0].onUpdate).to.be.equals('NO ACTION');

        expect(detail.attributes[0].mutable).to.be.true;
        expect(detail.attributes[0].name).to.be.equals('someId');
        expect(detail.attributes[0].type).to.be.instanceof(StringType);
        expect(detail.attributes[0].required).to.be.equals(true);
      });

    });

    describe('injective builder', () => {

      it('should properly initialize a injective builder', () => {
        const main = mockModel('Main');
        expect(() =>
          createRelationBuilder(main).inheritors,
        ).not.to.throw();
      });

      it('should properly append injective/master relations and fk on source', () => {
        const master = mockModel('Master');
        const injected = mockModel('Injected');

        createRelationBuilder(injected).injective({
          alias: 'master',
          foreignKey: 'masterId',
          ownAliasOnTarget: 'injected',
          target: mockUninitializedStateModel(master),
        });

        expect(master.relations[0].alias).to.be.equals('injected');
        expect(master.relations[0].type).to.be.equals('INJECTIVE');

        expect(injected.relations[0].alias).to.be.equals('master');
        expect(injected.relations[0].type).to.be.equals('MASTER');

        expect(injected.attributes[0].mutable).to.be.false;
        expect(injected.attributes[0].name).to.be.equals('masterId');
        expect(injected.attributes[0].type).to.be.instanceof(IntegerType);
        expect(injected.attributes[0].unique).to.be.equals(true);
        expect(injected.attributes[0].primary).to.be.equals(false);
      });

      it('should properly override the properties of relations and the fk attribute', () => {
        const master = mockModel('Master');
        const injected = mockModel('Injected');

        injected.virtual = true;

        createRelationBuilder(injected).injective({
          alias: 'master',
          foreignKey: 'someId',
          foreignKeyType: DataTypes.STRING(),
          onDelete: 'RESTRICT',
          onUpdate: 'NO ACTION',
          ownAliasOnTarget: 'injected',
          owner: 'owner',
          required: true,
          target: mockUninitializedStateModel(master),
          targetOwner: 'owner2',
          unique: false,
        });

        expect(master.relations[0].owner).to.be.equals('owner2');
        expect(master.relations[0].type).to.be.equals('INJECTIVE');
        expect(master.relations[0].model).to.be.equals('Injected');
        expect(master.relations[0].alias).to.be.equals('injected');
        expect(master.relations[0].key).to.be.equals('someId');
        expect(master.relations[0].required).to.be.equals(true);
        expect(master.relations[0].virtual).to.be.equals(true);
        expect(master.relations[0].onDelete).to.be.equals('RESTRICT');
        expect(master.relations[0].onUpdate).to.be.equals('NO ACTION');

        expect(injected.relations[0].owner).to.be.equals('owner');
        expect(injected.relations[0].type).to.be.equals('MASTER');
        expect(injected.relations[0].model).to.be.equals('Master');
        expect(injected.relations[0].alias).to.be.equals('master');
        expect(injected.relations[0].key).to.be.equals('someId');
        expect(injected.relations[0].required).to.be.equals(true);
        expect(injected.relations[0].virtual).to.be.equals(false);
        expect(injected.relations[0].onDelete).to.be.equals('RESTRICT');
        expect(injected.relations[0].onUpdate).to.be.equals('NO ACTION');

        expect(injected.attributes[0].mutable).to.be.false;
        expect(injected.attributes[0].name).to.be.equals('someId');
        expect(injected.attributes[0].type).to.be.instanceof(StringType);
        expect(injected.attributes[0].required).to.be.equals(true);
        expect(injected.attributes[0].unique).to.be.equals(false);
      });

    });

    describe('recursive builder', () => {

      it('should properly initialize a recursive builder', () => {
        const main = mockModel('Main');
        expect(() =>
          createRelationBuilder(main).recursive,
        ).not.to.throw();
      });

      it('should properly append the recursive relation and its key', () => {
        const master = mockModel('Master');

        createRelationBuilder(master).recursive({
          alias: 'parent',
          key: 'id',
        });

        expect(master.relations[0].alias).to.be.equals('parent');
        expect(master.relations[0].type).to.be.equals('RECURSIVE');

        expect(master.attributes[0].mutable).to.be.true;
        expect(master.attributes[0].name).to.be.equals('id');
        expect(master.attributes[0].type).to.be.instanceof(IntegerType);
      });

      it('should properly override the properties of the relation and the key', () => {
        const master = mockModel('Master');

        master.owner = 'owner';
        master.virtual = true;

        createRelationBuilder(master).recursive({
          alias: 'parent',
          key: 'someId',
          keyType: DataTypes.STRING(),
          onDelete: 'RESTRICT',
          onUpdate: 'NO ACTION',
        });

        expect(master.relations[0].owner).to.be.equals('owner');
        expect(master.relations[0].type).to.be.equals('RECURSIVE');
        expect(master.relations[0].model).to.be.equals('Master');
        expect(master.relations[0].alias).to.be.equals('parent');
        expect(master.relations[0].key).to.be.equals('someId');
        expect(master.relations[0].required).to.be.equals(false);
        expect(master.relations[0].virtual).to.be.equals(true);
        expect(master.relations[0].onDelete).to.be.equals('RESTRICT');
        expect(master.relations[0].onUpdate).to.be.equals('NO ACTION');

        expect(master.attributes[0].name).to.be.equals('someId');
        expect(master.attributes[0].type).to.be.instanceof(StringType);
        expect(master.attributes[0].required).to.be.equals(false);
      });

    });

  });

});
