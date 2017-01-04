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

export interface Setter<TState> {
  <K extends keyof TState>(prop: K, value: TState[K]): void;
}

export interface Unsetter<TState> {
  (prop: keyof TState): void;
}

export interface Resetter<TState> {
  (state?: TState): void;
}

export interface Mutator<TState> {
  (
    state: TState,
    action: Action<any, any>,
    set: Setter<TState>,
    unset: Unsetter<TState>,
    reset: Resetter<TState>
  ): void;
}

const hasOwn = Object.prototype.hasOwnProperty;

export function createMutatorReducer<TState, TProps extends keyof TState>(
  initialState: TState,
  mutator: Mutator<TState>,
): Reducer<TState> {
  return function reducer(state = initialState, action: Action<any, any>) {
    let modified = false;

    let set: TState | undefined = undefined!;
    let unset: TProps[] | undefined = <any>undefined;
    let reset: TState | undefined = undefined;

    function setter<TProps extends keyof TState>(prop: TProps, value: TState[TProps]) {
      if (value !== state![prop]) {
        modified = true;
        if (!set) {
          set = <TState>{};
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

    function unsetter(prop: TProps) {
      if (hasOwn.call(state, prop)) {
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

    mutator(state!, action, setter, unsetter, resetter);

    if (!modified) {
      return state!;
    }

    if (reset) {
      return reset;
    }

    const next = assign<TState>({}, state, set);

    if (Array.isArray(unset)) {
      unset.forEach(prop => delete next[prop]);
    }

    return next;
  };
}

export function createAutoReducer<TState extends AutoReducibleState>(
  initialState: TState,
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

export interface ReducibleMap {
  [name: string]: Reducible;
}

export type EnhancedReducibleState<T> = EnhancedReducible<T> & T;

export interface EnhancedReducible<T> {
  reduce(action: Action<any, any>): EnhancedReducibleState<T>;
}

export function createReducibleMap<T extends ReducibleMap>(map: T): EnhancedReducibleState<T> {
  const properties = Object.keys(map);

  let previousReducibleMap = assign<EnhancedReducibleState<T>>({}, map);
  const reduce = function reduce(action: Action<any, any>): EnhancedReducibleState<T> {
    let modified = false;
    const newReducibleMap = <EnhancedReducibleState<T>>{};

    properties.forEach(property => {
      const newReducible = previousReducibleMap[property].reduce(action);
      if (newReducible !== previousReducibleMap[property]) {
        modified = true;
      }
      newReducibleMap[property] = newReducible;
    });

    if (modified) {
      newReducibleMap.reduce = reduce;
      previousReducibleMap = newReducibleMap;
    }

    return previousReducibleMap;
  };

  previousReducibleMap.reduce = reduce;

  return previousReducibleMap;
}

export const combineReducers: <TState>(map: ReducerMap) => Reducer<TState> = reduxCombineReducers;
