import { createSpec } from '../../main';
import Role, { RoleType } from './Role';
import { PermissionType } from './Permission';

export interface UserType {
  name: 'User';
  fields: {
    id: number;
    firstName: string;
    lastName: string;
    roleId: number;
  };
  records: {
    role: RoleType;
  };
  sets: {
    permissions: PermissionType;
  };
}

export default createSpec<UserType>(
  { name: 'User', scope: 'me' },
  ({ attribute, relation }) => {
    attribute.primaryKey({ name: 'id' });
    attribute({ name: 'firstName', type: 'STRING' });
    attribute({ name: 'lastName', type: 'STRING' });

    relation.master({
      alias: 'role',
      foreignKey: { name: 'roleId' },
      ownAliasOnTarget: 'users',
      target: Role,
    });
  },
);
