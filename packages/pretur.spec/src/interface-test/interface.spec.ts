/// <reference types="mocha" />

import { expect } from 'chai';
import Permission from './fixture/Permission';
import Role from './fixture/Role';
import User from './fixture/User';
import UserPermission from './fixture/UserPermission';

function init() {
  return {
    Permission: Permission.initialize(),
    Role: Role.initialize(),
    User: User.initialize(),
    UserPermission: UserPermission.initialize(),
  };
}

describe('pretur.spec interface testing fixture', () => {
  const {Permission, Role, User, UserPermission} = init();

  it('should properly initialize all relations', () => {

    expect(Permission.relationArray.map(a => a.alias)).to.include('users');

    expect(Role.relationArray.map(a => a.alias)).to.include('users');

    expect(User.relationArray.map(a => a.alias)).to.include('role');
    expect(User.relationArray.map(a => a.alias)).to.include('permissions');

    expect(UserPermission.relationArray.map(a => a.alias)).to.include('user');
    expect(UserPermission.relationArray.map(a => a.alias)).to.include('permission');
  });

  it('should properly initialize all attributes', () => {

    expect(Permission.attributeArray.map(a => a.name)).to.include('id');
    expect(Permission.attributeArray.map(a => a.name)).to.include('name');

    expect(Role.attributeArray.map(a => a.name)).to.include('id');
    expect(Role.attributeArray.map(a => a.name)).to.include('name');

    expect(User.attributeArray.map(a => a.name)).to.include('id');
    expect(User.attributeArray.map(a => a.name)).to.include('firstName');
    expect(User.attributeArray.map(a => a.name)).to.include('lastName');
    expect(User.attributeArray.map(a => a.name)).to.include('roleId');

    expect(UserPermission.attributeArray.map(a => a.name)).to.include('userId');
    expect(UserPermission.attributeArray.map(a => a.name)).to.include('permissionId');
  });

});
