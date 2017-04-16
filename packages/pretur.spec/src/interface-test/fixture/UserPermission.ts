import { createJoinSpec, Spec } from '../../main';
import UserModel, { User } from './User';
import PermissionModel, { Permission } from './Permission';

export interface UserPermission {
  userId: number;
  user: User;
  permissionId: number;
  permission: Permission<any>;
}

export default <Spec<UserPermission>>createJoinSpec<UserPermission, User, Permission<any>>({
  firstJoinee: {
    aliasOnJoin: 'user',
    aliasOnTarget: 'users',
    key: 'userId',
    spec: UserModel,
  },
  name: 'UserPermission',
  owner: 'me',
  secondJoinee: {
    aliasOnJoin: 'permission',
    aliasOnTarget: 'permissions',
    key: 'permissionId',
    spec: PermissionModel,
  },
});
