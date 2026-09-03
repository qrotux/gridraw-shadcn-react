import * as React from "react";

import type { GridRow } from "./core/types";

/** The current grid's key column (descriptor.idColumn), reachable from any
 *  descendant of GridPage without threading a prop through every Actions
 *  component.
 *
 *  The default is `null`, not `"id"`: the descriptor names the key column, and
 *  a silent fallback would read the wrong field on grids whose key is not
 *  `id`. Use outside GridPage fails loudly (see useGridIdColumn). */
const GridIdColumnContext = React.createContext<string | null>(null);

/** Mounted by GridPage around the rendered tree (table + extraColumns).
 *  Consumer pages do not use it directly; tests rendering an Actions
 *  component in isolation from GridPage do. */
export function GridIdColumnProvider({
  idColumn,
  children,
}: {
  idColumn: string;
  children: React.ReactNode;
}) {
  return <GridIdColumnContext.Provider value={idColumn}>{children}</GridIdColumnContext.Provider>;
}

/** Key column name of the current grid. Throws outside GridPage / GridIdColumnProvider. */
export function useGridIdColumn(): string {
  const idColumn = React.useContext(GridIdColumnContext);
  if (idColumn === null) {
    throw new Error(
      "useGridIdColumn() called outside GridPage: wrap the rendered tree in " +
        '<GridIdColumnProvider idColumn="..."> (GridPage does this for its ' +
        "extraColumns; an isolated test must do it by hand).",
    );
  }
  return idColumn;
}

/** Like useGridIdColumn() but returns `null` outside the provider. Only for
 *  infrastructure that legitimately runs without GridPage, such as `getRowId`
 *  in grid-table.tsx (GridTable is also rendered standalone in its tests).
 *  Actions components use the throwing hooks. */
export function useGridIdColumnOptional(): string | null {
  return React.useContext(GridIdColumnContext);
}

/** The row's key column value: `row[useGridIdColumn()]`.
 *
 *  Throws when the row lacks the column (`undefined`) instead of returning the
 *  string "undefined" into a clipboard, a navigation URL or a drill-down
 *  filter. A real SQL NULL arrives as `null`; `undefined` means the column was
 *  not requested, which is a bug in the caller's fetch set. */
export function useGridRowId(row: GridRow): unknown {
  const idColumn = useGridIdColumn();
  const value = row[idColumn];
  if (value === undefined) {
    throw new Error(
      `useGridRowId(): the row has no column "${idColumn}" (the current grid's ` +
        "idColumn). GridPage always includes descriptor.idColumn in the rows " +
        "request, so the usual cause is a manual rows substitute (test/stub) " +
        `without the "${idColumn}" field.`,
    );
  }
  return value;
}
