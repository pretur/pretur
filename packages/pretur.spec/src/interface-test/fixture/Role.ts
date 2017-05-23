import { createSpec } from '../../main';
import { UserType } from './User';

export interface RoleType {
  name: 'Role';
  fields: {
    id: number;
    name: string;
  };
  records: {};
  sets: {
    users: UserType;
  };
}

export default createSpec<RoleType>(
  { name: 'Role', scope: 'me' },
  ({ attribute }) => {
    attribute.primaryKey({ name: 'id' });
    attribute({ name: 'name', type: 'STRING' });
  },
);
