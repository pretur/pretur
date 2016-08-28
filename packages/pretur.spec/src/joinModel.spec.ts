/// <reference types="mocha" />

import { expect } from 'chai';
import { IntegerType, StringType, DataTypes } from './attribute';
import { Model, UninitializedStateModel } from './model';
import { createJoinModel, joinee } from './joinModel';

function mockModel(name: string): Model<any> {
  return {
    name,
    attributes: [],
    indexes: { unique: [] },
    join: false,
    owner: null!,
    relations: [],
    virtual: false,
  };
}

function mockUninitializedStateModel(model: Model<any>): UninitializedStateModel<any> {
  return {
    model,
    initialize: () => null!,
    join: model.join,
    name: model.name,
    owner: model.owner,
    virtual: model.virtual!,
  };
}

describe('joinModel', () => {

  describe('joinee', () => {

    it('should fail if provided invalid input', () => {
      const model = mockUninitializedStateModel(mockModel('A'));

      expect(() => joinee(null!, 'a', 'all_a')).to.throw();
      expect(() => joinee(model, null!, 'all_a')).to.throw();
      expect(() => joinee(model, 'a', null!)).to.throw();
    });

    it('should return a joinee with valid defaults', () => {
      const model = mockUninitializedStateModel(mockModel('A'));
      const joineeModel = joinee(model, 'a', 'all_a');

      expect(joineeModel.aliasOnJoin).to.be.equals('a');
      expect(joineeModel.aliasOnTarget).to.be.equals('all_a');
      expect(joineeModel.key).to.be.equals('aId');
      expect(joineeModel.model).to.be.equals(model);
      expect(joineeModel.onDelete).to.be.equals('CASCADE');
      expect(joineeModel.onUpdate).to.be.equals('CASCADE');
      expect(joineeModel.type).to.be.instanceof(IntegerType);
    });

    it('should return a joinee with overriden defaults', () => {
      const model = mockUninitializedStateModel(mockModel('A'));
      const joineeModel = joinee(model, 'a', 'all_a', {
        key: 'someId',
        onDelete: 'SET NULL',
        onUpdate: 'NO ACTION',
        type: DataTypes.STRING(),
      });

      expect(joineeModel.aliasOnJoin).to.be.equals('a');
      expect(joineeModel.aliasOnTarget).to.be.equals('all_a');
      expect(joineeModel.key).to.be.equals('someId');
      expect(joineeModel.model).to.be.equals(model);
      expect(joineeModel.onDelete).to.be.equals('SET NULL');
      expect(joineeModel.onUpdate).to.be.equals('NO ACTION');
      expect(joineeModel.type).to.be.instanceof(StringType);
    });

  });

  describe('createJoinModel', () => {

    it('should properly build an UninitializedStateModel object', () => {
      const modelA = mockModel('A');
      const modelB = mockModel('B');

      const joinModel = createJoinModel({
        firstJoinee: joinee(mockUninitializedStateModel(modelA), 'a', 'all_a'),
        name: 'a',
        owner: ['b', 'c'],
        secondJoinee: joinee(mockUninitializedStateModel(modelB), 'b', 'all_b'),
        virtual: true,
      });

      expect(joinModel.join).to.be.true;
      expect(joinModel.owner).to.deep.equal(['b', 'c']);
      expect(joinModel.name).to.be.equals('a');
      expect(joinModel.virtual).to.be.true;
      expect(joinModel.initialize).to.be.a('function');
    });

    it('should properly add a unique constraint on the join model', () => {
      const modelA = mockModel('A');
      const modelB = mockModel('B');

      const joinModel = createJoinModel({
        firstJoinee: joinee(mockUninitializedStateModel(modelA), 'a', 'all_a'),
        name: 'a',
        owner: ['b', 'c'],
        secondJoinee: joinee(mockUninitializedStateModel(modelB), 'b', 'all_b'),
        virtual: true,
      });

      expect(joinModel.model.indexes.unique[0]).to.deep.equal(['aId', 'bId']);
    });

    it('should properly append relations and attributes to the join model', () => {
      const modelA = mockModel('A');
      const modelB = mockModel('B');

      const joinModel = createJoinModel({
        firstJoinee: joinee(mockUninitializedStateModel(modelA), 'a', 'all_a'),
        name: 'a',
        owner: ['b', 'c'],
        secondJoinee: joinee(mockUninitializedStateModel(modelB), 'b', 'all_b'),
        virtual: true,
      });

      expect(joinModel.model.attributes[0].name).to.be.equals('aId');
      expect(joinModel.model.attributes[0].type).to.be.instanceof(IntegerType);
      expect(joinModel.model.attributes[0].required).to.be.true;

      expect(joinModel.model.attributes[1].name).to.be.equals('bId');
      expect(joinModel.model.attributes[1].type).to.be.instanceof(IntegerType);
      expect(joinModel.model.attributes[1].required).to.be.true;

      expect(joinModel.model.relations[0].type).to.be.equals('MASTER');
      expect(joinModel.model.relations[0].owner).to.deep.equal(['b', 'c']);
      expect(joinModel.model.relations[0].alias).to.be.equals('a');
      expect(joinModel.model.relations[0].key).to.be.equals('aId');
      expect(joinModel.model.relations[0].model).to.be.equals('A');
      expect(joinModel.model.relations[0].onDelete).to.be.equals('CASCADE');
      expect(joinModel.model.relations[0].onUpdate).to.be.equals('CASCADE');
      expect(joinModel.model.relations[0].required).to.be.true;
      expect(joinModel.model.relations[0].virtual).to.be.false;

      expect(joinModel.model.relations[1].type).to.be.equals('MASTER');
      expect(joinModel.model.relations[1].owner).to.deep.equal(['b', 'c']);
      expect(joinModel.model.relations[1].alias).to.be.equals('b');
      expect(joinModel.model.relations[1].key).to.be.equals('bId');
      expect(joinModel.model.relations[1].model).to.be.equals('B');
      expect(joinModel.model.relations[1].onDelete).to.be.equals('CASCADE');
      expect(joinModel.model.relations[1].onUpdate).to.be.equals('CASCADE');
      expect(joinModel.model.relations[1].required).to.be.true;
      expect(joinModel.model.relations[1].virtual).to.be.false;
    });

    it('should properly append relations to the joined models', () => {
      const modelA = mockModel('A');
      const modelB = mockModel('B');

      createJoinModel({
        firstJoinee: joinee(mockUninitializedStateModel(modelA), 'a', 'all_a'),
        name: 'J',
        owner: ['b', 'c'],
        secondJoinee: joinee(mockUninitializedStateModel(modelB), 'b', 'all_b'),
        virtual: true,
      });

      expect(modelA.relations[0].type).to.be.equals('MANY_TO_MANY');
      expect(modelA.relations[0].owner).to.deep.equal(['b', 'c']);
      expect(modelA.relations[0].alias).to.be.equals('all_b');
      expect(modelA.relations[0].key).to.be.equals('aId');
      expect(modelA.relations[0].model).to.be.equals('B');
      expect(modelA.relations[0].through).to.be.equals('J');
      expect(modelA.relations[0].onDelete).to.be.equals('CASCADE');
      expect(modelA.relations[0].onUpdate).to.be.equals('CASCADE');
      expect(modelA.relations[0].required).to.be.true;
      expect(modelA.relations[0].virtual).to.be.true;

      expect(modelB.relations[0].type).to.be.equals('MANY_TO_MANY');
      expect(modelB.relations[0].owner).to.deep.equal(['b', 'c']);
      expect(modelB.relations[0].alias).to.be.equals('all_a');
      expect(modelB.relations[0].key).to.be.equals('bId');
      expect(modelB.relations[0].model).to.be.equals('A');
      expect(modelB.relations[0].through).to.be.equals('J');
      expect(modelB.relations[0].onDelete).to.be.equals('CASCADE');
      expect(modelB.relations[0].onUpdate).to.be.equals('CASCADE');
      expect(modelB.relations[0].required).to.be.true;
      expect(modelB.relations[0].virtual).to.be.true;
    });

    it('should properly add other attributes to the join model', () => {
      const modelA = mockModel('A');
      const modelB = mockModel('B');

      const joinModel = createJoinModel(
        {
          firstJoinee: joinee(mockUninitializedStateModel(modelA), 'a', 'all_a'),
          name: 'a',
          owner: ['b', 'c'],
          secondJoinee: joinee(mockUninitializedStateModel(modelB), 'b', 'all_b'),
          virtual: true,
        },
        ({attribute}) => {

          attribute({
            name: 'count',
            type: DataTypes.INTEGER(),
          });

        },
      );

      joinModel.initialize();

      expect(joinModel.model.attributes[2].name).to.be.equals('count');
    });

  });

});
