/**
 * A minimal, framework-free state container: get, set, subscribe.
 * This is the entire "architecture" — no Redux, no signals library,
 * just a closure holding state and a Set of listener functions.
 */
export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState() {
      return state;
    },
    setState(partial) {
      state = typeof partial === "function" ? partial(state) : { ...state, ...partial };
      listeners.forEach((fn) => fn(state));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
