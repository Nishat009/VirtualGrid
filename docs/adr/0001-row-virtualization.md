# ADR 0001: Fixed-height row virtualization

Status: Accepted (Phase 1)

## Context

The grid has to scroll 100k+ rows at 60fps while keeping fewer than 300 DOM nodes.
Rendering every row is not an option: 100k rows × 8 cells is about 900k nodes.

## Decision

1. **Spacer + translated window.** One scroll container. Inside it, a body element
   whose height is `rowCount × rowHeight` produces the real native scrollbar. The
   rendered rows sit in a single "window" element moved with `transform: translateY(start × rowHeight)`.
2. **Pure range math** (`core/range.ts`) computes `[start, end)` from `scrollTop`,
   viewport height, row height and overscan. It has no DOM or React dependency.
3. **Scroll position lives in refs, range lives in state.** A rAF-throttled, passive
   scroll listener reads `scrollTop` once per frame. React state changes only when
   `start`/`end` change.
4. **Memoized rows with stable props.** Rows that stay inside the window are not
   re-rendered, so a one-row scroll renders exactly one new row.
5. **Column layout as CSS variables** (`grid-template-columns: var(--vg-template)`)
   set once on the viewport, so cells carry no inline styles.
6. **Sticky header inside the scroll container** keeps horizontal scroll in sync with
   no JS. The visible body height is `clientHeight − headerHeight`.

## Alternatives considered

| Option | Why not (for now) |
|---|---|
| Absolutely position each row (`top: i × h`) | Every row carries its own style; when the window shifts, more props change and more reconciliation is needed. Easier for variable heights, so revisit in Phase 5. |
| Fake scrollbar (wheel events + custom thumb) | Avoids the browser height cap, but breaks native scrolling physics, scrollbar a11y and find-in-page. |
| `content-visibility: auto` on all rows | Still creates every DOM node; memory and initial render grow with rowCount. |
| Throttle with `setTimeout`/lodash | Not aligned to frames, so updates can land mid-frame or get dropped. |

## Consequences / trade-offs

- **Browser max element height.** Firefox caps at about 17.9M px and Chrome at about 33.5M px.
  1M rows × 32px = 32M px works in Chrome but gets clipped in Firefox. The grid warns in dev
  above 15M px. Fix later with scroll scaling (map a virtual offset to a capped physical one).
- **Blank flash on very fast scroll.** The browser scrolls on the compositor thread before JS
  runs, so a fling can show empty space for a frame. Overscan (default 5) hides most of it.
  Larger overscan costs more DOM. Direction-aware overscan is a possible improvement.
- **Consumers must memoize `columns`.** A new array each render defeats row memoization.
  This is documented on the prop.
- **Index keys by default.** Fine for static data. Callers must pass `getRowKey` once rows
  can be inserted, sorted or filtered (Phase 3).
- **Fixed row height only.** Variable heights (Phase 5) need a measured-height cache and a
  binary search over prefix offsets in place of `floor(scrollTop / h)`.
