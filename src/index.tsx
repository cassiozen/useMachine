import { useEffect, useReducer, Dispatch, useRef } from 'react';

type Transition =
  | string
  | {
      target: string;
      guard?: (state: string, event: string) => boolean;
    };

type KeysOfTransition<Obj> = Obj extends Record<PropertyKey, Transition> ? keyof Obj : never;

interface BaseStateConfig {
  on?: {
    [key: string]: Transition;
  };
}

interface BaseConfig {
  initial: string;
  states: {
    [key: string]: BaseStateConfig;
  };
}

type TransitionEvent<T extends Record<PropertyKey, BaseStateConfig>> = T[keyof T]['on'];

type ContextUpdater<C> = (updater: (context: C) => C) => void;

interface MachineStateConfig<C> extends BaseStateConfig {
  effect?: (assign: ContextUpdater<C>) => void | ((assign: ContextUpdater<C>) => void);
}

interface MachineConfig<C> {
  initial: string;
  states: {
    [key: string]: MachineStateConfig<C>;
  };
}

const __contextKey = Symbol('CONTEXT');

const getReducer = <
  Context extends Record<PropertyKey, any>,
  Config extends BaseConfig,
  State extends keyof Config['states'],
  Event extends KeysOfTransition<TransitionEvent<Config['states']>>
>(
  config: Config
) =>
  function reducer(
    state: {
      value: State;
      context: Context;
      nextEvents: Event[];
    },
    event: Event | { type: typeof __contextKey; updater: (context: Context) => Context }
  ) {
    type IndexableState = keyof typeof config.states;
    const currentState = config.states[state.value as IndexableState];
    const nextState = currentState?.on?.[event as IndexableState];

    // Internal action to update context
    if (typeof event === 'object' && event.type === __contextKey) {
      return {
        ...state,
        context: event.updater(state.context),
      };
    }

    // If there is no defined next state, return early
    if (!nextState) return state;

    const nextStateValue = typeof nextState === 'string' ? nextState : nextState.target;

    // If there are guards, invoke them and return early if the transition is denied
    if (typeof nextState === 'object' && nextState.guard && !nextState.guard(state.value as string, event as string)) {
      return state;
    }

    return {
      ...state,
      value: nextStateValue as State,
      nextEvents: Object.keys(config.states[nextStateValue].on ?? []) as Event[],
    };
  };

const useConstant = <T,>(init: () => T) => {
  const ref = useRef<T | null>(null);

  if (ref.current === null) {
    ref.current = init();
  }
  return ref.current;
};

export default function useStateMachine<Context extends Record<PropertyKey, any>>(context?: Context) {
  return function useStateMachineWithContext<Config extends MachineConfig<Context>>(config: Config) {
    type IndexableState = keyof typeof config.states;
    type State = keyof Config['states'];
    type Event = KeysOfTransition<TransitionEvent<Config['states']>>;

    const initialState = useConstant(() => ({
      value: config.initial as State,
      context: context ?? ({} as Context),
      nextEvents: Object.keys(config.states[config.initial].on ?? []) as Event[],
    }));

    const reducer = useConstant(() => getReducer<Context, Config, State, Event>(config));

    const [machine, send] = useReducer(reducer, initialState);

    // The updater function sends an internal event to the reducer to trigger the actual update
    const update = (updater: (context: Context) => Context) => send({ type: __contextKey, updater });

    useEffect(() => {
      const exit = config.states[machine.value as IndexableState]?.effect?.(update);
      return typeof exit === 'function' ? exit.bind(null, update) : void 0;
    }, [machine.value]);

    return [machine, send] as [
      {
        value: State;
        context: Context;
        nextEvents: Event[];
      },
      Dispatch<Event>
    ];
  };
}
