import { createModel, DataTypes, UninitializedStateModel } from '../../main';
import { User } from './User';

export interface Role {
  id: number;
  name: string;
  users: User[];
}

export default <UninitializedStateModel<Role>>createModel<Role>(
  { name: 'Role', owner: 'me' },
  ({ attribute }) => {
    attribute.primaryKey({ name: 'id' });
    attribute({ name: 'name', type: DataTypes.STRING() });
  },
);
