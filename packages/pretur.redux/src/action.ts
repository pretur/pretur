export type Target = number | string | symbol;

export interface Dispatch {
  (action: Action<any>): void;
}

export interface Action<TPayload = {}> {
  type: string;
  payload?: TPayload;
}

export interface HomingAction<TPayload = {}> extends Action<TPayload> {
  target?: Target | Target[];
  broadcast?: boolean;
}

export interface HomingActionDefinition<TPayload = {}> {
  type: string;
  create: {
    unicast(target: Target, payload?: TPayload): HomingAction<TPayload>;
    multicast(targets: Target[], payload?: TPayload): HomingAction<TPayload>;
    broadcast(payload?: TPayload): HomingAction<TPayload>;
  };
  is(id: Target, action: Action<any>): action is HomingAction<TPayload>;
}

export function createHomingAction<TPayload = {}>(type: string): HomingActionDefinition<TPayload> {
  return {
    create: {
      unicast(target: Target, payload?: TPayload) {
        return { payload, target, type };
      },
      multicast(targets: Target[], payload?: TPayload) {
        return { payload, target: targets, type };
      },
      broadcast: (payload?: TPayload) => ({ broadcast: true, payload, type }),
    },
    is(id: Target, action: Action<any>): action is HomingAction<TPayload> {
      if (action.type !== type) {
        return false;
      }

      const targeted = <HomingAction<TPayload>>action;
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
