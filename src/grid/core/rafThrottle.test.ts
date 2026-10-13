import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rafThrottle } from './rafThrottle';

describe('rafThrottle', () => {
  let callbacks: Map<number, FrameRequestCallback>;
  let nextId: number;

  const flushFrame = () => {
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach((cb) => cb(performance.now()));
  };

  beforeEach(() => {
    callbacks = new Map();
    nextId = 1;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      const id = nextId++;
      callbacks.set(id, cb);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      callbacks.delete(id);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('runs once per frame with the latest arguments', () => {
    const fn = vi.fn<(n: number) => void>();
    const throttled = rafThrottle(fn);

    throttled(1);
    throttled(2);
    throttled(3);
    expect(fn).not.toHaveBeenCalled();
    expect(callbacks.size).toBe(1);

    flushFrame();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it('schedules a new frame after the previous one ran', () => {
    const fn = vi.fn<(n: number) => void>();
    const throttled = rafThrottle(fn);

    throttled(1);
    flushFrame();
    throttled(2);
    flushFrame();

    expect(fn.mock.calls).toEqual([[1], [2]]);
  });

  it('keeps working when rAF runs its callback synchronously', () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    const fn = vi.fn<(n: number) => void>();
    const throttled = rafThrottle(fn);

    throttled(1);
    throttled(2);

    expect(fn.mock.calls).toEqual([[1], [2]]);
  });

  it('cancel() drops the pending call', () => {
    const fn = vi.fn<() => void>();
    const throttled = rafThrottle(fn);

    throttled();
    throttled.cancel();
    flushFrame();

    expect(fn).not.toHaveBeenCalled();
    expect(callbacks.size).toBe(0);
  });
});
