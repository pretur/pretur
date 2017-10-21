/// <reference types="mocha" />

import { expect } from 'chai';
import Units from './main';

describe('Units', () => {

  it('should fail to construct if conversions units are invalid', () => {
    expect(() => {
      new Units(['g', 'kg'], [
        ['kg', 'count', 1000],
      ]);
    }).to.throw();
    expect(() => {
      new Units(['g', 'kg'], [
        ['g', 'g', 2],
      ]);
    }).to.throw();
    expect(() => {
      new Units(['g', 'kg'], [
        ['g', 'kg', 0],
      ]);
    }).to.throw();
  });

  describe('convert', () => {

    it('should perform basic conversion', () => {
      const units = new Units(['g', 'kg'], [
        ['kg', 'g', 1000],
      ]);

      expect(units.convert('g', 'kg', 1)).to.be.equals(0.001);
      expect(units.convert('g', 'kg', 3)).to.be.equals(0.003);
      expect(units.convert('g', 'g', 3)).to.be.equals(3);
      expect(units.convert('kg', 'kg', 2)).to.be.equals(2);
      expect(units.convert('kg', 'g', 2.5)).to.be.equals(2500);
    });

    it('should ignore invalid unit names and conversions', () => {
      const units = new Units(['g', 'kg', <any>0, <any>false, <any>undefined], [
        <any>undefined,
        ['kg', 'g', 1000],
        <any>false,
        <any>'',
        <any>23,
      ]);

      expect(units.convert('g', 'kg', 1)).to.be.equals(0.001);
    });

    it('should perform complex conversions', () => {
      const units = new Units(['1', 'box', 'container', 'g', 'kg'], [
        ['kg', 'g', 1000],
        ['1', 'g', 500],
        ['box', '1', 25],
        ['container', 'box', 20],
      ]);

      expect(units.convert('1', 'g', 4)).to.be.equals(2000);
      expect(units.convert('1', 'kg', 10)).to.be.equals(5);
      expect(units.convert('kg', '1', 5)).to.be.equals(10);
      expect(units.convert('kg', '1', 5)).to.be.equals(10);
      expect(units.convert('container', '1', 2)).to.be.equals(1000);
      expect(units.convert('container', 'kg', 2)).to.be.equals(500);
      expect(units.convert('container', 'g', 20)).to.be.equals(5000000);
      expect(units.convert('kg', 'container', 25)).to.be.equals(0.1);
    });

  });

  describe('getRatio', () => {

    it('should get ratio where there is one', () => {
      const units = new Units(['g', 'kg'], [
        ['kg', 'g', 1000],
      ]);

      expect(units.getRatio('g', 'kg')).to.be.equals(0.001);
    });

    it('should return Infinity as ratio where there is none', () => {
      const units = new Units(['g', 'kg']);

      expect(units.getRatio('g', 'kg')).to.be.equals(Infinity);
    });

  });

  describe('createConverter', () => {

    it('should return convertor', () => {
      const units = new Units(['g', 'kg'], [
        ['kg', 'g', 1000],
      ]);

      expect(units.createConverter('g', 'kg')!(200)).to.be.equals(0.2);
    });

    it('should return undefined if there are no ratios', () => {
      const units = new Units(['g', 'kg']);

      expect(units.createConverter('g', 'kg')).to.be.undefined;
    });

  });

  describe('getMatrix', () => {

    it('should calculate conversion grid matrix', () => {
      const units = new Units(['1', 'box', 'container', 'g', 'kg'], [
        ['kg', 'g', 1000],
        ['1', 'g', 500],
        ['box', '1', 25],
        ['container', 'box', 20],
      ]);

      const expectedMatrix = {
        '1': {
          '1': 1,
          'box': 0.04,
          'container': 0.002,
          'g': 500,
          'kg': 0.5,
        },
        'box': {
          '1': 25,
          'box': 1,
          'container': 0.05,
          'g': 12500,
          'kg': 12.5,
        },
        'container': {
          '1': 500,
          'box': 20,
          'container': 1,
          'g': 250000,
          'kg': 250,
        },
        'g': {
          '1': 0.002,
          'box': 0.00008,
          'container': 0.000004,
          'g': 1,
          'kg': 0.001,
        },
        'kg': {
          '1': 2,
          'box': 0.08,
          'container': 0.004,
          'g': 1000,
          'kg': 1,
        },
      };

      const matrix = units.getMatrix('nested');

      expect(matrix).to.deep.equal(expectedMatrix);
    });

    it('should calculate conversion grid matrix', () => {
      const unitNames = ['1', 'box', 'container', 'g', 'kg'];
      const units = new Units(unitNames, [
        ['kg', 'g', 1000],
        ['1', 'g', 500],
        ['box', '1', 25],
        ['container', 'box', 20],
      ]);

      const expectedMatrix = [
        [1, 0.04, 0.002, 500, 0.5],
        [25, 1, 0.05, 12500, 12.5],
        [500, 20, 1, 250000, 250],
        [0.002, 0.00008, 0.000004, 1, 0.001],
        [2, 0.08, 0.004, 1000, 1],
      ];

      const matrix = units.getMatrix('grid');

      expect(matrix.indices).to.deep.equal(unitNames);
      expect(matrix.grid).to.deep.equal(expectedMatrix);
    });

    it('should calculate conversion grid matrix with Infinity values', () => {
      const unitNames = ['1', 'box', 'g', 'kg'];
      const units = new Units(unitNames, [
        ['kg', 'g', 1000],
        ['box', '1', 25],
      ]);

      const expectedMatrix = [
        [1, 0.04, Infinity, Infinity],
        [25, 1, Infinity, Infinity],
        [Infinity, Infinity, 1, 0.001],
        [Infinity, Infinity, 1000, 1],
      ];

      const matrix = units.getMatrix('grid');

      expect(matrix.indices).to.deep.equal(unitNames);
      expect(matrix.grid).to.deep.equal(expectedMatrix);
    });

    it('should calculate conversion array matrix', () => {
      const units = new Units(['1', 'box', 'container', 'g', 'kg'], [
        ['kg', 'g', 1000],
        ['1', 'g', 500],
        ['box', '1', 25],
        ['container', 'box', 20],
      ]);

      const expectedMatrix = [
        ['1', '1', 1],
        ['1', 'box', 0.04],
        ['1', 'container', 0.002],
        ['1', 'g', 500],
        ['1', 'kg', 0.5],
        ['box', '1', 25],
        ['box', 'box', 1],
        ['box', 'container', 0.05],
        ['box', 'g', 12500],
        ['box', 'kg', 12.5],
        ['container', '1', 500],
        ['container', 'box', 20],
        ['container', 'container', 1],
        ['container', 'g', 250000],
        ['container', 'kg', 250],
        ['g', '1', 0.002],
        ['g', 'box', 0.00008],
        ['g', 'container', 0.000004],
        ['g', 'g', 1],
        ['g', 'kg', 0.001],
        ['kg', '1', 2],
        ['kg', 'box', 0.08],
        ['kg', 'container', 0.004],
        ['kg', 'g', 1000],
        ['kg', 'kg', 1],
      ];

      const matrix = units.getMatrix('array');

      expect(matrix).to.deep.equal(expectedMatrix);
    });

  });

});
