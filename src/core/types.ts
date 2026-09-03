import type * as React from "react";

// Protocol vocabularies as const arrays: the types derive from them, and tests
// use the same arrays for runtime membership checks (resolveJsonModule widens
// string literals in imported JSON fixtures to string).
export const COL_TYPES = ["string", "number", "boolean", "enum", "datetime", "json"] as const;
export type ColType = (typeof COL_TYPES)[number];
export const FILTER_OPS = ["eq", "contains", "starts", "gte", "lte", "between", "in"] as const;
export type FilterOp = (typeof FILTER_OPS)[number];
export const SORT_DIRS = ["asc", "desc"] as const;
export type SortDir = (typeof SORT_DIRS)[number];

export type SortSpec = { column: string; dir: SortDir };
export type OpDesc = { op: FilterOp; label: string };
export type EnumValue = { value: string; label: string };
export type FilterDesc = { operators: OpDesc[]; enumValues?: EnumValue[] };

export type GridColumn = {
  key: string;
  type: ColType;
  title: string;
  sortable: boolean;
  defaultVisible: boolean;
  filter?: FilterDesc;
};

export type GridDescriptor = {
  name: string;
  idColumn: string;
  /** Server default page size (the UI follows it) and the selectable limits. */
  pageSize: number;
  pageSizeOptions: number[];
  defaultSort: SortSpec;
  search: { columns: string[] } | null;
  columns: GridColumn[];
};

export type FilterClause = { field: string; op: FilterOp; value: unknown };

export type RowsRequest = {
  columns: string[];
  filters: FilterClause[][]; // DNF: OR of AND-groups
  search?: string;
  sort?: SortSpec[]; // priority = order; empty falls back to the server defaultSort
  page: number;
  pageSize?: number;
};

export type GridRow = Record<string, unknown>;
export type RowsResponse = { rows: GridRow[]; total: number };

/** Request state (lives in the URL); column visibility is kept separately (localStorage). */
export type GridState = {
  filters: FilterClause[][];
  sort: SortSpec[]; // priority = order; empty falls back to the server defaultSort
  page: number;
  q: string;
  pageSize?: number;
};

/** Context handed to a page-level cell override. */
export type CellCtx = { value: unknown; row: GridRow; column: GridColumn };
export type CellOverride = (ctx: CellCtx, Default: React.FC) => React.ReactNode;

/** Client-only column outside the descriptor: no sort, filter or picker entry.
 *
 * `render` receives only the row. The id column name is not passed as a prop:
 * it belongs to the grid descriptor and is available inside `render` (and any
 * component it renders) through `useGridIdColumn()` / `useGridRowId()`. */
export type ExtraColumn = {
  key: string;
  title: React.ReactNode;
  pin?: "left" | "right";
  render: (row: GridRow) => React.ReactNode;
};

export const DEFAULT_GRID_BASE = "/api/admin/grids";
