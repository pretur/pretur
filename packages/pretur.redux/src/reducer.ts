import { combineReducers as reduxCombineReducers } from 'redux';
import { assign } from 'lodash';
import { Action } from './action';

export interface Reducer<TState> {
  (state: TState | undefined, action: Action<any, any>): TState;
}

export interface ReducerMap {
  [reducer: string]: Reducer<any>;
}

export interface Reducible {
  reduce(action: Action<any, any>): this;
}

export interface AutoReducibleState {
  [substate: string]: Reducible;
}

export interface Setter<TProps> {
  (prop: TProps, value: any): void;
}

export interface Unsetter<TProps> {
  (prop: TProps): void;
}

export interface Resetter<TState> {
  (state?: TState): void;
}

export interface Mutator<TState, TProps extends string> {
  (
    state: TState,
    action: Action<any, any>,
    set: Setter<TProps>,
    unset: Unsetter<TProps>,
    reset: Resetter<TState>
  ): void;
}

export function createMutatorReducer<TState, TProps extends string>(
  initialState: TState,
  mutator: Mutator<TState, TProps>
): Reducer<TState> {
  return function reducer(state = initialState, action: Action<any, any>) {
    let modified = false;

    let set: { [prop: string]: any } | null = null;
    let unset: string[] | null = null;
    let reset: TState | null = null;

    function setter(prop: string, value: any) {
      if (value !== (<any>state)[prop]) {
        modified = true;
        if (!set) {
          set = {};
        }
        set[prop] = value;

        if (unset) {
          const unsetIndex = unset.indexOf(prop);
          if (unsetIndex !== -1) {
            unset.splice(unsetIndex, 1);
          }
        }

      }
    }

    function unsetter(prop: string) {
      if (state.hasOwnProperty(prop)) {
        modified = true;
        if (!unset) {
          unset = [];
        }
        unset.push(prop);
      }
    }

    function resetter(resetState?: TState) {
      if (resetState) {
        modified = true;
        reset = resetState;
      } else if (state !== initialState) {
        modified = true;
        reset = initialState;
      }
    }

    mutator(state, action, setter, unsetter, resetter);

    if (!modified) {
      return state;
    }

    if (reset) {
      return reset;
    }

    const next = assign({}, state, set);

    if (Array.isArray(unset)) {
      unset.forEach(prop => delete (<any>next)[prop]);
    }

    return next;
  };
}

export function createAutoReducer<TState extends AutoReducibleState>(
  initialState: TState
): Reducer<TState> {
  const properties = Object.keys(initialState);

  let initializationPart = '';
  let modificationCheckPart = '';
  let returnPart = '';

  properties.forEach(property => {

    if (typeof initialState[property].reduce !== 'function') {
      throw new Error(`initialState has a property (${property}) which is not a Reducible.`);
    }

    initializationPart += `var ${property} = state.${property}.reduce(action);\n`;

    modificationCheckPart += `|| ${property} !== state.${property} `;

    returnPart += `${property}: ${property},\n`;

  });

  const body = `
    ${initializationPart}

    if (false ${modificationCheckPart}) {
      return {
        ${returnPart}
      };
    }

    return state;
  `;

  const reducer = Function('state', 'action', body);

  return (state = initialState, action) => {
    return reducer(state, action);
  };
}

export function createReducibleReducer<T extends Reducible>(reducible: T): Reducer<T> {
  return (state, action) => (state || reducible).reduce(action);
}

export interface Constant<T> extends Reducible {
  value: T;
}

export function createConstantReducer<T>(value: T): Constant<T> {
  const constantReducer: any = { value };
  constantReducer.reduce = () => constantReducer;
  return constantReducer;
}

export const combineReducers: <TState>(map: ReducerMap) => Reducer<TState> = reduxCombineReducers;
