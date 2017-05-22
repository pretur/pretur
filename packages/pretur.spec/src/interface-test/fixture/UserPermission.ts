import { createJoinSpec, Spec, Model } from '../../main';
import UserModel, { User } from './User';
import PermissionModel, { Permission } from './Permission';

export type UserPermission = Model<{
  fields: {
    userId: number;
    permissionId: number;
  };
  records: {
    user: User;
    permission: Permission<any>;
  };
  sets: {};
}>;

export default createJoinSpec<UserPermission, User, Permission<any>>({
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
