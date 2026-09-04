import * as React from "react";

export { interpolate } from "./core/interpolate";

/** All localizable chrome strings. Values may contain `{token}` placeholders
 *  resolved by `interpolate`. */
export type GridMessages = {
  loading: string;
  searchPlaceholder: string; // "{columns}"
  orGroup: string;
  rowsTotal: string; // "{total}"
  addFilterAria: string;
  filterColumn: string;
  empty: string;
  sortHint: string;
  rowsPerPage: string;
  prev: string;
  next: string;
  booleanTrue: string;
  booleanFalse: string;
  value: string;
  number: string;
  columnAria: string;
  columnPlaceholder: string;
  operatorAria: string;
  save: string;
  add: string;
  cancel: string;
  editClauseAria: string;
  removeClauseAria: string;
  removeValue: string;
  filter: string;
  or: string;
  columns: string;
  visibleColumns: string;
  reset: string;
};

export const defaultGridMessages: Required<GridMessages> = {
  loading: "Loading…",
  searchPlaceholder: "Search {columns}…",
  orGroup: "+ Or group",
  rowsTotal: "{total} rows",
  addFilterAria: "Add filter for column",
  filterColumn: "Filter by this column",
  empty: "No data",
  sortHint: "Click to sort (asc→desc→off); Shift+click adds a column",
  rowsPerPage: "Rows per page",
  prev: "Previous",
  next: "Next",
  booleanTrue: "Yes",
  booleanFalse: "No",
  value: "Value",
  number: "Number",
  columnAria: "Column",
  columnPlaceholder: "Column…",
  operatorAria: "Operator",
  save: "Save",
  add: "Add",
  cancel: "Cancel",
  editClauseAria: "Edit condition",
  removeClauseAria: "Remove condition",
  removeValue: "Remove value",
  filter: "+ Filter",
  or: "OR",
  columns: "Columns",
  visibleColumns: "Visible columns",
  reset: "Reset",
};
// The "—" empty glyph used by cells and the boolean value input is
// language-neutral and intentionally not a GridMessages key.

export type GridI18n = { messages: Required<GridMessages>; locale: string };

const GridI18nContext = React.createContext<GridI18n>({
  messages: defaultGridMessages,
  locale: "en-GB",
});

export function GridI18nProvider({ value, children }: { value: GridI18n; children: React.ReactNode }) {
  return React.createElement(GridI18nContext.Provider, { value }, children);
}

export function useGridI18n(): GridI18n {
  return React.useContext(GridI18nContext);
}

export function mergeMessages(partial?: Partial<GridMessages>): Required<GridMessages> {
  return partial ? { ...defaultGridMessages, ...partial } : defaultGridMessages;
}
