import * as Sequelize from 'sequelize';
import { ProviderPool } from './pool';

export interface TableCreationHook {
  (
    create: () => Promise<void>,
    model: Sequelize.Model<any, any>,
    pool: ProviderPool,
    context: any,
  ): Promise<void>;
}

export interface TableDestructionHook {
  (
    destroy: () => Promise<void>,
    model: Sequelize.Model<any, any>,
    pool: ProviderPool,
    context: any,
  ): Promise<void>;
}

export interface DatabaseAfterCreationHook {
  (model: Sequelize.Model<any, any>, pool: ProviderPool, context: any): Promise<void>;
}

export interface DatabaseAfterDestructionHook {
  (model: Sequelize.Model<any, any>, pool: ProviderPool, context: any): Promise<void>;
}

export async function buildDatabase(
  sequelize: Sequelize.Sequelize,
  pool: ProviderPool,
  context?: any,
) {
  const topologicallySortedModels: Sequelize.Model<any, any>[] = [];
  (<any>sequelize).modelManager.forEachModel((model: any) => topologicallySortedModels.push(model));

  for (const model of topologicallySortedModels) {
    const name: string = (<any>model)['name'];
    const provider = pool.providers[name];

    const create = async () => {
      await model.sync();
    };

    if (provider && provider.metadata.creationHook) {
      await provider.metadata.creationHook(create, model, pool, context);
    } else {
      await create();
    }
  }

  for (const table of topologicallySortedModels) {
    const model: string = (<any>table)['name'];
    const provider = pool.providers[model];

    if (provider && provider.metadata.afterDatabaseCreationHook) {
      await provider.metadata.afterDatabaseCreationHook(table, pool, context);
    }
  }
}

export async function destroyDatabase(
  sequelize: Sequelize.Sequelize,
  pool: ProviderPool,
  context?: any,
) {
  const topologicallySortedModels: Sequelize.Model<any, any>[] = [];
  (<any>sequelize).modelManager.forEachModel((model: any) => topologicallySortedModels.push(model));

  for (const model of topologicallySortedModels) {
    const name: string = (<any>model)['name'];
    const provider = pool.providers[name];

    const destroy = async () => {
      await model.drop({ cascade: true });
    };

    if (provider && provider.metadata.destructionHook) {
      await provider.metadata.destructionHook(destroy, model, pool, context);
    } else {
      await destroy();
    }
  }

  for (const model of topologicallySortedModels) {
    const name: string = (<any>model)['name'];
    const provider = pool.providers[name];

    if (provider && provider.metadata.afterDatabaseDestructionHook) {
      await provider.metadata.afterDatabaseDestructionHook(model, pool, context);
    }
  }
}
