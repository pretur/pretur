import { createModel, DataTypes } from '../../main';
import { User } from './User';

export interface Role {
  id?: number;
  name?: string;
  users?: User[];
}

export default createModel<Role>(
  { name: 'Role', owner: null },
  ({attribute}) => {
    attribute.primaryKey({ name: 'id' });
    attribute({ name: 'name', type: DataTypes.STRING() });
  }
);
