import * as Sequelize from 'sequelize';
import { Spec, SpecType } from 'pretur.spec';
import { SequelizeModel } from './sequelizeModel';
import { Pool } from './pool';

export interface TableCreationHook<T extends SpecType> {
  (spec: Spec<T>, model: SequelizeModel<T>, create: () => Promise<void>): Promise<void>;
}

export interface TableDestructionHook<T extends SpecType> {
  (spec: Spec<T>, model: SequelizeModel<T>, destroy: () => Promise<void>): Promise<void>;
}

export async function buildDatabase(sequelize: Sequelize.Sequelize, pool: Pool) {
  const topologicallySortedModels: Sequelize.Model<any, any>[] = [];
  (<any>sequelize).modelManager.forEachModel((model: any) => topologicallySortedModels.push(model));

  for (const table of topologicallySortedModels) {
    const name: string = (<any>table)['name'];
    const model = pool.models[name];

    const create = async () => {
      await table.sync();
    };

    if (model && model.tableCreationHook) {
      await model.tableCreationHook(pool.models[name].spec, table, create);
    } else {
      await create();
    }
  }
}

export async function destroyDatabase(sequelize: Sequelize.Sequelize, pool: Pool) {
  const topologicallySortedModels: Sequelize.Model<any, any>[] = [];
  (<any>sequelize).modelManager.forEachModel((model: any) => topologicallySortedModels.push(model));

  for (const table of topologicallySortedModels) {
    const name: string = (<any>table)['name'];
    const model = pool.models[name];

    const destroy = async () => {
      await table.drop({ cascade: true });
    };

    if (model && model.tableDestructionHook) {
      await model.tableDestructionHook(pool.models[name].spec, table, destroy);
    } else {
      await destroy();
    }
  }
}
