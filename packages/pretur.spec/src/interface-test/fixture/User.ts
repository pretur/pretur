import { createModel, DataTypes } from '../../main';
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

export default createModel<User>(
  { name: 'User', owner: null },
  ({ attribute, relation }) => {
    attribute.primaryKey({ name: 'id' });
    attribute({ name: 'firstName', type: DataTypes.STRING() });
    attribute({ name: 'lastName', type: DataTypes.STRING() });

    relation.master({
      alias: 'role',
      foreignKey: 'roleId',
      ownAliasOnTarget: 'users',
      target: RoleModel,
    });
  },
);
