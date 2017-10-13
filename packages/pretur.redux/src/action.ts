export type Target = number | string | symbol;

export interface Dispatch {
  (action: Action<any>): void;
}

export interface Action<TPayload = {}> {
  type: string;
  payload?: TPayload;
}

export interface TargetedAction<TPayload = {}> extends Action<TPayload> {
  target?: Target | Target[];
  broadcast: boolean;
}

export interface ActionDescriptorCreator<TPayload = {}> {
  unicast(target: Target, payload?: TPayload): TargetedAction<TPayload>;
  multicast(targets: Target[], payload?: TPayload): TargetedAction<TPayload>;
  broadcast(payload?: TPayload): TargetedAction<TPayload>;
}

export interface ActionDescriptor<TPayload = {}> {
  type: string;
  create: ActionDescriptorCreator<TPayload>;
  is(id: Target, action: Action<any>): action is TargetedAction<TPayload>;
}

export function createActionDescriptor<TPayload = {}>(
  type: string,
): ActionDescriptor<TPayload> {
  return {
    create: {
      unicast(target: Target, payload?: TPayload) {
        return {
          broadcast: false,
          payload,
          target,
          type,
        };
      },
      multicast(targets: Target[], payload?: TPayload) {
        return {
          broadcast: false,
          payload,
          target: targets,
          type,
        };
      },
      broadcast: (payload?: TPayload) => ({ broadcast: true, payload, type }),
    },
    is(id: Target, action: Action<any>): action is TargetedAction<TPayload> {
      if (action.type !== type) {
        return false;
      }

      const targeted = <TargetedAction<TPayload>>action;
      if (targeted.broadcast) {
        return true;
      }

      if (Array.isArray(targeted.target)) {
        return (<Target[]>targeted.target).indexOf(id) !== -1;
      }

      return targeted.target === id;
    },
    type,
  };
}
