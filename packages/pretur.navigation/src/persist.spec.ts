/// <reference types="mocha" />

import { expect } from 'chai';
import { save, load, saveActivePage, loadActivePage, clear } from './persist';

describe('persist', () => {

  describe('save, load', () => {

    it('should save and load correctly', () => {
      const home = { mutex: '1', path: 'home' };
      save([home]);
      expect(load()).to.deep.equal([home]);
    });

  });

  describe('save, load active page', () => {

    it('should save and load the active page correctly', () => {
      saveActivePage('home');
      expect(loadActivePage()).to.be.equals('home');
    });

  });

  describe('clear', () => {

    it('should clear pages and the active page without affecting other values', () => {
      const home = { mutex: '1', path: 'home' };
      save([home]);
      saveActivePage('home');
      clear();
      expect(load()).to.deep.equal([]);
      expect(loadActivePage()).to.be.undefined;
    });

  });

});
