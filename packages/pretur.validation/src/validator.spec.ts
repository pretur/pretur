import { expect } from 'chai';
import { compose } from './validator';

describe('compose', () => {

  it('should return always-valid validator if non provided', () => {
    const validator = compose();
    expect(validator({})).to.be.null;
  });

  it('should return bail out with the first failed validation', () => {
    const validator = compose(
      (v: number) => v > 1 ? null : { key: 'A' },
      (v: number) => v > 2 ? null : { key: 'B' },
      (v: number) => v > 3 ? null : { key: 'C' },
      (v: number) => v > 4 ? null : { key: 'D' }
    );
    expect(validator(3)).to.deep.equal({ key: 'C' });
  });

});
