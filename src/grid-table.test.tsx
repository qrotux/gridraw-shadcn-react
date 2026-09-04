import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { GridIdColumnProvider } from "./grid-id-column";
import { GridTable, toggleSort, type GridTableColumn } from "./grid-table";
import type { GridRow, SortSpec } from "./core/types";

// vitest.config.ts sets `globals: false` → no auto-cleanup; unmount manually.
afterEach(() => cleanup());

describe("toggleSort", () => {
  it("cycles a fresh column asc → desc → removed (non-additive)", () => {
    const asc = toggleSort([], "email", false);
    expect(asc).toEqual([{ column: "email", dir: "asc" }]);

    const desc = toggleSort(asc, "email", false);
    expect(desc).toEqual([{ column: "email", dir: "desc" }]);

    // third click clears the sort (falls back to server default on the page)
    expect(toggleSort(desc, "email", false)).toEqual([]);
  });

  it("non-additive click on another column collapses to just that column", () => {
    const start: SortSpec[] = [{ column: "email", dir: "asc" }];
    expect(toggleSort(start, "name", false)).toEqual([{ column: "name", dir: "asc" }]);
  });

  it("Shift+click appends a new column without clearing the others", () => {
    const start: SortSpec[] = [{ column: "email", dir: "asc" }];
    expect(toggleSort(start, "name", true)).toEqual([
      { column: "email", dir: "asc" },
      { column: "name", dir: "asc" },
    ]);
  });

  it("Shift+click cycles an existing column in place (asc → desc), keeping order", () => {
    const start: SortSpec[] = [
      { column: "email", dir: "asc" },
      { column: "name", dir: "asc" },
    ];
    expect(toggleSort(start, "email", true)).toEqual([
      { column: "email", dir: "desc" },
      { column: "name", dir: "asc" },
    ]);
  });

  it("Shift+click a third time removes only that column, preserving the rest", () => {
    const start: SortSpec[] = [
      { column: "email", dir: "desc" },
      { column: "name", dir: "asc" },
    ];
    expect(toggleSort(start, "email", true)).toEqual([{ column: "name", dir: "asc" }]);
  });

  // An empty sort equals the server defaultSort, so "off" on the default
  // column changed nothing and locked it in one direction.
  it("flips the default-sort column instead of clearing it (asc ↔ desc)", () => {
    const def: SortSpec = { column: "created_at", dir: "desc" };
    // start: the implicit default desc shown in the header
    const asc = toggleSort([def], "created_at", false, def);
    expect(asc).toEqual([{ column: "created_at", dir: "asc" }]);
    // second click gives desc explicitly, third flips again instead of clearing
    const desc = toggleSort(asc, "created_at", false, def);
    expect(desc).toEqual([def]);
    expect(toggleSort(desc, "created_at", false, def)).toEqual([{ column: "created_at", dir: "asc" }]);
  });

  it("still clears a non-default column, and one that differs from the default dir", () => {
    const def: SortSpec = { column: "created_at", dir: "desc" };
    expect(toggleSort([{ column: "email", dir: "desc" }], "email", false, def)).toEqual([]);
    // default created_at asc: clearing an explicit desc really changes the order
    const ascDef: SortSpec = { column: "created_at", dir: "asc" };
    expect(toggleSort([{ column: "created_at", dir: "desc" }], "created_at", false, ascDef)).toEqual([]);
  });

  it("keeps clearing possible while other sort columns remain", () => {
    const def: SortSpec = { column: "created_at", dir: "desc" };
    const start: SortSpec[] = [
      { column: "created_at", dir: "desc" },
      { column: "email", dir: "asc" },
    ];
    expect(toggleSort(start, "created_at", true, def)).toEqual([{ column: "email", dir: "asc" }]);
  });
});

const COLUMNS: GridTableColumn[] = [
  { key: "email", title: "Email", sortable: true, filterable: true, render: (r: GridRow) => String(r.email) },
  { key: "name", title: "Name", sortable: true, filterable: true, render: (r: GridRow) => String(r.name) },
];
const ROWS: GridRow[] = [{ id: "1", email: "a@x", name: "Alice" }];

function renderTable(sorts: SortSpec[], onSortChange = vi.fn(), onAddFilter?: (key: string) => void) {
  render(
    <GridTable
      columns={COLUMNS}
      rows={ROWS}
      sorts={sorts}
      onSortChange={onSortChange}
      onAddFilter={onAddFilter}
      page={1}
      pageCount={1}
      hasPrev={false}
      hasNext={false}
      onPageChange={vi.fn()}
    />,
  );
  return onSortChange;
}

describe("GridTable sort headers", () => {
  it("a plain header click emits a non-additive toggle", () => {
    const onSortChange = renderTable([{ column: "email", dir: "asc" }]);
    fireEvent.click(screen.getByRole("button", { name: /Email/ }));
    expect(onSortChange).toHaveBeenCalledWith([{ column: "email", dir: "desc" }]);
  });

  it("a Shift+click header emits an additive toggle (keeps existing sort)", () => {
    const onSortChange = renderTable([{ column: "email", dir: "asc" }]);
    fireEvent.click(screen.getByRole("button", { name: /Name/ }), { shiftKey: true });
    expect(onSortChange).toHaveBeenCalledWith([
      { column: "email", dir: "asc" },
      { column: "name", dir: "asc" },
    ]);
  });

  it("shows priority ordinals only when more than one column is sorted", () => {
    renderTable([{ column: "email", dir: "asc" }]);
    // single sort → no numeric badge
    expect(screen.queryByText("1")).toBeNull();
    cleanup();

    renderTable([
      { column: "email", dir: "asc" },
      { column: "name", dir: "desc" },
    ]);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});

// Identity probe: captures the row id this instance was FIRST mounted for
// (a ref, set once) and always renders it next to the row id it's *currently*
// being asked to display. If a row's React key tracks its entity (getRowId),
// an instance only ever gets reused for the SAME entity, so own === now
// always. If keys track array position (no getRowId — index fallback),
// reordering the rows array feeds an unrelated entity's data to whatever
// instance already occupies that position, and own !== now exposes it.
function IdentityCell({ row }: { row: GridRow }) {
  const [ownId] = React.useState(() => row.id);
  return <span data-testid="cell">{`own=${String(ownId)} now=${String(row.id)}`}</span>;
}

describe("GridTable row identity (getRowId)", () => {
  const idColumns: GridTableColumn[] = [
    { key: "id", title: "ID", sortable: false, filterable: false, render: (r) => <IdentityCell row={r} /> },
  ];
  // Deliberately module/describe-scoped and reused across both renders below,
  // NOT recreated inline per render. GridTable memoizes its per-column cell
  // renderer on [..., sorts, ..., onSortChange, ...]; a fresh `[]`/`vi.fn()`
  // on every render call would invalidate that memo on its own, forcing a
  // full remount of every cell for a reason that has NOTHING to do with
  // getRowId — which would make this test pass (or fail) for the wrong
  // reason regardless of the fix under test. Stable refs isolate the one
  // variable this test is actually about: whether `rows` reordering alone
  // remaps cell instances by entity or by position.
  const sorts: SortSpec[] = [];
  const onSortChange = vi.fn();
  const onPageChange = vi.fn();

  it("keeps a cell instance bound to its entity across a reorder, not its array position", () => {
    const rowsFirst: GridRow[] = [{ id: "a" }, { id: "b" }];
    const rowsReordered: GridRow[] = [{ id: "b" }, { id: "a" }];

    const { rerender } = render(
      <GridIdColumnProvider idColumn="id">
        <GridTable
          columns={idColumns}
          rows={rowsFirst}
          sorts={sorts}
          onSortChange={onSortChange}
          page={1}
          pageCount={1}
          hasPrev={false}
          hasNext={false}
          onPageChange={onPageChange}
        />
      </GridIdColumnProvider>,
    );
    expect(screen.getAllByTestId("cell").map((c) => c.textContent)).toEqual(["own=a now=a", "own=b now=b"]);

    rerender(
      <GridIdColumnProvider idColumn="id">
        <GridTable
          columns={idColumns}
          rows={rowsReordered}
          sorts={sorts}
          onSortChange={onSortChange}
          page={1}
          pageCount={1}
          hasPrev={false}
          hasNext={false}
          onPageChange={onPageChange}
        />
      </GridIdColumnProvider>,
    );
    // Entity-keyed: each instance followed its own entity when it moved
    // position, so own still matches now for BOTH cells — regardless of
    // which array slot they're now rendered from.
    for (const text of screen.getAllByTestId("cell").map((c) => c.textContent)) {
      const [own, now] = text!.split(" ").map((p) => p.split("=")[1]);
      expect(own).toBe(now);
    }
  });
});

describe("GridTable filter header button", () => {
  it("clicking the filter button calls onAddFilter(key) without triggering a sort", () => {
    const onSortChange = vi.fn();
    const onAddFilter = vi.fn();
    renderTable([{ column: "email", dir: "asc" }], onSortChange, onAddFilter);

    const filterBtns = screen.getAllByRole("button", { name: "Add filter for column" });
    // one per filterable column (email, name)
    expect(filterBtns).toHaveLength(2);
    fireEvent.click(filterBtns[0]);

    expect(onAddFilter).toHaveBeenCalledWith("email");
    expect(onSortChange).not.toHaveBeenCalled(); // stopPropagation keeps sort untouched
  });

  it("renders no filter button when onAddFilter is absent", () => {
    renderTable([{ column: "email", dir: "asc" }]);
    expect(screen.queryByRole("button", { name: "Add filter for column" })).toBeNull();
  });

  it("renders no filter button for a non-filterable column", () => {
    render(
      <GridTable
        columns={[
          { key: "id", title: "ID", sortable: true, filterable: false, render: (r: GridRow) => String(r.id) },
        ]}
        rows={ROWS}
        sorts={[]}
        onSortChange={vi.fn()}
        onAddFilter={vi.fn()}
        page={1}
        pageCount={1}
        hasPrev={false}
        hasNext={false}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Add filter for column" })).toBeNull();
  });
});

describe("GridTable pagination", () => {
  function renderPager(props: Partial<React.ComponentProps<typeof GridTable>>) {
    render(
      <GridTable
        columns={COLUMNS}
        rows={ROWS}
        sorts={[]}
        onSortChange={vi.fn()}
        page={3}
        hasPrev
        hasNext
        onPageChange={vi.fn()}
        {...props}
      />,
    );
  }

  it("shows position out of a total when the grid counts", () => {
    renderPager({ pageCount: 12 });
    expect(screen.getByText("3 / 12")).toBeInTheDocument();
  });

  // A skipTotal grid sends no total, so there is no last page to count towards
  // and the label must not imply one.
  it("shows the page number alone when the grid skips the count", () => {
    renderPager({ pageCount: undefined });
    expect(screen.getByText("Page 3")).toBeInTheDocument();
    expect(screen.queryByText(/\//)).toBeNull();
  });

  // The flags, not the page number, decide: without a count there is nothing
  // to compare the page against, and with one they agree anyway.
  it("enables the arrows from hasPrev/hasNext, not from the page count", () => {
    renderPager({ pageCount: undefined });
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("disables both arrows on a single unpaged page", () => {
    renderPager({ page: 1, pageCount: 1, hasPrev: false, hasNext: false });
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});
