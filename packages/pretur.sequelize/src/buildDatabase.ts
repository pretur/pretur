import * as Sequelize from 'sequelize';
import { ProviderPool } from './pool';

export interface TableCreationHook {
  (create: () => Promise<void>, database: Sequelize.Model<any, any>, context: any): Promise<void>;
}

export interface TableDestructionHook {
  (destroy: () => Promise<void>, database: Sequelize.Model<any, any>, context: any): Promise<void>;
}

export interface DatabaseAfterCreationHook {
  (database: Sequelize.Model<any, any>, context: any): Promise<void>;
}

export interface DatabaseAfterDestructionHook {
  (database: Sequelize.Model<any, any>, context: any): Promise<void>;
}

export async function createDatabase(
  sequelize: Sequelize.Sequelize,
  pool: ProviderPool,
  context?: any,
) {
  const topologicallySorted: Sequelize.Model<any, any>[] = [];
  (<any>sequelize).modelManager.forEachModel((db: any) => topologicallySorted.push(db));

  for (const database of topologicallySorted) {
    const name: string = (<any>database)['name'];
    const provider = pool.providers[name];

    const create = async () => {
      await database.sync();
    };

    if (provider && provider.metadata.creationHook) {
      await provider.metadata.creationHook(create, database, context);
    } else {
      await create();
    }
  }

  for (const database of topologicallySorted) {
    const name: string = (<any>database)['name'];
    const provider = pool.providers[name];

    if (provider && provider.metadata.afterDatabaseCreationHook) {
      await provider.metadata.afterDatabaseCreationHook(database, context);
    }
  }
}

export async function destroyDatabase(
  sequelize: Sequelize.Sequelize,
  pool: ProviderPool,
  context?: any,
) {
  const topologicallySorted: Sequelize.Model<any, any>[] = [];
  (<any>sequelize).modelManager.forEachModel((db: any) => topologicallySorted.push(db));

  for (const database of topologicallySorted) {
    const name: string = (<any>database)['name'];
    const provider = pool.providers[name];

    const destroy = async () => {
      await database.drop({ cascade: true });
    };

    if (provider && provider.metadata.destructionHook) {
      await provider.metadata.destructionHook(destroy, database, context);
    } else {
      await destroy();
    }
  }

  for (const database of topologicallySorted) {
    const name: string = (<any>database)['name'];
    const provider = pool.providers[name];

    if (provider && provider.metadata.afterDatabaseDestructionHook) {
      await provider.metadata.afterDatabaseDestructionHook(database, context);
    }
  }
}
