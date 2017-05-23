import { createSpec, Spec, Model } from '../../main';
import { User } from './User';

export interface PermissionValues<T> {
  type: 'list' | 'switch' | 'graph';
  value: T;
}

export type Permission<T = any> = Model<{
  name: 'Permission';
  fields: {
    id: number;
    name: string;
    values: PermissionValues<T>;
  };
  records: {};
  sets: {
    users: User;
  }
}>;

export default createSpec<Permission>(
  { name: 'Permission', scope: 'me' },
  ({ attribute }) => {
    attribute.primaryKey({ autoIncrement: false, name: 'id' });
    attribute({ name: 'name', type: 'STRING' });
  },
);
