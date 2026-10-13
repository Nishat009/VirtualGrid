import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { VirtGrid } from './VirtGrid';
import type { ColumnDef } from './types';

interface Item {
  id: number;
  name: string;
}

const ROW_HEIGHT = 32;
const HEIGHT = 400; // header 32 → body viewport 368px → 11.5 rows

const makeItems = (n: number): Item[] => Array.from({ length: n }, (_, i) => ({ id: i, name: `Row ${i}` }));

const ITEMS_100K = makeItems(100_000);

function makeColumns(cellSpy?: (index: number) => void): ColumnDef<Item>[] {
  return [
    { id: 'id', header: 'ID', width: 80, cell: (row) => row.id },
    {
      id: 'name',
      header: 'Name',
      width: 200,
      cell: (row, index) => {
        cellSpy?.(index);
        return row.name;
      },
    },
  ];
}

/** jsdom has no layout, so scrollTop has to be faked. */
function scrollGridTo(scrollTop: number) {
  const grid = screen.getByRole('grid');
  Object.defineProperty(grid, 'scrollTop', { configurable: true, value: scrollTop });
  act(() => {
    fireEvent.scroll(grid);
  });
}

function dataRows() {
  // The first row is the header.
  return screen.getAllByRole('row').slice(1);
}

describe('VirtGrid', () => {
  beforeEach(() => {
    // Run rAF callbacks synchronously so scroll updates are deterministic.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders only the visible window plus overscan for 100k rows', () => {
    render(<VirtGrid rows={ITEMS_100K} columns={makeColumns()} rowHeight={ROW_HEIGHT} height={HEIGHT} />);

    // endVisible = ceil(368 / 32) = 12, plus 5 overscan
    expect(dataRows()).toHaveLength(17);
    expect(screen.getByText('Row 0')).toBeInTheDocument();
    expect(screen.queryByText('Row 17')).not.toBeInTheDocument();
  });

  it('sizes the spacer to the full data height', () => {
    render(<VirtGrid rows={ITEMS_100K} columns={makeColumns()} rowHeight={ROW_HEIGHT} height={HEIGHT} />);
    const body = screen.getAllByRole('rowgroup')[1];
    expect(body).toHaveStyle({ height: `${100_000 * ROW_HEIGHT}px` });
  });

  it('exposes ARIA grid counts and indices', () => {
    render(<VirtGrid rows={ITEMS_100K} columns={makeColumns()} rowHeight={ROW_HEIGHT} height={HEIGHT} aria-label="Items" />);
    const grid = screen.getByRole('grid', { name: 'Items' });
    expect(grid).toHaveAttribute('aria-rowcount', '100001');
    expect(grid).toHaveAttribute('aria-colcount', '2');

    const [header] = screen.getAllByRole('row');
    expect(header).toHaveAttribute('aria-rowindex', '1');
    expect(within(header!).getAllByRole('columnheader')).toHaveLength(2);
    expect(dataRows()[0]).toHaveAttribute('aria-rowindex', '2');
  });

  it('moves the window on scroll', () => {
    render(<VirtGrid rows={ITEMS_100K} columns={makeColumns()} rowHeight={ROW_HEIGHT} height={HEIGHT} />);

    scrollGridTo(100 * ROW_HEIGHT);

    // firstVisible 100 → start 95; endVisible ceil((3200 + 368) / 32) = 112 → end 117
    const rows = dataRows();
    expect(rows).toHaveLength(22);
    expect(rows[0]).toHaveAttribute('aria-rowindex', '97');
    expect(rows[0]).toHaveTextContent('Row 95');
    expect(rows.at(-1)).toHaveTextContent('Row 116');
    expect(screen.queryByText('Row 0')).not.toBeInTheDocument();

    const windowEl = rows[0]!.parentElement;
    expect(windowEl).toHaveStyle({ transform: `translateY(${95 * ROW_HEIGHT}px)` });
  });

  it('does not re-render rows when scrolling within the same row band', () => {
    const spy = vi.fn<(index: number) => void>();
    const columns = makeColumns(spy);
    render(<VirtGrid rows={ITEMS_100K} columns={columns} rowHeight={ROW_HEIGHT} height={HEIGHT} />);
    scrollGridTo(3200);
    spy.mockClear();

    scrollGridTo(3210); // 10px: range unchanged

    expect(spy).not.toHaveBeenCalled();
  });

  it('renders only newly entered rows when the window shifts', () => {
    const spy = vi.fn<(index: number) => void>();
    const columns = makeColumns(spy);
    render(<VirtGrid rows={ITEMS_100K} columns={columns} rowHeight={ROW_HEIGHT} height={HEIGHT} />);
    scrollGridTo(3200);
    spy.mockClear();

    scrollGridTo(3200 + ROW_HEIGHT); // shift by exactly one row

    expect(spy.mock.calls).toEqual([[117]]);
  });

  it('keeps zebra striping tied to the data index', () => {
    render(<VirtGrid rows={ITEMS_100K} columns={makeColumns()} rowHeight={ROW_HEIGHT} height={HEIGHT} />);
    scrollGridTo(3200 + ROW_HEIGHT); // start = 96 (even)
    const [first, second] = dataRows();
    expect(first).not.toHaveClass('vg-row-alt');
    expect(second).toHaveClass('vg-row-alt');
  });

  it('recomputes when the row count shrinks', () => {
    const columns = makeColumns();
    const { rerender } = render(<VirtGrid rows={ITEMS_100K} columns={columns} rowHeight={ROW_HEIGHT} height={HEIGHT} />);
    rerender(<VirtGrid rows={makeItems(3)} columns={columns} rowHeight={ROW_HEIGHT} height={HEIGHT} />);
    expect(dataRows()).toHaveLength(3);
  });

  it('renders an empty grid', () => {
    render(<VirtGrid rows={[]} columns={makeColumns()} rowHeight={ROW_HEIGHT} height={HEIGHT} />);
    expect(dataRows()).toHaveLength(0);
    expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount', '1');
  });

  it('reports range changes', () => {
    const onRangeChange = vi.fn();
    render(
      <VirtGrid rows={ITEMS_100K} columns={makeColumns()} rowHeight={ROW_HEIGHT} height={HEIGHT} onRangeChange={onRangeChange} />,
    );
    expect(onRangeChange).toHaveBeenLastCalledWith(expect.objectContaining({ start: 0, end: 17 }));
    scrollGridTo(3200);
    expect(onRangeChange).toHaveBeenLastCalledWith(expect.objectContaining({ start: 95, end: 117 }));
  });
});
