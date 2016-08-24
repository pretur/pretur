import { createJoinModel, joinee } from '../../main';
import UserModel, { User } from './User';
import PermissionModel, { Permission } from './Permission';

export interface UserPermission {
  userId?: number;
  user?: User;
  permissionId?: number;
  permission?: Permission<any>;
}

export default createJoinModel<UserPermission>({
  firstJoinee: joinee(UserModel, 'user', 'users'),
  name: 'UserPermission',
  owner: null,
  secondJoinee: joinee(PermissionModel, 'permission', 'permissions'),
});
