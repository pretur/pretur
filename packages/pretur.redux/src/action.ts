import * as Bluebird from 'bluebird';

export type ValidTargetType = number | string | symbol;

export interface Dispatch {
  (action: Action<any, any>): void;
  (thunk: Thunk): Bluebird<void>;
}

export interface Thunk {
  (dispatch: Dispatch): Bluebird<void>;
}

export interface Action<TPayload, TMeta> {
  type: string;
  payload?: TPayload;
  meta?: TMeta;
}

export interface ActionTransformer {
  <A extends Action<any, any>>(action: A): A;
}

export interface TargetedAction<TPayload, TMeta> extends Action<TPayload, TMeta> {
  target?: ValidTargetType | ValidTargetType[];
  broadcast: boolean;
}

export interface ActionDescriptor<TPayload, TMeta> {
  type: string;
  create(payload?: TPayload, meta?: TMeta): Action<TPayload, TMeta>;
  is(action: Action<any, any>): action is Action<TPayload, TMeta>;
}

const TRANSFORMER_ERROR = 'The provided transformer is not a function';

export function composeTransformers<A extends Action<any, any>>(
  transformers?: ActionTransformer | ActionTransformer[],
): ActionTransformer {
  if (!transformers) {
    return (action: A) => action;
  }

  if (Array.isArray(transformers)) {

    transformers.forEach(t => {
      if (typeof t !== 'function') {
        throw new TypeError(TRANSFORMER_ERROR);
      }
    });

    if (transformers.length === 0) {
      return (action: A) => action;
    }

    if (transformers.length === 1) {
      return transformers[0];
    }

    return (action: A) => transformers.reduce((prev, curr) => curr(prev), action);
  }

  if (typeof transformers === 'function') {
    return transformers;
  }

  throw new TypeError(TRANSFORMER_ERROR);
}

export function createActionDescriptor<TPayload, TMeta>(
  type: string,
  transformers?: ActionTransformer | ActionTransformer[],
): ActionDescriptor<TPayload, TMeta> {
  const transform = composeTransformers(transformers);
  return {
    type,
    create(payload?: TPayload, meta?: TMeta): Action<TPayload, TMeta> {
      return transform({
        type,
        payload,
        meta,
      });
    },
    is(action: Action<any, any>): action is Action<TPayload, TMeta> {
      return action.type === type;
    },
  };
}

export interface TargetedActionDescriptorCreator<TPayload, TMeta> {
  unicast(
    target: ValidTargetType,
    payload?: TPayload,
    meta?: TMeta,
  ): TargetedAction<TPayload, TMeta>;
  multicast(
    targets: ValidTargetType[],
    payload?: TPayload,
    meta?: TMeta,
  ): TargetedAction<TPayload, TMeta>;
  broadcast(payload?: TPayload, meta?: TMeta): TargetedAction<TPayload, TMeta>;
}

export interface TargetedActionDescriptor<TPayload, TMeta> {
  type: string;
  create: TargetedActionDescriptorCreator<TPayload, TMeta>;
  is(id: ValidTargetType, action: Action<any, any>): action is TargetedAction<TPayload, TMeta>;
}

export function createTargetedActionDescriptor<TPayload, TMeta>(
  type: string,
  transformers?: ActionTransformer | ActionTransformer[],
): TargetedActionDescriptor<TPayload, TMeta> {
  const transform = composeTransformers(transformers);
  return {
    type,
    create: {
      unicast(target: ValidTargetType, payload?: TPayload, meta?: TMeta) {
        return transform({
          type,
          payload,
          meta,
          target,
          broadcast: false,
        });
      },
      multicast(targets: ValidTargetType[], payload?: TPayload, meta?: TMeta) {
        return transform({
          type,
          payload,
          meta,
          broadcast: false,
          target: targets,
        });
      },
      broadcast(payload?: TPayload, meta?: TMeta) {
        return transform({
          type,
          payload,
          meta,
          broadcast: true,
        });
      },
    },
    is(id: ValidTargetType, action: Action<any, any>): action is TargetedAction<TPayload, TMeta> {
      if (action.type !== type) {
        return false;
      }

      const targeted = <TargetedAction<TPayload, TMeta>>action;
      if (targeted.broadcast) {
        return true;
      }

      if (Array.isArray(targeted.target)) {
        return (<ValidTargetType[]>targeted.target).indexOf(id) !== -1;
      }

      return targeted.target === id;
    },
  };
}

export interface AsyncActionDescriptor<TPayload> {
  create: (payload?: TPayload, meta?: any) => Thunk;
}

export function createAsyncAction<TPayload, TResult>(
  resolve: (data?: TPayload) => Bluebird<TResult>,
  success: ActionDescriptor<TResult, any>,
  fail?: ActionDescriptor<any, any>,
  attempt?: ActionDescriptor<TPayload, any>,
): AsyncActionDescriptor<TPayload> {
  return {
    create: (payload, meta) => dispatch => {

      if (attempt) {
        dispatch(attempt.create(payload, meta));
      }

      const promise = resolve(payload).then(result => dispatch(success.create(result, meta)));

      if (fail) {
        promise.catch(error => dispatch(fail.create(error, meta)));
      }

      return promise;
    },
  };
}

export function hook(dispatch: Dispatch, ...transformers: ActionTransformer[]): Dispatch {
  const transform = composeTransformers(transformers);
  return <Dispatch>((action: Action<any, any>) => {
    if (typeof action === 'function') {
      throw new TypeError('cannot hook into thunks');
    }
    if (!action) {
      throw new TypeError('invalid action provided to hook into');
    }
    dispatch(transform(action));
  });
}
