/// <reference types="mocha" />

import { expect } from 'chai';
import fetch from './main';

describe('fetch', () => {

  it('should return node-fetch when in node env', () => {
    expect(fetch).to.be.equals(require('node-fetch'));
  });

});
