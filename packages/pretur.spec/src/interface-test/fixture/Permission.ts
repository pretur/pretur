import { createModel, DataTypes } from '../../main';
import { User } from './User';

export interface PermissionValues<T> {
  type: 'list' | 'switch' | 'graph';
  value: T;
}

export interface Permission<T> {
  id?: number;
  name?: string;
  values?: PermissionValues<T>;
  users?: User[];
}

export default createModel<Permission<any>>(
  { name: 'Role', owner: null },
  ({attribute}) => {
    attribute.primaryKey({ autoIncrement: false, name: 'id' });
    attribute({ name: 'name', type: DataTypes.STRING() });
  },
);
