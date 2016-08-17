import { expect } from 'chai';
import { IntegerType, StringType, DataTypes } from './attribute';
import { Model, UninitializedStateModel } from './model';
import { createJoinModel, joinee } from './joinModel';

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

function mockUninitializedStateModel(model: Model<any>): UninitializedStateModel<any> {
  return {
    model: model,
    name: model.name,
    owner: model.owner,
    virtual: model.virtual,
    join: model.join,
    initialize: () => null,
  };
}

describe('joinModel', () => {

  describe('joinee', () => {

    it('should return a joinee with valid defaults', () => {
      const model = mockUninitializedStateModel(mockModel('A'));
      const joineeModel = joinee(model, 'a');

      expect(joineeModel.alias).to.be.equals('a');
      expect(joineeModel.key).to.be.equals('aId');
      expect(joineeModel.model).to.be.equals(model);
      expect(joineeModel.onDelete).to.be.equals('CASCADE');
      expect(joineeModel.onUpdate).to.be.equals('CASCADE');
      expect(joineeModel.type).to.be.instanceof(IntegerType);
    });

    it('should return a joinee with overriden defaults', () => {
      const model = mockUninitializedStateModel(mockModel('A'));
      const joineeModel = joinee(model, 'a', {
        key: 'someId',
        onDelete: 'SET NULL',
        onUpdate: 'NO ACTION',
        type: DataTypes.STRING(),
      });

      expect(joineeModel.alias).to.be.equals('a');
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

      const model = createJoinModel({
        name: 'a',
        owner: ['b', 'c'],
        virtual: true,
        firstJoinee: joinee(mockUninitializedStateModel(modelA), 'a'),
        secondJoinee: joinee(mockUninitializedStateModel(modelB), 'b'),
      });

      expect(model.join).to.be.true;
      expect(model.owner).to.deep.equal(['b', 'c']);
      expect(model.name).to.be.equals('a');
      expect(model.virtual).to.be.true;
      expect(model.initialize).to.be.a('function');
    });

  });

});
