import { createSpec, Spec } from '../../main';
import RoleModel, { Role } from './Role';
import { Permission } from './Permission';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  roleId: number;
  role: Role;
  permissions: Permission<any>[];
}

export default <Spec<User>>createSpec<User>(
  { name: 'User', owner: 'me' },
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
