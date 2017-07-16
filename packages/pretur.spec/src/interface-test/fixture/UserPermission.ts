import { createJoinSpec } from '../../main';
import UserModel, { UserType } from './User';
import PermissionModel, { PermissionType } from './Permission';

export interface UserPermissionType {
  name: 'UserPermission';
  fields: {
    userId: number;
    permissionId: number;
  };
  records: {
    user: UserType;
    permission: PermissionType;
  };
  sets: {};
}

export default createJoinSpec<UserPermissionType, UserType, PermissionType>({
  firstJoinee: {
    aliasOnJoin: 'user',
    aliasOnTarget: 'users',
    key: { name: 'userId' },
    spec: UserModel,
  },
  name: 'UserPermission',
  scope: 'me',
  secondJoinee: {
    aliasOnJoin: 'permission',
    aliasOnTarget: 'permissions',
    key: { name: 'permissionId' },
    spec: PermissionModel,
  },
});
