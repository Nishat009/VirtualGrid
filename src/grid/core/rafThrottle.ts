export interface RafThrottled<A extends unknown[]> {
  (...args: A): void;
  /** Drop any pending frame. Call on unmount. */
  cancel: () => void;
}

/**
 * Coalesces calls into at most one per animation frame, invoking `fn` with
 * the arguments from the latest call. Scroll events can fire several times
 * per frame; doing work more often than the browser paints is wasted.
 */
export function rafThrottle<A extends unknown[]>(fn: (...args: A) => void): RafThrottled<A> {
  let frame: number | null = null;
  // Gate on a flag set *before* scheduling, not on `frame`: if the callback
  // ever runs synchronously (test stubs, some polyfills) it would clear
  // `frame` before the id is assigned and leave the throttle stuck forever.
  let pending = false;
  let latestArgs: A | null = null;

  const throttled = (...args: A): void => {
    latestArgs = args;
    if (pending) return;
    pending = true;
    frame = requestAnimationFrame(() => {
      pending = false;
      frame = null;
      const callArgs = latestArgs;
      latestArgs = null;
      if (callArgs) fn(...callArgs);
    });
  };

  throttled.cancel = (): void => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    pending = false;
    latestArgs = null;
  };

  return throttled;
}
