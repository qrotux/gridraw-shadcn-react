import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { FiltersPanel, type FiltersPanelHandle } from "./filters-panel";
import type { FilterClause, GridColumn } from "./core/types";

const COLUMNS: GridColumn[] = [
  {
    key: "email",
    type: "string",
    title: "Email",
    sortable: true,
    defaultVisible: true,
    filter: {
      operators: [
        { op: "eq", label: "equals" },
        { op: "contains", label: "contains" },
        { op: "starts", label: "starts with" },
      ],
    },
  },
  {
    key: "rating",
    type: "number",
    title: "Rating",
    sortable: true,
    defaultVisible: true,
    filter: {
      operators: [
        { op: "eq", label: "equals" },
        { op: "gte", label: "≥" },
        { op: "lte", label: "≤" },
        { op: "between", label: "between" },
      ],
    },
  },
  {
    key: "is_banned",
    type: "boolean",
    title: "Banned",
    sortable: true,
    defaultVisible: true,
    filter: { operators: [{ op: "eq", label: "equals" }] },
  },
  {
    key: "role",
    type: "enum",
    title: "Role",
    sortable: true,
    defaultVisible: true,
    filter: {
      operators: [{ op: "in", label: "in" }],
      enumValues: [
        { value: "traveler", label: "Traveler" },
        { value: "influencer", label: "Influencer" },
      ],
    },
  },
  {
    key: "created_at",
    type: "datetime",
    title: "Created",
    sortable: true,
    defaultVisible: true,
    filter: {
      operators: [
        { op: "gte", label: "after" },
        { op: "lte", label: "before" },
        { op: "between", label: "between" },
      ],
    },
  },
];

const oneGroup: FilterClause[][] = [[{ field: "email", op: "contains", value: "a" }]];

function selectByLabel(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

// "+ Or group" now lives in the GridPage toolbar and opens the panel's
// new-group editor via the imperative handle. This harness reproduces that
// wiring so the tests can drive the editor through a real "+ Or group" click.
function renderPanel(value: FilterClause[][], onChange: (v: FilterClause[][]) => void) {
  const ref = React.createRef<FiltersPanelHandle>();
  return render(
    <>
      <button onClick={() => ref.current?.openAddGroup()}>+ Or group</button>
      {/* stand-in for the header filter icon click (preselect) */}
      <button onClick={() => ref.current?.openAddGroup("email")}>filter email</button>
      <FiltersPanel ref={ref} columns={COLUMNS} value={value} onChange={onChange} />
    </>,
  );
}

describe("FiltersPanel", () => {
  // globals: false in vitest.config.ts disables testing-library's automatic
  // afterEach cleanup, so unmount by hand.
  afterEach(() => cleanup());

  it('"+ Or group" appends a new OR-group with a coerced number value', () => {
    const onChange = vi.fn();
    renderPanel(oneGroup, onChange);

    fireEvent.click(screen.getByText("+ Or group"));

    selectByLabel("Column", "rating");
    // "rating" defaults its operator to the first one ("eq") — no need to
    // touch the operator select, but exercise it anyway for coverage.
    selectByLabel("Operator", "eq");
    fireEvent.change(screen.getByPlaceholderText("Number"), { target: { value: "42" } });

    fireEvent.click(screen.getByText("Add"));

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0] as FilterClause[][];
    expect(emitted).toHaveLength(2);
    expect(emitted[0]).toEqual(oneGroup[0]);
    expect(emitted[1]).toEqual([{ field: "rating", op: "eq", value: 42 }]);
    expect(typeof emitted[1][0].value).toBe("number");
  });

  it("removing the only clause of a group removes the whole group (never an empty [])", () => {
    const onChange = vi.fn();
    renderPanel(oneGroup, onChange);

    fireEvent.click(screen.getByLabelText("Remove condition"));

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0] as FilterClause[][];
    expect(emitted).toEqual([]);
    expect(emitted.some((g) => g.length === 0)).toBe(false);
  });

  it('a boolean-typed clause commits with a real boolean, not the string "true"', () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "is_banned");
    selectByLabel("Value", "true");

    fireEvent.click(screen.getByText("Add"));

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0] as FilterClause[][];
    expect(emitted).toEqual([[{ field: "is_banned", op: "eq", value: true }]]);
    expect(typeof emitted[0][0].value).toBe("boolean");
  });

  it("renders a chip for an existing clause with title + operator label + value", () => {
    renderPanel(oneGroup, vi.fn());
    expect(screen.getByText("Email contains a")).toBeTruthy();
  });

  it("openAddGroup(column) preselects that column with its default op and stays in add-mode", () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("filter email"));

    // editor opens with email preselected + string default op "contains"
    expect((screen.getByLabelText("Column") as HTMLSelectElement).value).toBe("email");
    expect((screen.getByLabelText("Operator") as HTMLSelectElement).value).toBe("contains");
    // add-mode: button reads "Add" (not "Save")
    expect(screen.getByText("Add")).toBeTruthy();
    expect(screen.queryByText("Save")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("Value"), { target: { value: "bob" } });
    fireEvent.click(screen.getByText("Add"));

    // committed as a fresh OR-group
    expect(onChange).toHaveBeenCalledWith([[{ field: "email", op: "contains", value: "bob" }]]);
  });

  it("openAddGroup(column) with a preselect appends a NEW OR-group beside existing ones", () => {
    const onChange = vi.fn();
    renderPanel(oneGroup, onChange); // oneGroup already has one group

    fireEvent.click(screen.getByText("filter email"));
    fireEvent.change(screen.getByPlaceholderText("Value"), { target: { value: "z" } });
    fireEvent.click(screen.getByText("Add"));

    expect(onChange).toHaveBeenCalledWith([oneGroup[0], [{ field: "email", op: "contains", value: "z" }]]);
  });

  it('defaults a string column\'s operator to "contains" (not the first "equals")', () => {
    renderPanel([], vi.fn());
    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "email"); // string column, ops [eq, contains, starts]
    expect((screen.getByLabelText("Operator") as HTMLSelectElement).value).toBe("contains");
  });

  it("clicking a chip opens a pre-filled editor and saving replaces the clause in place", () => {
    const onChange = vi.fn();
    renderPanel(oneGroup, onChange);

    fireEvent.click(screen.getByText("Email contains a")); // click the chip label → edit

    // editor is pre-filled from the existing clause
    expect((screen.getByLabelText("Column") as HTMLSelectElement).value).toBe("email");
    expect((screen.getByLabelText("Operator") as HTMLSelectElement).value).toBe("contains");
    const input = screen.getByPlaceholderText("Value") as HTMLInputElement;
    expect(input.value).toBe("a");

    fireEvent.change(input, { target: { value: "bob" } });
    fireEvent.click(screen.getByText("Save"));

    expect(onChange).toHaveBeenCalledTimes(1);
    // replaced in place — still ONE group with ONE clause, not appended
    expect(onChange.mock.calls[0][0]).toEqual([[{ field: "email", op: "contains", value: "bob" }]]);
  });

  it("editing one clause of a multi-clause group replaces only that clause (keeps the rest)", () => {
    const onChange = vi.fn();
    const value: FilterClause[][] = [
      [
        { field: "email", op: "contains", value: "a" },
        { field: "rating", op: "eq", value: 5 },
      ],
    ];
    renderPanel(value, onChange);

    fireEvent.click(screen.getByText("Rating equals 5")); // edit the SECOND clause
    const input = screen.getByPlaceholderText("Number") as HTMLInputElement;
    expect(input.value).toBe("5");
    fireEvent.change(input, { target: { value: "9" } });
    fireEvent.click(screen.getByText("Save"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual([
      [
        { field: "email", op: "contains", value: "a" },
        { field: "rating", op: "eq", value: 9 },
      ],
    ]);
  });

  it("a datetime clause commits value as an RFC3339 string (datetime-local → toISOString())", () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "created_at");
    selectByLabel("Operator", "gte");
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "2026-07-31T12:34" } });

    fireEvent.click(screen.getByText("Add"));

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0] as FilterClause[][];
    const value = emitted[0][0].value;
    expect(typeof value).toBe("string");
    expect(value as string).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
    expect(Number.isNaN(new Date(value as string).getTime())).toBe(false);
  });

  it("a between clause (number column) commits a 2-element array of real numbers", () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "rating");
    selectByLabel("Operator", "between");
    const [minInput, maxInput] = screen.getAllByPlaceholderText("Number");
    fireEvent.change(minInput, { target: { value: "10" } });
    fireEvent.change(maxInput, { target: { value: "20" } });

    fireEvent.click(screen.getByText("Add"));

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0] as FilterClause[][];
    const value = emitted[0][0].value as unknown[];
    expect(Array.isArray(value)).toBe(true);
    expect(value).toHaveLength(2);
    expect(value.every((v) => typeof v === "number")).toBe(true);
    expect(value).toEqual([10, 20]);
  });

  it("an enum in-clause commits a non-empty string[] value", () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "role");
    // "role" has only the "in" operator, so selectField already defaults op to it.
    fireEvent.click(screen.getByRole("checkbox", { name: "Traveler" }));

    fireEvent.click(screen.getByText("Add"));

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0] as FilterClause[][];
    const value = emitted[0][0].value as unknown[];
    expect(Array.isArray(value)).toBe(true);
    expect(value.length).toBeGreaterThan(0);
    expect(value.every((v) => typeof v === "string")).toBe(true);
    expect(value).toEqual(["traveler"]);
  });

  it("removing a clause in one group closes an editor open in a DIFFERENT group (guards index-desync after reindexing)", () => {
    const onChange = vi.fn();
    const value: FilterClause[][] = [
      [{ field: "email", op: "contains", value: "x" }],
      [{ field: "rating", op: "eq", value: 5 }],
    ];
    renderPanel(value, onChange);

    // Open the "+ Filter" editor on the SECOND group (index 1).
    fireEvent.click(screen.getAllByText("+ Filter")[1]);
    expect(screen.getByLabelText("Column")).toBeTruthy();

    // Remove the only clause of the FIRST group. That group disappears and,
    // without the fix, the still-open editor (keyed by numeric groupIndex 1)
    // would silently reattach to what is now a different group after the
    // positional reindex.
    fireEvent.click(screen.getAllByLabelText("Remove condition")[0]);

    // Fix: any open editor is closed on structural mutation.
    expect(screen.queryByLabelText("Column")).toBeNull();
  });
});
