import { createSpec, Spec } from '../../main';
import { User } from './User';

export interface Role {
  id: number;
  name: string;
  users: User[];
}

export default <Spec<Role>>createSpec<Role>(
  { name: 'Role', owner: 'me' },
  ({ attribute }) => {
    attribute.primaryKey({ name: 'id' });
    attribute({ name: 'name', type: 'STRING' });
  },
);
