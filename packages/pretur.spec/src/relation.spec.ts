/// <reference types="mocha" />

import { expect } from 'chai';
import { noop } from 'lodash';
import { Spec, SpecType } from './spec';
import { EnumAttribute } from './attribute';
import {
  Relation,
  appendRelation,
  InheritorsOptions,
  Inheritor,
  createRelationBuilder,
} from './relation';

interface MockType {
  name: string;
  fields: {
    id: number;
    type: string;
    masterId: number;
    someId: number;
  };
  records: {
    main: MockType;
    master: MockType;
    some: MockType;
    parent: MockType;
  };
  sets: {
    details: MockType;
  };
}

interface Child1 {
  name: 'Child1';
  fields: {
    id: number;
    a: number;
  };
  records: {
    main: MockType;
  };
  sets: {};
}

interface Child2 {
  name: 'Child2';
  fields: {
    id: number;
    b: number;
  };
  records: {
    main: MockType;
  };
  sets: {};
}

interface Child3 {
  name: 'Child3';
  fields: {
    id: number;
    c: number;
  };
  records: {
    main: MockType;
  };
  sets: {};
}

function mockSpec(name: string): Spec<MockType> {
  return <Spec<MockType>>{
    attributes: [],
    indexes: { unique: [] },
    initialize: noop,
    join: false,
    model: undefined!,
    name,
    relations: [],
    scope: undefined!,
    type: undefined!,
  };
}

const baseRelation = <Relation<MockType>>{
  alias: undefined!,
  key: 'aId',
  model: 'A',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  scope: undefined!,
  type: undefined!,
};

describe('relation', () => {

  describe('appendRelation', () => {

    it('should properly append the relation to the model', () => {
      const spec = mockSpec('A');

      appendRelation(spec, { ...baseRelation, alias: 'main', type: 'RECURSIVE' });
      appendRelation(spec, { ...baseRelation, alias: 'master', type: 'RECURSIVE' });

      expect(spec.relations[0].alias).to.be.equals('main');
      expect(spec.relations[1].alias).to.be.equals('master');
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
        appendRelation(spec, { ...baseRelation, alias: <any>undefined, type: 'RECURSIVE' }),
      ).to.throw();
    });

    it('should fail when key is invalid', () => {
      const spec = mockSpec('A');

      expect(() =>
        appendRelation(
          spec,
          { ...baseRelation, alias: 'some', key: <any>undefined, type: 'RECURSIVE' },
        ),
      ).to.throw();
    });

    it('should fail when alias is repeated', () => {
      const spec = mockSpec('A');

      expect(() =>
        appendRelation(spec, { ...baseRelation, alias: 'some', type: 'RECURSIVE' }),
      ).not.to.throw();

      expect(() =>
        appendRelation(spec, { ...baseRelation, alias: 'some', type: 'RECURSIVE' }),
      ).to.throw();
    });

    it('should fail when type is invalid', () => {
      const spec = mockSpec('A');

      expect(() =>
        appendRelation(spec, { ...baseRelation, alias: 'some', type: <any>'BLAH' }),
      ).to.throw();
    });

    it('should fail when type is many to many but through is not provided', () => {
      const spec = mockSpec('A');

      expect(() =>
        appendRelation(spec, { ...baseRelation, alias: 'some', type: 'MANY_TO_MANY' }),
      ).to.throw();
    });

    it('should fail when type is recursive but model is different', () => {
      const spec = mockSpec('A');

      expect(() =>
        appendRelation(spec, { ...baseRelation, alias: 'some', model: 'B', type: 'RECURSIVE' }),
      ).to.throw();
    });

    it('should fail when onUpdate or onDelete are invalid', () => {
      const spec = mockSpec('A');

      expect(() =>
        appendRelation(spec, {
          ...baseRelation,
          alias: 'some',
          onDelete: <any>'A',
          type: 'RECURSIVE',
        }),
      ).to.throw();

      expect(() =>
        appendRelation(spec, {
          ...baseRelation,
          alias: 'some',
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
          inheritor: <T extends SpecType>(
            name: T['name'],
            alias: string,
            i18nKey: string,
          ) => Inheritor<MockType, MockType>,
          appendInheritorGroup: (options: InheritorsOptions<MockType, MockType>) => void,
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
                inheritor<Child1 | Child2 | Child3>('Child1', 'a', 'A'),
                inheritor<Child1 | Child2 | Child3>('Child2', 'b', 'A'),
                inheritor<Child1 | Child2 | Child3>('Child3', 'c', 'A'),
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
            main.scope = 'scope';

            const child1 = inheritor<Child1 | Child2 | Child3>('Child1', 'a', 'A');
            const child2 = inheritor<Child1 | Child2 | Child3>('Child2', 'b', 'A');
            const child3 = inheritor<Child1 | Child2 | Child3>('Child3', 'c', 'A');

            append({
              aliasOnSubclasses: 'main',
              inheritors: [child1, child2, child3],
              sharedExistingUniqueField: 'id',
              typeIdentifierFieldName: 'type',
            });

            expect(main.relations[0].scope).to.be.equals('scope');
            expect(main.relations[0].type).to.be.equals('SUBCLASS');
            expect(main.relations[0].model).to.be.equals('Child1');
            expect(main.relations[0].alias).to.be.equals('a');
            expect(main.relations[0].key).to.be.equals('id');

            expect(child1.target.relations[0].scope).to.be.equals('scope');
            expect(child1.target.relations[0].type).to.be.equals('SUPERCLASS');
            expect(child1.target.relations[0].model).to.be.equals('Main');
            expect(child1.target.relations[0].alias).to.be.equals('main');
            expect(child1.target.relations[0].key).to.be.equals('id');

            expect(main.relations[1].scope).to.be.equals('scope');
            expect(main.relations[1].type).to.be.equals('SUBCLASS');
            expect(main.relations[1].model).to.be.equals('Child2');
            expect(main.relations[1].alias).to.be.equals('b');
            expect(main.relations[1].key).to.be.equals('id');

            expect(child2.target.relations[0].scope).to.be.equals('scope');
            expect(child2.target.relations[0].type).to.be.equals('SUPERCLASS');
            expect(child2.target.relations[0].model).to.be.equals('Main');
            expect(child2.target.relations[0].alias).to.be.equals('main');
            expect(child2.target.relations[0].key).to.be.equals('id');

            expect(main.relations[2].scope).to.be.equals('scope');
            expect(main.relations[2].type).to.be.equals('SUBCLASS');
            expect(main.relations[2].model).to.be.equals('Child3');
            expect(main.relations[2].alias).to.be.equals('c');
            expect(main.relations[2].key).to.be.equals('id');

            expect(child3.target.relations[0].scope).to.be.equals('scope');
            expect(child3.target.relations[0].type).to.be.equals('SUPERCLASS');
            expect(child3.target.relations[0].model).to.be.equals('Main');
            expect(child3.target.relations[0].alias).to.be.equals('main');
            expect(child3.target.relations[0].key).to.be.equals('id');
          },
        ],
      ];

      for (const [expectation, testCase] of testCases) {
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
      }

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
          required: true,
          scope: 'scope',
          target: master,
          targetScope: 'scope2',
        });

        expect(master.relations[0].scope).to.be.equals('scope2');
        expect(master.relations[0].type).to.be.equals('DETAIL');
        expect(master.relations[0].model).to.be.equals('Detail');
        expect(master.relations[0].alias).to.be.equals('details');
        expect(master.relations[0].key).to.be.equals('someId');
        expect(master.relations[0].required).to.be.equals(true);
        expect(master.relations[0].onDelete).to.be.equals('RESTRICT');
        expect(master.relations[0].onUpdate).to.be.equals('NO ACTION');

        expect(detail.relations[0].scope).to.be.equals('scope');
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
          ownAliasOnTarget: 'some',
          target: master,
        });

        expect(master.relations[0].alias).to.be.equals('some');
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
          ownAliasOnTarget: 'some',
          required: true,
          scope: 'scope',
          target: master,
          targetScope: 'scope2',
          unique: false,
        });

        expect(master.relations[0].scope).to.be.equals('scope2');
        expect(master.relations[0].type).to.be.equals('INJECTIVE');
        expect(master.relations[0].model).to.be.equals('Injected');
        expect(master.relations[0].alias).to.be.equals('some');
        expect(master.relations[0].key).to.be.equals('someId');
        expect(master.relations[0].required).to.be.true;
        expect(master.relations[0].onDelete).to.be.equals('RESTRICT');
        expect(master.relations[0].onUpdate).to.be.equals('NO ACTION');

        expect(injected.relations[0].scope).to.be.equals('scope');
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
          ownAliasOnTarget: 'some',
          primary: true,
          scope: 'scope',
          target: master,
          targetScope: 'scope2',
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

        master.scope = 'scope';

        createRelationBuilder(master).recursive({
          alias: 'parent',
          key: 'someId',
          keyType: 'STRING',
          onDelete: 'RESTRICT',
          onUpdate: 'NO ACTION',
        });

        expect(master.relations[0].scope).to.be.equals('scope');
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
