import { describe, expect, it } from 'vitest';
import { EMPTY_RANGE, getRowRange, isSameRange, type RowRangeInput } from './range';

const base: RowRangeInput = {
  scrollTop: 0,
  viewportHeight: 320, // exactly 10 rows
  rowHeight: 32,
  rowCount: 100_000,
  overscan: 5,
};

describe('getRowRange', () => {
  it('renders the visible rows plus overscan below at the top', () => {
    expect(getRowRange(base)).toEqual({ start: 0, end: 15, offsetTop: 0, totalHeight: 3_200_000 });
  });

  it('adds overscan on both sides in the middle', () => {
    // firstVisible = 100, endVisible = 110
    const r = getRowRange({ ...base, scrollTop: 3200 });
    expect(r).toMatchObject({ start: 95, end: 115, offsetTop: 95 * 32 });
  });

  it('includes a partially visible row', () => {
    // scrolled 10px into row 100: rows 100..110 are (partly) visible
    const r = getRowRange({ ...base, scrollTop: 3210, overscan: 0 });
    expect(r).toMatchObject({ start: 100, end: 111 });
  });

  it('clamps at the bottom', () => {
    const r = getRowRange({ ...base, scrollTop: 3_200_000 - 320 });
    expect(r.end).toBe(100_000);
    expect(r.start).toBe(100_000 - 10 - 5);
  });

  it('clamps a past-the-end scrollTop (elastic overscroll)', () => {
    const atBottom = getRowRange({ ...base, scrollTop: 3_200_000 - 320 });
    expect(getRowRange({ ...base, scrollTop: 9_999_999 })).toEqual(atBottom);
  });

  it('clamps a negative scrollTop (elastic overscroll)', () => {
    expect(getRowRange({ ...base, scrollTop: -50 })).toEqual(getRowRange(base));
  });

  it('renders every row when they fit in the viewport', () => {
    expect(getRowRange({ ...base, rowCount: 3 })).toEqual({ start: 0, end: 3, offsetTop: 0, totalHeight: 96 });
  });

  it('returns an empty range for zero rows', () => {
    expect(getRowRange({ ...base, rowCount: 0 })).toBe(EMPTY_RANGE);
  });

  it('treats negative and fractional overscan safely', () => {
    expect(getRowRange({ ...base, overscan: -3 })).toMatchObject({ start: 0, end: 10 });
    expect(getRowRange({ ...base, overscan: 2.9 })).toMatchObject({ start: 0, end: 12 });
  });

  it('handles a zero-height viewport (not yet measured)', () => {
    const r = getRowRange({ ...base, viewportHeight: 0, scrollTop: 3200 });
    expect(r).toMatchObject({ start: 95, end: 105 });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('throws for rowHeight %s', (rowHeight) => {
    expect(() => getRowRange({ ...base, rowHeight })).toThrow(RangeError);
  });

  it('keeps the rendered row count bounded regardless of rowCount', () => {
    for (const rowCount of [10_000, 100_000, 1_000_000]) {
      const r = getRowRange({ ...base, rowCount, scrollTop: (rowCount * 32) / 2 });
      expect(r.end - r.start).toBeLessThanOrEqual(10 + 1 + 2 * 5);
    }
  });
});

describe('isSameRange', () => {
  it('compares start, end and totalHeight', () => {
    // 3210 → rows 100..110 visible. 3220 still shows the same rows; 3200 would
    // not, since at an exact boundary row 110 is hidden.
    const a = getRowRange({ ...base, scrollTop: 3210 });
    expect(isSameRange(a, getRowRange({ ...base, scrollTop: 3220 }))).toBe(true);
    expect(isSameRange(a, getRowRange({ ...base, scrollTop: 3232 }))).toBe(false);
    expect(isSameRange(a, getRowRange({ ...base, scrollTop: 3200, rowCount: 100_001 }))).toBe(false);
  });
});
