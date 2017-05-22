import { createSpec, Spec, Model } from '../../main';
import { User } from './User';

export interface PermissionValues<T> {
  type: 'list' | 'switch' | 'graph';
  value: T;
}

export type Permission<T> = Model<{
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

export default createSpec<Permission<any>>(
  { name: 'Role', owner: 'me' },
  ({ attribute }) => {
    attribute.primaryKey({ autoIncrement: false, name: 'id' });
    attribute({ name: 'name', type: 'STRING' });
  },
);
