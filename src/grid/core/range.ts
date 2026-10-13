/**
 * Pure layout math for fixed-height row virtualization.
 * No DOM, no React: everything here is deterministic and unit-testable.
 */

export interface RowRangeInput {
  /** Body scroll offset in px (container.scrollTop). */
  scrollTop: number;
  /** Visible body height in px (viewport height minus sticky header). */
  viewportHeight: number;
  /** Fixed height of every row in px. Must be > 0. */
  rowHeight: number;
  rowCount: number;
  /** Extra rows rendered above and below the visible window. */
  overscan: number;
}

export interface RowRange {
  /** First rendered row index (inclusive, overscan included). */
  start: number;
  /** Last rendered row index (exclusive, overscan included). */
  end: number;
  /** translateY in px for the first rendered row. */
  offsetTop: number;
  /** Full height of the scrollable body in px. */
  totalHeight: number;
}

export const EMPTY_RANGE: RowRange = { start: 0, end: 0, offsetTop: 0, totalHeight: 0 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getRowRange(input: RowRangeInput): RowRange {
  const { rowHeight, rowCount } = input;
  if (!(rowHeight > 0) || !Number.isFinite(rowHeight)) {
    throw new RangeError(`rowHeight must be a positive finite number, got ${rowHeight}`);
  }
  if (rowCount <= 0) return EMPTY_RANGE;

  const totalHeight = rowCount * rowHeight;
  const overscan = Math.max(0, Math.floor(input.overscan));
  const viewportHeight = Math.max(0, input.viewportHeight);

  // Elastic overscroll (macOS/iOS) can report a negative or past-the-end
  // scrollTop for a few frames; clamping keeps the window stable.
  const maxScrollTop = Math.max(0, totalHeight - viewportHeight);
  const scrollTop = clamp(input.scrollTop, 0, maxScrollTop);

  const firstVisible = Math.floor(scrollTop / rowHeight);
  const endVisible = Math.ceil((scrollTop + viewportHeight) / rowHeight);

  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(rowCount, endVisible + overscan);

  return { start, end, offsetTop: start * rowHeight, totalHeight };
}

/** offsetTop is derived from start, so it doesn't need comparing. */
export function isSameRange(a: RowRange, b: RowRange): boolean {
  return a.start === b.start && a.end === b.end && a.totalHeight === b.totalHeight;
}

/**
 * Browsers cap element height (Firefox ~17.9M px, Chrome ~33.5M px).
 * Beyond this the spacer gets truncated and the last rows become unreachable.
 */
export const MAX_SAFE_SCROLL_HEIGHT = 15_000_000;
