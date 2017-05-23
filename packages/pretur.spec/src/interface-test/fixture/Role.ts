import { createSpec, Spec, Model } from '../../main';
import { User } from './User';

export type Role = Model<{
  name: 'Role';
  fields: {
    id: number;
    name: string;
  };
  records: {};
  sets: {
    users: User;
  }
}>;

export default createSpec<Role>(
  { name: 'Role', scope: 'me' },
  ({ attribute }) => {
    attribute.primaryKey({ name: 'id' });
    attribute({ name: 'name', type: 'STRING' });
  },
);
