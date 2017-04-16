/// <reference types="mocha" />

import { expect } from 'chai';
import Permission from './fixture/Permission';
import Role from './fixture/Role';
import User from './fixture/User';
import UserPermission from './fixture/UserPermission';

Permission.initialize();
Role.initialize();
User.initialize();
UserPermission.initialize();

describe('pretur.spec interface testing fixture', () => {

  it('should properly initialize all relations', () => {

    expect(Permission.relations.map(a => a.alias)).to.include('users');

    expect(Role.relations.map(a => a.alias)).to.include('users');

    expect(User.relations.map(a => a.alias)).to.include('role');
    expect(User.relations.map(a => a.alias)).to.include('permissions');

    expect(UserPermission.relations.map(a => a.alias)).to.include('user');
    expect(UserPermission.relations.map(a => a.alias)).to.include('permission');
  });

  it('should properly initialize all attributes', () => {

    expect(Permission.attributes.map(a => a.name)).to.include('id');
    expect(Permission.attributes.map(a => a.name)).to.include('name');

    expect(Role.attributes.map(a => a.name)).to.include('id');
    expect(Role.attributes.map(a => a.name)).to.include('name');

    expect(User.attributes.map(a => a.name)).to.include('id');
    expect(User.attributes.map(a => a.name)).to.include('firstName');
    expect(User.attributes.map(a => a.name)).to.include('lastName');
    expect(User.attributes.map(a => a.name)).to.include('roleId');

    expect(UserPermission.attributes.map(a => a.name)).to.include('userId');
    expect(UserPermission.attributes.map(a => a.name)).to.include('permissionId');
  });

});
