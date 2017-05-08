export type ValidTargetType = number | string | symbol;

export interface Dispatch {
  (action: Action<any, any>): void;
  (thunk: Thunk): Promise<void>;
}

export interface Thunk {
  (dispatch: Dispatch): Promise<void>;
}

export interface Action<TPayload = undefined, TMeta = undefined> {
  type: string;
  payload?: TPayload;
  meta?: TMeta;
}

export interface TargetedAction<TPayload = undefined, TMeta = undefined>
  extends Action<TPayload, TMeta> {
  target?: ValidTargetType | ValidTargetType[];
  broadcast: boolean;
}

export interface ActionDescriptor<TPayload = undefined, TMeta = undefined> {
  type: string;
  create(payload?: TPayload, meta?: TMeta): Action<TPayload, TMeta>;
  is(action: Action<any, any>): action is Action<TPayload, TMeta>;
}

export function createActionDescriptor<TPayload = undefined, TMeta = undefined>(
  type: string,
): ActionDescriptor<TPayload, TMeta> {
  return {
    type,
    create(payload?: TPayload, meta?: TMeta): Action<TPayload, TMeta> {
      return { type, payload, meta };
    },
    is(action: Action<any, any>): action is Action<TPayload, TMeta> {
      return action.type === type;
    },
  };
}

export interface TargetedActionDescriptorCreator<TPayload = undefined, TMeta = undefined> {
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

export interface TargetedActionDescriptor<TPayload = undefined, TMeta = undefined> {
  type: string;
  create: TargetedActionDescriptorCreator<TPayload, TMeta>;
  is(id: ValidTargetType, action: Action<any, any>): action is TargetedAction<TPayload, TMeta>;
}

export function createTargetedActionDescriptor<TPayload = undefined, TMeta = undefined>(
  type: string,
): TargetedActionDescriptor<TPayload, TMeta> {
  return {
    type,
    create: {
      unicast(target: ValidTargetType, payload?: TPayload, meta?: TMeta) {
        return {
          type,
          payload,
          meta,
          target,
          broadcast: false,
        };
      },
      multicast(targets: ValidTargetType[], payload?: TPayload, meta?: TMeta) {
        return {
          type,
          payload,
          meta,
          broadcast: false,
          target: targets,
        };
      },
      broadcast(payload?: TPayload, meta?: TMeta) {
        return {
          type,
          payload,
          meta,
          broadcast: true,
        };
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
