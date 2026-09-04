import * as React from "react";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, Filter } from "lucide-react";

import { cn } from "./ui/cn";
import { useGridUi } from "./slots";

import { DescriptionTip } from "./description-tip";
import { useGridIdColumnOptional } from "./grid-id-column";
import { interpolate, useGridI18n } from "./messages";
import type { GridRow, SortDir, SortSpec } from "./core/types";

export type GridTableColumn = {
  key: string;
  title: React.ReactNode;
  /** Descriptor prose; shown as a tooltip on the header when set. */
  description?: string;
  sortable: boolean;
  filterable: boolean;
  pin?: "left" | "right";
  render: (row: GridRow) => React.ReactNode;
};

export interface GridTableProps {
  columns: GridTableColumn[];
  rows: GridRow[];
  /** Multi-sort, priority = order. A header click cycles asc→desc→off;
   *  Shift+click is additive (keeps the other columns). */
  sorts: SortSpec[];
  onSortChange: (sorts: SortSpec[]) => void;
  /** Server defaultSort, which an empty sort falls back to. Needed so that
   *  "off" on the default column is not a no-op; see toggleSort. */
  defaultSort?: SortSpec;
  /** Header filter icon of a filterable column opens the new-group editor
   *  preselected to that column. The icon is not rendered without it. */
  onAddFilter?: (key: string) => void;
  page: number;
  /** Absent on a grid that skips the count; the label then shows the page
   *  number alone and only the flags say whether a neighbour exists. */
  pageCount?: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPageChange: (page: number) => void;
  /** Current page size and selectable limits (the selector renders only
   *  when onPageSizeChange is set). */
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  isFetching?: boolean;
  emptyMessage?: string;
}

/**
 * toggleSort returns the multi-sort state after a click on column `key`.
 * Per-column cycle: none → asc → desc → off. `additive` (Shift held) keeps the
 * other columns; otherwise the result collapses to the clicked column.
 *
 * `defaultSort` is what the server applies to an empty sort. Clearing the last
 * column when it equals the default would change nothing, locking the default
 * column in its direction forever, so on that column the cycle is asc ↔ desc
 * with no "off" step.
 */
export function toggleSort(
  current: SortSpec[],
  key: string,
  additive: boolean,
  defaultSort?: SortSpec,
): SortSpec[] {
  const existing = current.find((s) => s.column === key) ?? null;
  let next: SortSpec | null = !existing
    ? { column: key, dir: "asc" }
    : existing.dir === "asc"
      ? { column: key, dir: "desc" }
      : null; // third click clears the column
  const rest = current.filter((s) => s.column !== key);
  if (
    next === null &&
    rest.length === 0 &&
    defaultSort?.column === key &&
    defaultSort.dir === existing?.dir
  ) {
    next = { column: key, dir: existing.dir === "asc" ? "desc" : "asc" };
  }
  if (additive) {
    if (next === null) return current.filter((s) => s.column !== key);
    if (!existing) return [...current, next];
    return current.map((s) => (s.column === key ? next : s));
  }
  return next === null ? [] : [next];
}

function SortIcon({ entry, showIndex }: { entry?: { dir: SortDir; index: number }; showIndex: boolean }) {
  if (!entry) return <ChevronsUpDown className="ml-2 size-4 text-muted-foreground" />;
  const Arrow = entry.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <span className="ml-2 inline-flex items-center gap-0.5">
      <Arrow className="size-4" />
      {showIndex && <span className="text-xs tabular-nums">{entry.index}</span>}
    </span>
  );
}

// Filter icon button: visible on header hover (group-hover) and focus; the
// click opens the filter editor without touching the sort.
function FilterButton({
  colKey,
  onAddFilter,
  ariaLabel,
  title,
}: {
  colKey: string;
  onAddFilter: (key: string) => void;
  ariaLabel: string;
  title: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onAddFilter(colKey);
      }}
      className="ml-1 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-accent-foreground focus:opacity-100 group-hover:opacity-100"
    >
      <Filter className="size-3.5" />
    </button>
  );
}

export function GridTable({
  columns,
  rows,
  sorts,
  onSortChange,
  defaultSort,
  onAddFilter,
  page,
  pageCount,
  hasPrev,
  hasNext,
  onPageChange,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,
  isFetching = false,
  emptyMessage,
}: GridTableProps) {
  const { messages } = useGridI18n();
  const { components, classNames } = useGridUi();
  const { Button, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } = components;
  // The current size is always in the options, even when a page set a default
  // outside the set; otherwise <select> shows an empty value.
  const sizeOptions = React.useMemo(
    () =>
      pageSize && !pageSizeOptions.includes(pageSize) ? [pageSize, ...pageSizeOptions] : pageSizeOptions,
    [pageSize, pageSizeOptions],
  );
  // column → {dir, ordinal} for the arrows and the priority badge.
  const sortByKey = React.useMemo(() => {
    const m = new Map<string, { dir: SortDir; index: number }>();
    sorts.forEach((s, i) => m.set(s.column, { dir: s.dir, index: i + 1 }));
    return m;
  }, [sorts]);

  // pin:"right" columns go last; pin:"left" and unpinned keep the caller's order.
  const ordered = React.useMemo(() => {
    const left = columns.filter((c) => c.pin !== "right");
    const right = columns.filter((c) => c.pin === "right");
    return [...left, ...right];
  }, [columns]);

  const colDefs = React.useMemo<ColumnDef<GridRow>[]>(
    () =>
      ordered.map((col) => ({
        id: col.key,
        header: () => {
          const filterBtn =
            col.filterable && onAddFilter ? (
              <FilterButton
                colKey={col.key}
                onAddFilter={onAddFilter}
                ariaLabel={messages.addFilterAria}
                title={messages.filterColumn}
              />
            ) : null;
          const label = (
            <>
              {col.sortable ? (
                <Button
                  variant="ghost"
                  size="sm"
                  title={messages.sortHint}
                  className="-ml-3 h-8"
                  onClick={(e) => onSortChange(toggleSort(sorts, col.key, e.shiftKey, defaultSort))}
                >
                  {col.title}
                  <SortIcon entry={sortByKey.get(col.key)} showIndex={sorts.length > 1} />
                </Button>
              ) : (
                <span className={cn(col.pin === "right" && "text-right")}>{col.title}</span>
              )}
            </>
          );
          return (
            <div className={cn("group flex items-center", col.pin === "right" && "justify-end")}>
              {col.description ? (
                <DescriptionTip description={col.description}>
                  <span className="flex items-center">{label}</span>
                </DescriptionTip>
              ) : (
                label
              )}
              {filterBtn}
            </div>
          );
        },
        cell: ({ row }) => (
          <div className={cn(col.pin === "right" && "text-right")}>{col.render(row.original)}</div>
        ),
      })),
    [ordered, sorts, sortByKey, onSortChange, defaultSort, onAddFilter, messages, Button],
  );

  // getRowId keys TanStack rows by entity, not array position. Without it a
  // refetch that re-sorts can hand a row component with live uncommitted
  // state to a different entity as a props update instead of remounting.
  // The non-throwing accessor is used on purpose: getRowId runs on every row
  // on every render, and GridTable's own tests render it without a provider.
  const idColumn = useGridIdColumnOptional();
  const getRowId = React.useCallback(
    (row: GridRow, index: number) => {
      const v = idColumn === null ? undefined : row[idColumn];
      // undefined (no provider / column not fetched) and null (SQL NULL) both
      // fall back to the index: a bare null would stringify to "null" for
      // every such row and duplicate React keys. The prefix keeps the fallback
      // from colliding with a real key value such as "0".
      return v === undefined || v === null ? `__row-index:${index}` : String(v);
    },
    [idColumn],
  );

  const table = useReactTable({
    data: rows,
    columns: colDefs,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    manualPagination: true,
    manualSorting: true,
    pageCount,
  });

  return (
    <div className="space-y-2">
      <div className={cn("rounded-md border", isFetching && "opacity-60", classNames.tableWrapper)}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className={classNames.row}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className={classNames.headerCell}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className={classNames.row}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={classNames.cell}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={ordered.length}
                  className={cn("h-24 text-center text-muted-foreground", classNames.cell)}
                >
                  {emptyMessage ?? messages.empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className={cn("flex items-center justify-between gap-2", classNames.pagination)}>
        {onPageSizeChange && pageSize ? (
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {messages.rowsPerPage}
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
              options={sizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
              ariaLabel={messages.rowsPerPage}
            />
          </label>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={!hasPrev}>
            {messages.prev}
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {pageCount === undefined
              ? interpolate(messages.page, { page })
              : `${page} / ${Math.max(pageCount, 1)}`}
          </span>
          <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={!hasNext}>
            {messages.next}
          </Button>
        </div>
      </div>
    </div>
  );
}
