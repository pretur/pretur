import { expect } from 'chai';
import { emissionMiddleware, emit, EMISSION_DISPATCH, EMISSION_GET_STATE } from './emission';

describe('emissionMiddleware', () => {

  it('should append dispatch and getState', () => {
    let action: any;
    const dispatch = (a: any) => action = a;
    const getState = () => ({ state: 'hello' });
    emissionMiddleware({ dispatch, getState })(dispatch)({ type: 'TYPE' });
    expect(action.type).to.be.equals('TYPE');
    expect(action[EMISSION_DISPATCH]).to.be.equals(dispatch);
    expect(action[EMISSION_GET_STATE]).to.be.equals(getState);
  });

});

describe('emit', () => {

  it('should properly defer execution of side-effect', () => {
    let action: any;
    const dispatch = (a: any) => action = a;
    const getState = () => ({ state: 'HELLO' });
    emissionMiddleware({ dispatch, getState })(dispatch)({ type: 'TYPE' });
    const promise = emit(action, (d, gS) => {
      d(action = { type: gS().state });
      return 'stuff';
    });
    expect(action.type).to.be.equals('TYPE');
    return promise.then((stuff) => {
      expect(stuff).to.be.equals('stuff');
      expect(action.type).to.be.equals('HELLO');
    });
  });

});
