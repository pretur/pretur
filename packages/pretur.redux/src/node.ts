import { Action } from './action';

export type Reducer<S> = (state: S | undefined, action: Action<any>) => S;

export type Reducible<T extends Reducible<any>> = T & {
  reduce(action: Action<any>): Reducible<T>;
};

export type ReducibleMap<T extends object = any> = {
  [P in keyof T]: Reducible<T[P]>;
};

export interface ReducibleNode<T extends ReducibleMap> {
  type: Reducible<T>;
  (): Reducible<T>;
}

export function buildNode<T extends ReducibleMap>(builder: () => T): ReducibleNode<T> {
  return <ReducibleNode<T>>function node() {
    let previousState = <T & Reducible<T>>builder();

    const properties = <(keyof T)[]>Object.keys(previousState);

    function reduce(action: Action<any>): T & Reducible<T> {
      const nextState = <T & Reducible<T>>{};
      let modified = false;

      for (const property of properties) {
        const newReducible = (<Reducible<T>>previousState[property]).reduce(action);
        if (newReducible !== previousState[property]) {
          modified = true;
        }
        nextState[property] = newReducible;
      }

      if (modified) {
        nextState.reduce = reduce;
        previousState = nextState;
      }

      return previousState;
    }

    previousState.reduce = reduce;

    return previousState;
  };
}

export function toReducer<T extends ReducibleMap>(node: ReducibleNode<T>): Reducer<T> {
  const reducible = node();

  return (state, action) => (state || reducible).reduce(action);
}
