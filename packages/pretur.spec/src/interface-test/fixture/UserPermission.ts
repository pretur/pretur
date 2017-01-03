import { createJoinModel } from '../../main';
import UserModel, { User } from './User';
import PermissionModel, { Permission } from './Permission';

export interface UserPermission {
  userId: number;
  user: User;
  permissionId: number;
  permission: Permission<any>;
}

export default createJoinModel<UserPermission, User, Permission<any>>({
  firstJoinee: {
    aliasOnJoin: 'user',
    aliasOnTarget: 'users',
    key: 'userId',
    model: UserModel,
  },
  name: 'UserPermission',
  owner: null,
  secondJoinee: {
    aliasOnJoin: 'permission',
    aliasOnTarget: 'permissions',
    key: 'permissionId',
    model: PermissionModel,
  },
});
