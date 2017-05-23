import { createSpec, Spec, Model } from '../../main';
import RoleModel, { Role } from './Role';
import { Permission } from './Permission';

export type User = Model<{
  name: 'User';
  fields: {
    id: number;
    firstName: string;
    lastName: string;
    roleId: number;
  };
  records: {
    role: Role;
  };
  sets: {
    permissions: Permission;
  }
}>;

export default createSpec<User>(
  { name: 'User', scope: 'me' },
  ({ attribute, relation }) => {
    attribute.primaryKey({ name: 'id' });
    attribute({ name: 'firstName', type: 'STRING' });
    attribute({ name: 'lastName', type: 'STRING' });

    relation.master({
      alias: 'role',
      foreignKey: 'roleId',
      ownAliasOnTarget: 'users',
      target: RoleModel,
    });
  },
);
