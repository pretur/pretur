/// <reference types="mocha" />

import * as Bluebird from 'bluebird';
import { expect } from 'chai';
import { minimumLength } from './minimumLength';

describe('value-validator:minimumLength', () => {

  it('should return null for valid input', async (): Bluebird<void> => {
    const validator1 = minimumLength('A', 2, false);
    const validator2 = minimumLength('A', 3, true);
    expect(await validator1('12')).to.be.null;
    expect(await validator1('1234')).to.be.null;
    expect(await validator2('123')).to.be.null;
    expect(await validator2('123456')).to.be.null;
    expect(await validator2('')).to.be.null;
    expect(await validator2(null!)).to.be.null;
    expect(await validator2(undefined!)).to.be.null;
  });

  it(
    'should return bundle with {VALUE, MINIMUM_LENGTH, ACCEPT_EMPTY} for invalid input',
    async (): Bluebird<void> => {
      const validator1 = minimumLength('A', 2, false);
      const validator2 = minimumLength('A', 3, true);
      expect(await validator1('1')).to.deep.equal({
        data: { ACCEPT_EMPTY: false, MINIMUM_LENGTH: 2, VALUE: '1' },
        key: 'A',
      });
      expect(await validator1('')).to.deep.equal({
        data: { ACCEPT_EMPTY: false, MINIMUM_LENGTH: 2, VALUE: '' },
        key: 'A',
      });
      expect(await validator1(null!)).to.deep.equal({
        data: { ACCEPT_EMPTY: false, MINIMUM_LENGTH: 2, VALUE: null },
        key: 'A',
      });
      expect(await validator1(undefined!)).to.deep.equal({
        data: { ACCEPT_EMPTY: false, MINIMUM_LENGTH: 2, VALUE: undefined },
        key: 'A',
      });
      expect(await validator2('1')).to.deep.equal({
        data: { ACCEPT_EMPTY: true, MINIMUM_LENGTH: 3, VALUE: '1' },
        key: 'A',
      });
      expect(await validator2('12')).to.deep.equal({
        data: { ACCEPT_EMPTY: true, MINIMUM_LENGTH: 3, VALUE: '12' },
        key: 'A',
      });
    },
  );

});
