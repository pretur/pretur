/// <reference types="mocha" />

import { expect } from 'chai';
import { Spec, Model } from './spec';
import { createJoinSpec, joineeValidateAndSetDefault } from './joinSpec';

type MockModel = Model<{
  fields: {
    a: number;
    aId: number;
    b: string;
    bId: number;
    c: number;
    d: number;
    e: number;
    f: number;
    g: number;
    count: number;
  };
  records: {
    a: MockModel;
    b: MockModel;
  };
  sets: {
    all_a: MockModel;
    all_b: MockModel;
  };
}>;

function mockSpec(name: string): Spec<MockModel> {
  return {
    name,
    attributes: [],
    indexes: { unique: [] },
    initialize: () => undefined!,
    join: false,
    owner: undefined!,
    relations: [],
  };
}

describe('joinSpec', () => {

  describe('joineeValidateAndSetDefault', () => {

    it('should fail if provided invalid input', () => {
      const spec = mockSpec('A');

      expect(() => joineeValidateAndSetDefault<any, any, any, any, any, any>({
        aliasOnJoin: 'a',
        aliasOnTarget: 'all_a',
        key: 'aId',
        spec: undefined!,
      })).to.throw();
      expect(() => joineeValidateAndSetDefault<any, any, any, any, any, any>({
        spec,
        aliasOnJoin: undefined!,
        aliasOnTarget: 'all_a',
        key: 'aId',
      })).to.throw();
      expect(() => joineeValidateAndSetDefault<any, any, any, any, any, any>({
        spec,
        aliasOnJoin: 'a',
        aliasOnTarget: undefined!,
        key: 'aId',
      })).to.throw();
    });

    it('should return a joinee with valid defaults', () => {
      const spec = mockSpec('A');
      const joinee = joineeValidateAndSetDefault<any, any, any, any, any, any>({
        spec,
        aliasOnJoin: 'a',
        aliasOnTarget: 'all_a',
        key: 'aId',
      });

      expect(joinee.aliasOnJoin).to.be.equals('a');
      expect(joinee.aliasOnTarget).to.be.equals('all_a');
      expect(joinee.key).to.be.equals('aId');
      expect(joinee.spec).to.be.equals(spec);
      expect(joinee.onDelete).to.be.equals('CASCADE');
      expect(joinee.onUpdate).to.be.equals('CASCADE');
      expect(joinee.type).to.be.equals('INTEGER');
      expect(joinee.primary).to.be.true;
    });

    it('should return a joinee with overriden defaults', () => {
      const spec = mockSpec('A');
      const joinee = joineeValidateAndSetDefault<any, any, any, any, any, any>({
        spec,
        aliasOnJoin: 'a',
        aliasOnTarget: 'all_a',
        key: 'someId',
        onDelete: 'SET NULL',
        onUpdate: 'NO ACTION',
        primary: false,
        type: 'STRING',
      });

      expect(joinee.aliasOnJoin).to.be.equals('a');
      expect(joinee.aliasOnTarget).to.be.equals('all_a');
      expect(joinee.key).to.be.equals('someId');
      expect(joinee.spec).to.be.equals(spec);
      expect(joinee.onDelete).to.be.equals('SET NULL');
      expect(joinee.onUpdate).to.be.equals('NO ACTION');
      expect(joinee.type).to.be.equals('STRING');
      expect(joinee.primary).to.be.false;
    });

  });

  describe('createJoinSpec', () => {

    it('should properly build an spec object', () => {
      const specA = mockSpec('A');
      const specB = mockSpec('B');

      const joinSpec = createJoinSpec<MockModel, MockModel, MockModel>({
        firstJoinee: {
          aliasOnJoin: 'a',
          aliasOnTarget: 'all_a',
          key: 'aId',
          spec: specA,
        },
        name: 'a',
        owner: ['b', 'c'],
        secondJoinee: {
          aliasOnJoin: 'b',
          aliasOnTarget: 'all_b',
          key: 'bId',
          spec: specB,
        },
      });

      expect(joinSpec.join).to.be.true;
      expect(joinSpec.owner).to.deep.equal(['b', 'c']);
      expect(joinSpec.name).to.be.equals('a');
      expect(joinSpec.initialize).to.be.a('function');
    });

    it('should properly append relations and attributes to the join spec', () => {
      const specA = mockSpec('A');
      const specB = mockSpec('B');

      const joinSpec = createJoinSpec<MockModel, MockModel, MockModel>({
        firstJoinee: {
          aliasOnJoin: 'a',
          aliasOnTarget: 'all_a',
          key: 'aId',
          primary: true,
          spec: specA,
        },
        name: 'a',
        owner: ['b', 'c'],
        secondJoinee: {
          aliasOnJoin: 'b',
          aliasOnTarget: 'all_b',
          key: 'bId',
          primary: false,
          spec: specB,
        },
      });

      expect(joinSpec.attributes[0].name).to.be.equals('aId');
      expect(joinSpec.attributes[0].type).to.be.equals('INTEGER');
      expect(joinSpec.attributes[0].primary).to.be.true;
      expect(joinSpec.attributes[0].mutable).to.be.false;

      expect(joinSpec.attributes[1].name).to.be.equals('bId');
      expect(joinSpec.attributes[1].type).to.be.equals('INTEGER');
      expect(joinSpec.attributes[1].primary).to.be.false;
      expect(joinSpec.attributes[1].mutable).to.be.false;

      expect(joinSpec.relations[0].type).to.be.equals('MASTER');
      expect(joinSpec.relations[0].owner).to.deep.equal(['b', 'c']);
      expect(joinSpec.relations[0].alias).to.be.equals('a');
      expect(joinSpec.relations[0].key).to.be.equals('aId');
      expect(joinSpec.relations[0].model).to.be.equals('A');
      expect(joinSpec.relations[0].onDelete).to.be.equals('CASCADE');
      expect(joinSpec.relations[0].onUpdate).to.be.equals('CASCADE');
      expect(joinSpec.relations[0].required).to.be.true;

      expect(joinSpec.relations[1].type).to.be.equals('MASTER');
      expect(joinSpec.relations[1].owner).to.deep.equal(['b', 'c']);
      expect(joinSpec.relations[1].alias).to.be.equals('b');
      expect(joinSpec.relations[1].key).to.be.equals('bId');
      expect(joinSpec.relations[1].model).to.be.equals('B');
      expect(joinSpec.relations[1].onDelete).to.be.equals('CASCADE');
      expect(joinSpec.relations[1].onUpdate).to.be.equals('CASCADE');
      expect(joinSpec.relations[1].required).to.be.true;
    });

    it('should properly append relations to the joined specs', () => {
      const specA = mockSpec('A');
      const specB = mockSpec('B');

      createJoinSpec<MockModel, MockModel, MockModel>({
        firstJoinee: {
          aliasOnJoin: 'a',
          aliasOnTarget: 'all_a',
          key: 'aId',
          spec: specA,
        },
        name: 'J',
        owner: ['b', 'c'],
        secondJoinee: {
          aliasOnJoin: 'b',
          aliasOnTarget: 'all_b',
          key: 'bId',
          spec: specB,
        },
      });

      expect(specA.relations[0].type).to.be.equals('MANY_TO_MANY');
      expect(specA.relations[0].owner).to.deep.equal(['b', 'c']);
      expect(specA.relations[0].alias).to.be.equals('all_b');
      expect(specA.relations[0].key).to.be.equals('aId');
      expect(specA.relations[0].model).to.be.equals('B');
      expect(specA.relations[0].through).to.be.equals('J');
      expect(specA.relations[0].onDelete).to.be.equals('CASCADE');
      expect(specA.relations[0].onUpdate).to.be.equals('CASCADE');
      expect(specA.relations[0].required).to.be.true;

      expect(specB.relations[0].type).to.be.equals('MANY_TO_MANY');
      expect(specB.relations[0].owner).to.deep.equal(['b', 'c']);
      expect(specB.relations[0].alias).to.be.equals('all_a');
      expect(specB.relations[0].key).to.be.equals('bId');
      expect(specB.relations[0].model).to.be.equals('A');
      expect(specB.relations[0].through).to.be.equals('J');
      expect(specB.relations[0].onDelete).to.be.equals('CASCADE');
      expect(specB.relations[0].onUpdate).to.be.equals('CASCADE');
      expect(specB.relations[0].required).to.be.true;
    });

    it('should properly add other attributes to the join spec', () => {
      const specA = mockSpec('A');
      const specB = mockSpec('B');

      const joinSpec = createJoinSpec<MockModel, MockModel, MockModel>(
        {
          firstJoinee: {
            aliasOnJoin: 'a',
            aliasOnTarget: 'all_a',
            key: 'aId',
            spec: specA,
          },
          name: 'a',
          owner: ['b', 'c'],
          secondJoinee: {
            aliasOnJoin: 'b',
            aliasOnTarget: 'all_b',
            key: 'bId',
            spec: specB,
          },
        },
        ({ attribute }) => {

          attribute({
            name: 'count',
            type: 'INTEGER',
          });

        },
      );

      joinSpec.initialize();

      expect(joinSpec.attributes[2].name).to.be.equals('count');
    });

    it('should properly call the builder with valid multicolumnUniqueIndex builder', () => {
      const specA = mockSpec('A');
      const specB = mockSpec('B');
      const spec = createJoinSpec<MockModel, MockModel, MockModel>(
        {
          firstJoinee: {
            aliasOnJoin: 'a',
            aliasOnTarget: 'all_a',
            key: 'aId',
            spec: specA,
          },
          name: 'a',
          owner: undefined!,
          secondJoinee: {
            aliasOnJoin: 'b',
            aliasOnTarget: 'all_b',
            key: 'bId',
            spec: specB,
          },
        },
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
