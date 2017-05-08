import { Action } from './action';

export interface Reducer<T> {
  (state: T | undefined, action: Action<any, any>): T;
}

export interface Reducible<T extends object = {}> {
  reduce(action: Action<any, any>): T & Reducible<T & this>;
}

export type Reducibles<T extends object = any> = {
  [P in keyof T]: Reducible<T[P]>;
};

export interface ParametricReducibleFactory<D, T extends Reducibles> {
  data: D;
  type: T & Reducible<T>;
  buildReducer: (data: D) => Reducer<T>;
  (data: D): T & Reducible<T>;
}

export interface ReducibleFactory<T extends Reducibles> {
  type: T & Reducible<T>;
  buildReducer: () => Reducer<T>;
  (): T & Reducible<T>;
}

export function buildReducibleFactory<T extends Reducibles = object>(
  builder: () => T,
): ReducibleFactory<T>;
export function buildReducibleFactory<D = any, T extends Reducibles = object>(
  builder: (data: D) => T,
): ParametricReducibleFactory<D, T>;
export function buildReducibleFactory<D = undefined, T extends Reducibles = object>(
  builder: (data: D | undefined) => T,
): ParametricReducibleFactory<D, T> | ReducibleFactory<T> {

  const factory = <ParametricReducibleFactory<D, T>>function reducibleFactory(data) {
    let previousReducibleMap = <T & Reducible<T>>builder(data);

    const properties = <(keyof T)[]>Object.keys(previousReducibleMap);

    function reduce(action: Action<any, any>): T & Reducible<T> {
      const newReducibleMap = <T & Reducible<T>>{};
      let modified = false;

      for (const property of properties) {
        const newReducible = (<Reducible<T>>previousReducibleMap[property]).reduce(action);
        if (newReducible !== previousReducibleMap[property]) {
          modified = true;
        }
        newReducibleMap[property] = newReducible;
      }

      if (modified) {
        newReducibleMap.reduce = reduce;
        previousReducibleMap = newReducibleMap;
      }

      return previousReducibleMap;
    }

    previousReducibleMap.reduce = reduce;

    return previousReducibleMap;
  };

  factory.buildReducer = function buildReducer(data: D): Reducer<T> {
    const reducible = factory(data);

    return (state, action) => (state || reducible).reduce(action);
  };

  return factory;
}
