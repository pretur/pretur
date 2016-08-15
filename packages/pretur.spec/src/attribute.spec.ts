import { expect } from 'chai';
import { RawModel } from './model';
import { appendAttribute } from './attribute';

function mockRawModel(name: string): RawModel<any> {
  return {
    name: name,
    owner: null,
    virtual: false,
    join: false,
    attributes: [],
    relations: [],
    indexes: { unique: [] },
  };
}

describe('attribute', () => {

  describe('appendAttribute', () => {

    it('should fail if no model is provided', () => {
      expect(() => appendAttribute(null, <any>{})).to.throw();
    });

    it('should fail if no attribute is provided', () => {
      expect(() => appendAttribute(mockRawModel('A'))).to.throw();
    });

    it('should fail with invalid', () => {
      expect(() => appendAttribute(mockRawModel('A'))).to.throw();
    });

  });

});
