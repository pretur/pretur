import { createSpec, Spec } from '../../main';
import { User } from './User';

export interface PermissionValues<T> {
  type: 'list' | 'switch' | 'graph';
  value: T;
}

export interface Permission<T> {
  id: number;
  name: string;
  values: PermissionValues<T>;
  users: User[];
}

export default <Spec<Permission<any>>>createSpec<Permission<any>>(
  { name: 'Role', owner: 'me' },
  ({ attribute }) => {
    attribute.primaryKey({ autoIncrement: false, name: 'id' });
    attribute({ name: 'name', type: 'STRING' });
  },
);
