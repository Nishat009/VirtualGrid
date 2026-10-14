import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { MAX_SAFE_SCROLL_HEIGHT } from './core/range';
import { useVirtualRows } from './useVirtualRows';
import type { ColumnDef, VirtGridProps } from './types';
import './VirtGrid.css';

type CSSVars = CSSProperties & Record<`--${string}`, string>;

interface RowProps<TRow> {
  row: TRow;
  rowIndex: number;
  columns: readonly ColumnDef<TRow>[];
  selected: boolean;
  onSelect: (index: number) => void;
}

function RowImpl<TRow>({ row, rowIndex, columns, selected, onSelect }: RowProps<TRow>): ReactNode {
  return (
    // aria-rowindex is 1-based and the header row is 1.
    // Parity comes from the data index, not :nth-child, which would flip
    // every time the window shifts by one row.
    <div
      className={rowIndex % 2 === 1 ? 'vg-row vg-row-alt' : 'vg-row'}
      role="row"
      aria-rowindex={rowIndex + 2}
      aria-selected={selected}
      tabIndex={0}
      onClick={() => onSelect(rowIndex)}
      onKeyDown={event => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelect(rowIndex);
        }
      }}
    >
      {columns.map((col, colIndex) => (
        <div key={col.id} className="vg-cell" role="gridcell" aria-colindex={colIndex + 1}>
          {col.cell(row, rowIndex)}
        </div>
      ))}
    </div>
  );
}

// memo() loses the generic parameter; the cast restores it. Rows that stay in
// the window keep identical props, so only newly entered rows render on scroll.
const Row = memo(RowImpl) as typeof RowImpl;

export function VirtGrid<TRow>({
  rows,
  columns,
  rowHeight,
  height,
  headerHeight = rowHeight,
  overscan = 5,
  getRowKey,
  onRangeChange,
  className,
  'aria-label': ariaLabel,
}: VirtGridProps<TRow>): ReactNode {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const range = useVirtualRows(viewportRef, {
    rowCount: rows.length,
    rowHeight,
    overscan,
    stickyTop: headerHeight,
    initialViewportHeight: height,
  });

  useEffect(() => {
    onRangeChange?.(range);
  }, [range, onRangeChange]);

  useEffect(() => {
    if (import.meta.env.DEV && range.totalHeight > MAX_SAFE_SCROLL_HEIGHT) {
      console.warn(
        `[VirtGrid] Scroll height ${range.totalHeight}px exceeds ${MAX_SAFE_SCROLL_HEIGHT}px. ` +
          'Some browsers (Firefox) will clip the last rows.',
      );
    }
  }, [range.totalHeight]);

  // Column layout is expressed once as CSS variables on the viewport. Cells
  // carry no inline styles, so resizing a column (Phase 2) can update one
  // variable instead of re-rendering every row.
  const style = useMemo<CSSVars>(() => {
    const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
    return {
      height,
      '--vg-row-height': `${rowHeight}px`,
      '--vg-header-height': `${headerHeight}px`,
      '--vg-template': columns.map((col) => `${col.width}px`).join(' '),
      '--vg-total-width': `${totalWidth}px`,
    };
  }, [columns, height, rowHeight, headerHeight]);

  const rendered: ReactNode[] = [];
  for (let i = range.start; i < range.end; i++) {
    const row = rows[i];
    if (row === undefined) continue;
    rendered.push(
      <Row key={getRowKey ? getRowKey(row, i) : i} row={row} rowIndex={i} columns={columns}
        selected={selectedIndex === i} onSelect={setSelectedIndex} />,
    );
  }

  return (
    <div
      ref={viewportRef}
      className={className ? `vg-viewport ${className}` : 'vg-viewport'}
      style={style}
      role="grid"
      aria-label={ariaLabel}
      aria-rowcount={rows.length + 1}
      aria-colcount={columns.length}
    >
      <div className="vg-header" role="rowgroup">
        <div className="vg-row vg-header-row" role="row" aria-rowindex={1}>
          {columns.map((col, colIndex) => (
            <div key={col.id} className="vg-cell" role="columnheader" aria-colindex={colIndex + 1}>
              {col.header}
            </div>
          ))}
        </div>
      </div>
      <div className="vg-body" role="rowgroup" style={{ height: range.totalHeight }}>
        <div className="vg-window" style={{ transform: `translateY(${range.offsetTop}px)` }}>
          {rendered}
        </div>
      </div>
    </div>
  );
}
