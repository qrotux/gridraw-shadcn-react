import * as React from "react";

import { cn } from "./ui/cn";

import { CellValue } from "./cells";
import { ColumnPicker, useVisibleColumns } from "./column-picker";
import { FiltersPanel, type FiltersPanelHandle } from "./filters-panel";
import { GridIdColumnProvider } from "./grid-id-column";
import { GridTable, type GridTableColumn } from "./grid-table";
import { GridI18nProvider, mergeMessages, interpolate, type GridMessages } from "./messages";
import { GridUiProvider, mergeComponents, type GridClassNames, type GridComponents } from "./slots";
import { useGridDescriptor, useGridRows } from "./use-grid";
import type { CellCtx, ExtraColumn, GridRow, GridState, RowsRequest } from "./core/types";

export type GridPageProps = {
  name: string;
  basePath?: string;
  state: GridState;
  onStateChange: (patch: Partial<GridState>) => void;
  cellOverrides?: Record<string, (ctx: CellCtx, Default: React.FC) => React.ReactNode>;
  extraColumns?: ExtraColumn[];
  extraFetch?: string[];
  messages?: Partial<GridMessages>;
  locale?: string; // BCP-47, default "en-GB"
  /** Replaces the built-in shadcn components, one slot at a time. */
  components?: Partial<GridComponents>;
  /** Class strings appended to the grid's own containers. */
  classNames?: GridClassNames;
};

export function GridPage({
  name,
  basePath,
  state,
  onStateChange,
  cellOverrides,
  extraColumns,
  extraFetch,
  messages: messagesProp,
  locale: localeProp,
  components: componentsProp,
  classNames,
}: GridPageProps) {
  const { data: descriptor, isPending, error } = useGridDescriptor(name, basePath);
  const [visible, setVisible] = useVisibleColumns(name, descriptor);
  const [qDraft, setQDraft] = React.useState(state.q);
  const filtersRef = React.useRef<FiltersPanelHandle>(null);
  const messages = React.useMemo(() => mergeMessages(messagesProp), [messagesProp]);
  const locale = localeProp ?? "en-GB";
  const ui = React.useMemo(
    () => ({ components: mergeComponents(componentsProp), classNames: classNames ?? {} }),
    [componentsProp, classNames],
  );

  // The last value this page pushed into state.q. Distinguishes the echo of
  // our own debounced update from an external change (browser back/forward,
  // a link with a different `q`), which must overwrite the draft.
  const sentQ = React.useRef(state.q);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (qDraft !== state.q) {
        sentQ.current = qDraft;
        onStateChange({ q: qDraft });
      }
    }, 300);
    return () => clearTimeout(t);
    // state.q is deliberately not a dep: the draft is the input source
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft]);

  React.useEffect(() => {
    if (state.q !== sentQ.current) {
      sentQ.current = state.q;
      setQDraft(state.q);
    }
  }, [state.q]);

  // Page size is server-driven: default and options come from the descriptor;
  // state.pageSize (from the URL) overrides the default.
  const req: RowsRequest | null = React.useMemo(() => {
    if (!descriptor) return null;
    const cols = [...new Set([...visible, ...(extraFetch ?? []), descriptor.idColumn])];
    return {
      columns: cols,
      filters: state.filters,
      search: state.q || undefined,
      sort: state.sort.length ? state.sort : undefined,
      page: state.page,
      pageSize: state.pageSize ?? descriptor.pageSize,
    };
  }, [descriptor, visible, extraFetch, state]);

  const rowsQ = useGridRows(name, req, basePath);

  if (isPending) return <div className="p-4 text-muted-foreground">{messages.loading}</div>;
  if (error || !descriptor) return <div className="p-4 text-destructive">{String(error)}</div>;

  const tableColumns: GridTableColumn[] = [
    ...descriptor.columns
      .filter((c) => visible.includes(c.key))
      .map((c) => ({
        key: c.key,
        title: c.title,
        description: c.description,
        sortable: c.sortable,
        filterable: !!c.filter,
        render: (row: GridRow) => {
          const Default = () => <CellValue column={c} value={row[c.key]} />;
          const ov = cellOverrides?.[c.key];
          return ov ? ov({ value: row[c.key], row, column: c }, Default) : <Default />;
        },
      })),
    ...(extraColumns ?? []).map((e) => ({
      key: e.key,
      title: e.title,
      sortable: false,
      filterable: false,
      pin: e.pin,
      render: (row: GridRow) => e.render(row),
    })),
  ];

  const pageSize = state.pageSize ?? descriptor.pageSize;
  // A skipTotal grid sends no total, so there is no page count and no row
  // count to print; the flags below carry the whole of pagination there.
  const total = rowsQ.data?.total;
  const pageCount = total === undefined ? undefined : Math.max(1, Math.ceil(total / pageSize));
  // A server older than the flags sends neither, so they fall back to the page
  // arithmetic that used to drive the arrows. Without that, hasNext would read
  // false and the grid would look like a single page.
  const hasPrev = rowsQ.data?.hasPrev ?? state.page > 1;
  const hasNext = rowsQ.data?.hasNext ?? (pageCount !== undefined && state.page < pageCount);

  return (
    <GridIdColumnProvider idColumn={descriptor.idColumn}>
      <GridI18nProvider value={{ messages, locale }}>
        <GridUiProvider value={ui}>
          <div className="space-y-3 p-4">
            <div className={cn("flex items-center gap-2", classNames?.toolbar)}>
              {descriptor.search && (
                <ui.components.Input
                  value={qDraft}
                  onChange={(e) => setQDraft(e.target.value)}
                  placeholder={interpolate(messages.searchPlaceholder, {
                    columns: descriptor.search.columns.join(", "),
                  })}
                  className={cn("max-w-sm", classNames?.search)}
                />
              )}
              <div className="ml-auto flex items-center gap-2">
                <ui.components.Button
                  variant="outline"
                  size="sm"
                  onClick={() => filtersRef.current?.openAddGroup()}
                >
                  {messages.orGroup}
                </ui.components.Button>
                <ColumnPicker columns={descriptor.columns} visible={visible} onChange={setVisible} />
              </div>
            </div>
            <FiltersPanel
              ref={filtersRef}
              columns={descriptor.columns}
              value={state.filters}
              onChange={(filters) => onStateChange({ filters })}
            />
            <GridTable
              columns={tableColumns}
              rows={rowsQ.data?.rows ?? []}
              sorts={state.sort.length ? state.sort : [descriptor.defaultSort]}
              defaultSort={descriptor.defaultSort}
              onSortChange={(sort) => onStateChange({ sort })}
              onAddFilter={(key) => filtersRef.current?.openAddGroup(key)}
              page={state.page}
              pageCount={pageCount}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPageChange={(page) => onStateChange({ page })}
              pageSize={pageSize}
              pageSizeOptions={descriptor.pageSizeOptions}
              onPageSizeChange={(size) => onStateChange({ pageSize: size })}
              isFetching={rowsQ.isFetching}
            />
            {total !== undefined && (
              <div className="text-xs text-muted-foreground">
                {interpolate(messages.rowsTotal, { total })}
              </div>
            )}
          </div>
        </GridUiProvider>
      </GridI18nProvider>
    </GridIdColumnProvider>
  );
}
