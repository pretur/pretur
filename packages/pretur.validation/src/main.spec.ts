/// <reference types="mocha" />

import { expect } from 'chai';
import { combineValidators } from './main';

describe('combine', () => {

  it('should return always-valid validator if non provided', async () => {
    const validator = combineValidators();
    expect(await validator({})).to.be.undefined;
  });

  it('should return bail out with the first failed validation', async () => {
    const validator = combineValidators(
      async v => v > 1 ? undefined : { key: 'A' },
      async v => v > 2 ? undefined : { key: 'B' },
      async v => v > 3 ? undefined : [{ key: 'C' }, { key: 'D' }],
      async v => v > 4 ? undefined : { key: 'E' },
    );
    expect(await validator(3)).to.deep.equal([{ key: 'C' }, { key: 'D' }, { key: 'E' }]);
  });

});
