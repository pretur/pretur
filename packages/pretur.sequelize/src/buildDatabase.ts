import * as Sequelize from 'sequelize';
import { Pool } from './pool';

export interface TableCreationHook {
  (
    create: () => Promise<void>,
    model: Sequelize.Model<any, any>,
    pool: Pool,
    context: any,
  ): Promise<void>;
}

export interface TableDestructionHook {
  (
    destroy: () => Promise<void>,
    model: Sequelize.Model<any, any>,
    pool: Pool,
    context: any,
  ): Promise<void>;
}

export interface DatabaseAfterCreationHook {
  (model: Sequelize.Model<any, any>, pool: Pool, context: any): Promise<void>;
}

export interface DatabaseAfterDestructionHook {
  (model: Sequelize.Model<any, any>, pool: Pool, context: any): Promise<void>;
}

export async function buildDatabase(sequelize: Sequelize.Sequelize, pool: Pool, context?: any) {
  const topologicallySortedModels: Sequelize.Model<any, any>[] = [];
  (<any>sequelize).modelManager.forEachModel((model: any) => topologicallySortedModels.push(model));

  for (const table of topologicallySortedModels) {
    const name: string = (<any>table)['name'];
    const model = pool.models[name];

    const create = async () => {
      await table.sync();
    };

    if (model && model.creationHook) {
      await model.creationHook(create, table, pool, context);
    } else {
      await create();
    }
  }

  for (const table of topologicallySortedModels) {
    const name: string = (<any>table)['name'];
    const model = pool.models[name];

    if (model && model.afterDatabaseCreationHook) {
      await model.afterDatabaseCreationHook(table, pool, context);
    }
  }
}

export async function destroyDatabase(sequelize: Sequelize.Sequelize, pool: Pool, context?: any) {
  const topologicallySortedModels: Sequelize.Model<any, any>[] = [];
  (<any>sequelize).modelManager.forEachModel((model: any) => topologicallySortedModels.push(model));

  for (const table of topologicallySortedModels) {
    const name: string = (<any>table)['name'];
    const model = pool.models[name];

    const destroy = async () => {
      await table.drop({ cascade: true });
    };

    if (model && model.destructionHook) {
      await model.destructionHook(destroy, table, pool, context);
    } else {
      await destroy();
    }
  }

  for (const table of topologicallySortedModels) {
    const name: string = (<any>table)['name'];
    const model = pool.models[name];

    if (model && model.afterDatabaseDestructionHook) {
      await model.afterDatabaseDestructionHook(table, pool, context);
    }
  }
}
