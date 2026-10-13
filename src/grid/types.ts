import type { Key, ReactNode } from 'react';
import type { RowRange } from './core/range';

export interface ColumnDef<TRow> {
  /** Stable unique id. Used as the React key for cells. */
  id: string;
  header: ReactNode;
  /** Width in px. */
  width: number;
  cell: (row: TRow, rowIndex: number) => ReactNode;
}

export interface VirtGridProps<TRow> {
  rows: readonly TRow[];
  /**
   * Memoize this array (useMemo or module scope). Rows are memoized and
   * compare `columns` by reference; a new array re-renders every visible row.
   */
  columns: readonly ColumnDef<TRow>[];
  /** Fixed row height in px. */
  rowHeight: number;
  /** Viewport height in px (header included). */
  height: number;
  /** Header height in px. Defaults to rowHeight. */
  headerHeight?: number;
  /** Rows rendered above and below the visible window. Defaults to 5. */
  overscan?: number;
  /** Defaults to the row index. Provide one when rows can be inserted/reordered. */
  getRowKey?: (row: TRow, index: number) => Key;
  /** Fires after the rendered window changes. Memoize it. */
  onRangeChange?: (range: RowRange) => void;
  className?: string;
  'aria-label'?: string;
}
