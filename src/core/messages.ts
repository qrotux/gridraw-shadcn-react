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
  page: string; // "{page}", shown instead of "3 / 12" when the grid skips the count
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
  page: "Page {page}",
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

export function mergeMessages(partial?: Partial<GridMessages>): Required<GridMessages> {
  return partial ? { ...defaultGridMessages, ...partial } : defaultGridMessages;
}
