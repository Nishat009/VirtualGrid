import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { getRowRange, isSameRange, type RowRange } from './core/range';
import { rafThrottle } from './core/rafThrottle';

export interface UseVirtualRowsOptions {
  rowCount: number;
  rowHeight: number;
  overscan: number;
  /** Height in px covered by sticky content at the top of the viewport (the header). */
  stickyTop: number;
  /** Used until the viewport is measured, and in environments without layout (jsdom/SSR). */
  initialViewportHeight: number;
}

/**
 * Tracks the scroll container and returns the row window to render.
 *
 * scrollTop and viewport height live in refs, not state: they change every
 * frame, but the component only needs to re-render when the *range* changes.
 * Scrolling inside the same row band is therefore zero React work.
 */
export function useVirtualRows<E extends HTMLElement>(
  containerRef: RefObject<E | null>,
  { rowCount, rowHeight, overscan, stickyTop, initialViewportHeight }: UseVirtualRowsOptions,
): RowRange {
  const scrollTopRef = useRef(0);
  const viewportHeightRef = useRef(initialViewportHeight);

  const compute = useCallback(
    (): RowRange =>
      getRowRange({
        scrollTop: scrollTopRef.current,
        viewportHeight: viewportHeightRef.current - stickyTop,
        rowHeight,
        rowCount,
        overscan,
      }),
    [rowCount, rowHeight, overscan, stickyTop],
  );

  const [range, setRange] = useState<RowRange>(compute);

  const update = useCallback(() => {
    const next = compute();
    // Returning the previous object bails out of the re-render.
    setRange((prev) => (isSameRange(prev, next) ? prev : next));
  }, [compute]);

  // Layout effect so the first paint already shows the correct window (no flash).
  // Re-runs when inputs change (e.g. rowCount), re-syncing from the live DOM.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // One synchronous read at mount/prop change. Nothing has been written to
    // the DOM yet in this effect, so this doesn't force an extra reflow cycle.
    scrollTopRef.current = el.scrollTop;
    if (el.clientHeight > 0) viewportHeightRef.current = el.clientHeight;
    update();

    // Read scrollTop inside the rAF callback, not in the event handler:
    // all reads happen once per frame, right before React writes.
    const onScroll = rafThrottle(() => {
      scrollTopRef.current = el.scrollTop;
      update();
    });
    el.addEventListener('scroll', onScroll, { passive: true });

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        // clientHeight excludes a horizontal scrollbar, contentRect doesn't always.
        const height = el.clientHeight;
        if (height > 0 && height !== viewportHeightRef.current) {
          viewportHeightRef.current = height;
          update();
        }
      });
      observer.observe(el);
    }

    return () => {
      el.removeEventListener('scroll', onScroll);
      onScroll.cancel();
      observer?.disconnect();
    };
  }, [containerRef, update]);

  return range;
}
