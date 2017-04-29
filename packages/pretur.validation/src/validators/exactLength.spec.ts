/// <reference types="mocha" />

import { expect } from 'chai';
import { exactLength } from './exactLength';

describe('value-validator:exactLength', () => {

  it('should return undefined for valid input', async () => {
    const validator1 = exactLength('A', 2, false);
    const validator2 = exactLength('A', 3, true);
    expect(await validator1('12')).to.be.undefined;
    expect(await validator2('123')).to.be.undefined;
    expect(await validator2('')).to.be.undefined;
    expect(await validator2(undefined!)).to.be.undefined;
  });

  it(
    'should return bundle with {VALUE, EXPECTED_LENGTH, ACCEPT_EMPTY} for invalid input',
    async () => {
      const validator1 = exactLength('A', 2, false);
      const validator2 = exactLength('A', 3, true);
      expect(await validator1('123')).to.deep.equal({
        data: { ACCEPT_EMPTY: false, EXPECTED_LENGTH: 2, VALUE: '123' },
        key: 'A',
      });
      expect(await validator1('')).to.deep.equal({
        data: { ACCEPT_EMPTY: false, EXPECTED_LENGTH: 2, VALUE: '' },
        key: 'A',
      });
      expect(await validator1(undefined!)).to.deep.equal({
        data: { ACCEPT_EMPTY: false, EXPECTED_LENGTH: 2, VALUE: undefined },
        key: 'A',
      });
      expect(await validator1(undefined!)).to.deep.equal({
        data: { ACCEPT_EMPTY: false, EXPECTED_LENGTH: 2, VALUE: undefined },
        key: 'A',
      });
      expect(await validator2('12')).to.deep.equal({
        data: { ACCEPT_EMPTY: true, EXPECTED_LENGTH: 3, VALUE: '12' },
        key: 'A',
      });
      expect(await validator2('1233')).to.deep.equal({
        data: { ACCEPT_EMPTY: true, EXPECTED_LENGTH: 3, VALUE: '1233' },
        key: 'A',
      });
    },
  );

});
