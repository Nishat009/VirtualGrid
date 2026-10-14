import { useCallback, useMemo, useRef, useState } from 'react';
import { VirtGrid, type ColumnDef, type RowRange } from '../grid';
import { makeRows, type Person } from './makeRows';

const SIZES = [10_000, 100_000, 1_000_000] as const;
type Size = (typeof SIZES)[number];

const ROW_HEIGHT = 32;
const GRID_HEIGHT = 600;

const salaryFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// Module scope = stable reference, so memoized rows never re-render because of columns.
const COLUMNS: readonly ColumnDef<Person>[] = [
  { id: 'id', header: '#', width: 90, cell: (p) => p.id.toLocaleString() },
  { id: 'firstName', header: 'First name', width: 130, cell: (p) => p.firstName },
  { id: 'lastName', header: 'Last name', width: 130, cell: (p) => p.lastName },
  { id: 'email', header: 'Email', width: 280, cell: (p) => p.email },
  { id: 'age', header: 'Age', width: 70, cell: (p) => p.age },
  { id: 'city', header: 'City', width: 130, cell: (p) => p.city },
  { id: 'salary', header: 'Salary', width: 120, cell: (p) => salaryFormat.format(p.salary) },
  { id: 'joined', header: 'Joined', width: 120, cell: (p) => p.joined },
];

function formatSize(n: number): string {
  return n >= 1_000_000 ? `${n / 1_000_000}M` : `${n / 1_000}k`;
}

export function App() {
  const [size, setSize] = useState<Size>(100_000);
  const [range, setRange] = useState<RowRange | null>(null);
  const [domNodes, setDomNodes] = useState(0);
  const [feedback, setFeedback] = useState({ text: 'Choose a dataset or use Top / Bottom to navigate.', count: 0 });
  const notify = (text: string) => setFeedback(previous => ({ text, count: previous.count + 1 }));
  const gridWrapRef = useRef<HTMLDivElement>(null);

  const { rows, genMs } = useMemo(() => {
    const t0 = performance.now();
    const generated = makeRows(size);
    return { rows: generated, genMs: performance.now() - t0 };
  }, [size]);

  const handleRangeChange = useCallback((next: RowRange) => {
    setRange(next);
    setDomNodes(gridWrapRef.current?.getElementsByTagName('*').length ?? 0);
  }, []);

  const scrollTo = (where: 'top' | 'bottom') => {
    const viewport = gridWrapRef.current?.querySelector('[role="grid"]');
    viewport?.scrollTo({ top: where === 'top' ? 0 : viewport.scrollHeight });
    notify(where === 'top' ? 'Moved to the first row.' : `Moved to the last row (${size.toLocaleString()}).`);
  };

  return (
    <main className="mx-auto max-w-6xl p-4 font-sans text-zinc-900 dark:text-zinc-100">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">VirtGrid</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Phase 1: fixed-height row virtualization, no table libraries.
        </p>
      </header>

      <div className="demo-controls mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Rows:</span>
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setSize(s);
              notify(`${s.toLocaleString()} rows selected.`);
            }}
            aria-pressed={size === s}
            className="rounded border border-zinc-300 px-3 py-1 text-sm aria-pressed:bg-zinc-900 aria-pressed:text-white dark:border-zinc-600 dark:aria-pressed:bg-zinc-100 dark:aria-pressed:text-zinc-900"
          >
            {formatSize(s)}
          </button>
        ))}
        <span className="mx-2 h-5 w-px bg-zinc-300 dark:bg-zinc-600" />
        <button type="button" onClick={() => scrollTo('top')} className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-600">
          Top
        </button>
        <button type="button" onClick={() => scrollTo('bottom')} className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-600">
          Bottom
        </button>
      </div>

      <p key={feedback.count} role="status" className="demo-feedback mb-3 text-sm">
        {feedback.text}
      </p>

      <dl className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
        <Stat label="Total rows" value={size.toLocaleString()} />
        <Stat label="Data generation" value={`${genMs.toFixed(0)} ms`} />
        <Stat label="Rendered serials (with buffer)" value={range ? `${(range.start + 1).toLocaleString()} – ${range.end.toLocaleString()}` : '–'} />
        <Stat label="Rows in DOM" value={range ? String(range.end - range.start) : '–'} />
        <Stat label="Grid DOM nodes" value={String(domNodes)} />
      </dl>

      <div ref={gridWrapRef}>
        <VirtGrid
          key={size}
          rows={rows}
          columns={COLUMNS}
          rowHeight={ROW_HEIGHT}
          height={GRID_HEIGHT}
          getRowKey={(p) => p.id}
          onRangeChange={handleRangeChange}
          aria-label="People"
        />
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-200 px-3 py-2 dark:border-zinc-700">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}
