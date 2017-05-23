import { createSpec } from '../../main';
import { UserType } from './User';

export interface PermissionValues<T> {
  type: 'list' | 'switch' | 'graph';
  value: T;
}

export interface PermissionType<T = any> {
  name: 'Permission';
  fields: {
    id: number;
    name: string;
    values: PermissionValues<T>;
  };
  records: {};
  sets: {
    users: UserType;
  };
}

export default createSpec<PermissionType>(
  { name: 'Permission', scope: 'me' },
  ({ attribute }) => {
    attribute.primaryKey({ autoIncrement: false, name: 'id' });
    attribute({ name: 'name', type: 'STRING' });
  },
);
