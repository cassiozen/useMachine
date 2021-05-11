<p align="center">
<img src="https://user-images.githubusercontent.com/33676/111815108-4695b900-88a9-11eb-8b61-3c45b40d4df6.png" width="250" alt=""/>
</p>

**The ½ kb _state machine_ hook for React:**

- Feature complete (Entry/exit callbacks, Guarded transitions & Extended State - Context)
- Heavy focus on type inference (you get auto completion for both TypeScript & JavaScript users without having to manually define the typings)
- Idiomatic React patterns (Since it's built on top of React's useReducer & useEffect, might as well...)

<img width="400" alt="size_badge" src="https://user-images.githubusercontent.com/33676/116728438-8624ea00-a9ab-11eb-9413-65458c6d54d4.png">

## Examples

- Complex UI (Hiding and showing UI Elements based on the state) - [CodeSandbox](https://codesandbox.io/s/github/cassiozen/usestatemachine/tree/main/examples/timer?file=/index.tsx) - [Source](./examples/timer)
- Async orchestration (Fetch data with limited retry) - [CodeSandbox](https://codesandbox.io/s/github/cassiozen/usestatemachine/tree/main/examples/fetch?file=/index.tsx) - [Source](./examples/fetch)

## Installation

```bash
$ npm install @cassiozen/usestatemachine
```

## Sample Usage

```typescript
const [state, send] = useStateMachine()({
  initial: 'inactive',
  states: {
    inactive: {
      on: { TOGGLE: 'active' },
    },
    active: {
      on: { TOGGLE: 'inactive' },
      effect() {
        console.log('Just entered the Active state');
        // Same cleanup pattern as `useEffect`:
        // If you return a function, it will run when exiting the state.
        return () => console.log('Just Left the Active state');
      },
    },
  },
});

console.log(state); // { value: 'inactive', nextEvents: ['TOGGLE'] }

send('TOGGLE');

// Logs: Just entered the Active state

console.log(state); // { value: 'active', nextEvents: ['TOGGLE'] }
```

## What's up with the double parenthesis?

useStateMachine is a curried function (Yummm tasty!) because TypeScript doesn't yet support [partial generics type inference](https://github.com/microsoft/TypeScript/issues/14400).
This workaround allows TypeScript developers to provide a custom type for the context while still having TypeScript infer all the types used in the configuration (Like the state & transitions names, etc...).

# API

## useStateMachine

```typescript
const [state, send] = useStateMachine(/* Optional Context */)(/* Configuration */);
```

`useStateMachine` takes a JavaScript object as context (optional, see below) and one as the state machine configuration. It returns an array consisting of a `current machine state` object and a `send` function to trigger transitions.

**Machine state**

The `state` consists of three properties: `value`, `nextEvents` and `context`.

`value` returns the name of the current state. `nextEvents` returns an array with the names of available transitions from this state.

**Send events**

`send` takes a transition name as argument. If the transition exists and is allowed (see guard), it will change the state machine state and execute effects.

## State Machine configuration

The configuration object should contain:

- initial: The initial state node this machine should be in
- states: Define each of the possible states:

```typescript
const [state, send] = useStateMachine()({
  initial: 'inactive',
  states: {
    inactive: {},
    active: {},
  },
});
```

### Transition Syntax

For each state, you can define the possible transitions.

Transitions can be configured using a shorthand syntax:

```js
on: {
  TOGGLE: 'active';
}
```

Or the extended, object syntax, which allows for more control over the transition (like adding guards):

```js
on: {
  TOGGLE: {
    target: 'active',
  },
};
```

### Effects (entry/exit callbacks)

Effects are triggered when the state machine enters a given state. If you return a function from your effect, it will be invoked when leaving that state (similarly to how useEffect works in React).

```typescript
const [state, send] = useStateMachine()({
  initial: 'active',
  states: {
    active: {
      on: { TOGGLE: 'inactive' },
      effect() {
        console.log('Just entered the Active state');
        return () => console.log('Just Left the Active state');
      },
    },
  },
});
```

The effect function receives two params: the `send` method (So you can trigger transitions from within an effect) and and updater function, to update the context (more on context below).

In this example, the state machine will always send the "RETRY" event when entering the error state:

```typescript
const [state, send] = useStateMachine()({
  initial: 'loading',
  states: {
    /* Other states here... */
    error: {
      on: {
        RETRY: 'load',
      },
      effect(send) {
        send('RETRY');
      },
    },
  },
});
```

### Guards

You can set up a guard per transition, using the transition object syntax. Guard run before actually running the transition: If the guard returns false the transition will be denied.

```js
const [state, send] = useStateMachine()({
  initial: 'inactive',
  states: {
    inactive: {
      on: {
        TOGGLE: {
          target: 'active',
          guard(context) {
            // Return a boolean to allow or block the transition
          },
        },
      },
    },
    active: {
      on: { TOGGLE: 'inactive' },
    },
  },
});
```

### Extended state (context)

Besides the finite number of states, the state machine can have extended state (known as context).

You can provide the initial context value as the first argument to the State Machine hook, and use the update function within your effects to change the context:

```js
const [state, send] = useStateMachine({ toggleCount: 0 })({
  initial: 'idle',
  states: {
    inactive: {
      on: { TOGGLE: 'active' },
    },
    active: {
      on: { TOGGLE: 'inactive' },
      effect(send, update) {
        update(context => ({ toggleCount: context.toggleCount + 1 }));
      },
    },
  },
});

console.log(state); // { context: { toggleCount: 0 }, value: 'inactive', nextEvents: ['TOGGLE'] }

send('TOGGLE');

console.log(state); // { context: { toggleCount: 1 }, value: 'active', nextEvents: ['TOGGLE'] }
```

The context types are inferred automatically in TypeScript, but you can provide you own typing if you want to be more specific:

```typescript
const [state, send] = useStateMachine<{ toggleCount: number }>({ toggleCount: 0 })({
  initial: 'idle',
  states: {
    inactive: {
      on: { TOGGLE: 'active' },
    },
    active: {
      on: { TOGGLE: 'inactive' },
      effect(send, update) {
        update(context => ({ toggleCount: context.toggleCount + 1 }));
      },
    },
  },
});
```

## Wiki

- [Contributing](https://github.com/cassiozen/useStateMachine/wiki/Contributing-to-useStateMachine)
- [Comparison with XState](https://github.com/cassiozen/useStateMachine/wiki/XState-comparisson)
- [Source code walkthrough video](https://github.com/cassiozen/useStateMachine/wiki/Source-code-walkthrough-video)
