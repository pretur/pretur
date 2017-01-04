/// <reference types="mocha" />

import { expect } from 'chai';
import { save, load, saveActivePage, loadActivePage, clear } from '../src/persist';

describe('persist', () => {

  describe('save, load', () => {

    it('should save and load correctly', () => {
      const home = { mutex: '1', path: 'home' };
      save('', [home]);
      const admin = { mutex: '2', path: 'admin' };
      save('ADM', [admin]);
      expect(load('')).to.deep.equal([home]);
      expect(load('ADM')).to.deep.equal([admin]);
    });

  });

  describe('save, load active page', () => {

    it('should save and load the active page correctly', () => {
      saveActivePage('', 'home');
      saveActivePage('ADM', 'admin');
      expect(loadActivePage('')).to.be.equals('home');
      expect(loadActivePage('ADM')).to.be.equals('admin');
    });

  });

  describe('clear', () => {

    it('should clear pages and the active page without affecting other values', () => {
      const home = { mutex: '1', path: 'home' };
      save('', [home]);
      saveActivePage('', 'home');
      saveActivePage('ADM', 'admin');
      clear('');
      expect(load('')).to.be.deep.equal([]);
      expect(loadActivePage('')).to.be.undefined;
      expect(loadActivePage('ADM')).to.be.equals('admin');
    });

  });

});
