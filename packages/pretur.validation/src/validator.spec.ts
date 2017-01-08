/// <reference types="mocha" />

import * as Bluebird from 'bluebird';
import { expect } from 'chai';
import { combineValidators, ValidationError } from './validator';

describe('combine', () => {

  it('should return always-valid validator if non provided', async (): Bluebird<void> => {
    const validator = combineValidators();
    expect(await validator({})).to.be.undefined;
  });

  it('should return bail out with the first failed validation', async (): Bluebird<void> => {
    const validator = combineValidators(
      async (v: number): Bluebird<ValidationError> => v > 1 ? undefined : { key: 'A' },
      async (v: number): Bluebird<ValidationError> => v > 2 ? undefined : { key: 'B' },
      async (v: number): Bluebird<ValidationError> => v > 3 ? undefined : [
        { key: 'C' },
        { key: 'D' },
      ],
      async (v: number): Bluebird<ValidationError> => v > 4 ? undefined : { key: 'E' },
    );
    expect(await validator(3)).to.deep.equal([{ key: 'C' }, { key: 'D' }, { key: 'E' }]);
  });

});
