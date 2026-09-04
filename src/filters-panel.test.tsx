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
        { op: "notBetween", label: "not between" },
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
      operators: [
        { op: "in", label: "in" },
        { op: "notIn", label: "not in" },
      ],
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
        { op: "isNull", label: "is null" },
        { op: "isNotNull", label: "is not null" },
      ],
    },
  },
  {
    key: "balance",
    type: "decimal",
    title: "Balance",
    sortable: true,
    defaultVisible: true,
    filter: {
      operators: [
        { op: "eq", label: "equals" },
        { op: "between", label: "between" },
        { op: "notBetween", label: "not between" },
      ],
    },
  },
  {
    key: "birthday",
    type: "date",
    title: "Birthday",
    sortable: true,
    defaultVisible: true,
    filter: {
      operators: [
        { op: "eq", label: "on" },
        { op: "between", label: "between" },
      ],
    },
  },
  {
    key: "opens_at",
    type: "time",
    title: "Opens",
    sortable: true,
    defaultVisible: true,
    step: 1, // second resolution
    filter: {
      operators: [
        { op: "eq", label: "at" },
        { op: "between", label: "between" },
      ],
    },
  },
  {
    key: "user_id",
    type: "uuid",
    title: "User",
    sortable: true,
    defaultVisible: true,
    filter: {
      operators: [
        { op: "in", label: "in" },
        { op: "notIn", label: "not in" },
      ],
    },
  },
  {
    key: "scores",
    type: "number",
    title: "Scores",
    array: true,
    sortable: false,
    defaultVisible: true,
    filter: {
      operators: [
        { op: "containsAny", label: "contains any" },
        { op: "isEmpty", label: "is empty" },
      ],
    },
  },
  {
    key: "locales",
    type: "enum",
    title: "Locales",
    array: true,
    sortable: false,
    defaultVisible: true,
    filter: {
      operators: [{ op: "containsAll", label: "contains all" }],
      enumValues: [
        { value: "en", label: "English" },
        { value: "ru", label: "Russian" },
      ],
    },
  },
  {
    key: "skills",
    type: "enum",
    title: "Skills",
    array: true,
    sortable: false,
    defaultVisible: true,
    filter: {
      operators: [
        { op: "containsAny", label: "contains any" },
        { op: "containsAll", label: "contains all" },
        { op: "containsOnly", label: "contains only" },
      ],
      widget: "tags", // strict autocomplete over enumValues
      enumValues: [
        { value: "go", label: "Go" },
        { value: "rust", label: "Rust" },
      ],
    },
  },
  {
    key: "interests",
    type: "enum",
    title: "Interests",
    array: true,
    sortable: false,
    defaultVisible: true,
    filter: {
      operators: [{ op: "containsAny", label: "contains any" }],
      widget: "combobox", // suggestions, but free entry allowed
      enumValues: [{ value: "travel", label: "Travel" }],
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

  it("a value-less operator (isNull) renders no value input, commits with value null", () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "created_at");
    selectByLabel("Operator", "isNull");

    // No value control for a value-less operator, and Add is enabled anyway.
    expect(screen.queryByLabelText("Value")).toBeNull();
    const add = screen.getByRole("button", { name: "Add" }) as HTMLButtonElement;
    expect(add.disabled).toBe(false);

    fireEvent.click(add);
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0] as FilterClause[][];
    expect(emitted[0][0]).toEqual({ field: "created_at", op: "isNull", value: null });
  });

  it("a uuid in-clause uses free tag entry (no enum checkboxes) and commits a string[]", () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "user_id");
    selectByLabel("Operator", "in");

    // No enum column, so no checkboxes — a free text field instead.
    expect(screen.queryByRole("checkbox")).toBeNull();
    const input = screen.getByPlaceholderText("Value");
    fireEvent.change(input, { target: { value: "3f2504e0-4f89-41d3-9a0c-0305e82c3301" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "9a0c0305-e82c-3301-3f25-04e04f8941d3" } });
    fireEvent.keyDown(input, { key: "," });

    fireEvent.click(screen.getByText("Add"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0][0][0]).toEqual({
      field: "user_id",
      op: "in",
      value: ["3f2504e0-4f89-41d3-9a0c-0305e82c3301", "9a0c0305-e82c-3301-3f25-04e04f8941d3"],
    });
  });

  it("a tag can be removed; clearing the last one makes the clause uncommittable", () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "user_id");
    selectByLabel("Operator", "in");
    const input = screen.getByPlaceholderText("Value");
    fireEvent.change(input, { target: { value: "only" } });
    fireEvent.keyDown(input, { key: "Enter" });

    const add = screen.getByRole("button", { name: "Add" }) as HTMLButtonElement;
    expect(add.disabled).toBe(false);

    fireEvent.click(screen.getByLabelText("Remove value"));
    expect(add.disabled).toBe(true); // no values left → nothing to commit
  });

  it("a number array (containsAny) enters tags as numbers and rejects non-numeric tokens", () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "scores");
    selectByLabel("Operator", "containsAny");

    const input = screen.getByPlaceholderText("Value");
    fireEvent.change(input, { target: { value: "10" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "abc" } }); // rejected
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "20" } });
    fireEvent.keyDown(input, { key: "Enter" });

    fireEvent.click(screen.getByText("Add"));
    expect(onChange).toHaveBeenCalledTimes(1);
    const clause = onChange.mock.calls[0][0][0][0] as FilterClause;
    expect(clause).toEqual({ field: "scores", op: "containsAny", value: [10, 20] });
    expect((clause.value as unknown[]).every((v) => typeof v === "number")).toBe(true);
  });

  it("an enum array (containsAll) uses the checkbox list, commits a string[]", () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "locales");
    // "locales" has only containsAll, so selecting the column defaults to it.
    fireEvent.click(screen.getByRole("checkbox", { name: "English" }));

    fireEvent.click(screen.getByText("Add"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0][0][0]).toEqual({ field: "locales", op: "containsAll", value: ["en"] });
  });

  it('widget "tags": a select-style dropdown restricted to enumValues (typed label → value)', () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "skills");
    selectByLabel("Operator", "containsAny");

    // A combobox, not a checkbox list.
    expect(screen.queryByRole("checkbox")).toBeNull();
    const input = screen.getByPlaceholderText("Value");

    fireEvent.change(input, { target: { value: "Go" } });
    expect(screen.getByRole("option", { name: "Go" })).toBeTruthy(); // dropdown lists the match
    fireEvent.keyDown(input, { key: "Enter" }); // picks the highlighted option → "go"

    fireEvent.change(input, { target: { value: "cobol" } }); // matches nothing
    fireEvent.keyDown(input, { key: "Enter" }); // strict → rejected

    fireEvent.click(screen.getByText("Add"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0][0][0]).toEqual({ field: "skills", op: "containsAny", value: ["go"] });
  });

  it('widget "tags": clicking an option in the dropdown adds it', () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "skills");
    selectByLabel("Operator", "containsAny");

    fireEvent.focus(screen.getByPlaceholderText("Value")); // opens the dropdown
    fireEvent.click(screen.getByRole("option", { name: "Rust" }));

    fireEvent.click(screen.getByText("Add"));
    expect(onChange.mock.calls[0][0][0][0]).toEqual({ field: "skills", op: "containsAny", value: ["rust"] });
  });

  it('widget "combobox": enum values are suggestions but a free value is kept', () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "interests");
    selectByLabel("Operator", "containsAny");

    const input = screen.getByPlaceholderText("Value");
    fireEvent.change(input, { target: { value: "Travel" } }); // matches a suggestion
    expect(screen.getByRole("option", { name: "Travel" })).toBeTruthy();
    fireEvent.keyDown(input, { key: "Enter" }); // → its value
    fireEvent.change(input, { target: { value: "gardening" } }); // no option
    fireEvent.keyDown(input, { key: "Enter" }); // free → kept as typed

    fireEvent.click(screen.getByText("Add"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0][0][0]).toEqual({
      field: "interests",
      op: "containsAny",
      value: ["travel", "gardening"],
    });
  });

  it("switching between same-shape operators keeps the entered value (containsAny → containsAll)", () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "skills");
    selectByLabel("Operator", "containsAny");
    const input = screen.getByPlaceholderText("Value");
    fireEvent.change(input, { target: { value: "Go" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // Switch the operator; the chosen tag must survive.
    selectByLabel("Operator", "containsAll");
    expect(screen.getByLabelText("Remove value")).toBeTruthy(); // the "Go" chip is still there

    fireEvent.click(screen.getByText("Add"));
    expect(onChange.mock.calls[0][0][0][0]).toEqual({ field: "skills", op: "containsAll", value: ["go"] });
  });

  it("switching to a different value shape resets the value (number eq → between)", () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "rating");
    selectByLabel("Operator", "eq");
    fireEvent.change(screen.getByPlaceholderText("Number"), { target: { value: "5" } });

    // eq (scalar) → between (range) is a shape change: the old scalar can't
    // carry over, so both range fields start empty.
    selectByLabel("Operator", "between");
    const inputs = screen.getAllByPlaceholderText("Number") as HTMLInputElement[];
    expect(inputs).toHaveLength(2);
    expect(inputs[0].value).toBe("");
    expect(inputs[1].value).toBe("");
  });

  it("containsOnly is a multi-value operator: same array input, commits a string[]", () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "skills");
    selectByLabel("Operator", "containsOnly");

    const input = screen.getByPlaceholderText("Value");
    fireEvent.change(input, { target: { value: "Go" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "Rust" } });
    fireEvent.keyDown(input, { key: "Enter" });

    fireEvent.click(screen.getByText("Add"));
    expect(onChange.mock.calls[0][0][0][0]).toEqual({
      field: "skills",
      op: "containsOnly",
      value: ["go", "rust"],
    });
  });

  it("an isEmpty operator on an array column commits value null with no input", () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "scores");
    selectByLabel("Operator", "isEmpty");

    expect(screen.queryByPlaceholderText("Value")).toBeNull();
    fireEvent.click(screen.getByText("Add"));
    expect(onChange.mock.calls[0][0][0][0]).toEqual({ field: "scores", op: "isEmpty", value: null });
  });

  it("a date clause chip shows a localized value, not the raw wire string", () => {
    render(
      <FiltersPanel
        columns={COLUMNS}
        value={[[{ field: "birthday", op: "eq", value: "2026-07-31" }]]}
        onChange={vi.fn()}
      />,
    );
    const chip = screen.getByLabelText("Edit condition");
    expect(chip.textContent).toContain("Birthday");
    expect(chip.textContent).toContain("2026");
    expect(chip.textContent).not.toContain("2026-07-31"); // formatted, not the raw wire form
  });

  it("a value-less clause chip shows title + operator, no value segment", () => {
    render(
      <FiltersPanel
        columns={COLUMNS}
        value={[[{ field: "created_at", op: "isNull", value: null }]]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Created is null")).toBeTruthy();
  });

  it("notIn uses the enum checkbox input (same as in) and commits a string[]", () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "role");
    selectByLabel("Operator", "notIn");
    fireEvent.click(screen.getByRole("checkbox", { name: "Influencer" }));

    fireEvent.click(screen.getByText("Add"));
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0] as FilterClause[][];
    expect(emitted[0][0]).toEqual({ field: "role", op: "notIn", value: ["influencer"] });
  });

  it("notBetween uses the range input and commits a 2-element array", () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "rating");
    selectByLabel("Operator", "notBetween");

    const inputs = screen.getAllByPlaceholderText("Number");
    expect(inputs).toHaveLength(2);
    fireEvent.change(inputs[0], { target: { value: "1" } });
    fireEvent.change(inputs[1], { target: { value: "4" } });

    fireEvent.click(screen.getByText("Add"));
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0] as FilterClause[][];
    expect(emitted[0][0]).toEqual({ field: "rating", op: "notBetween", value: [1, 4] });
  });

  it("a decimal clause commits the raw string, never a JS number (scale is preserved)", () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "balance");
    selectByLabel("Operator", "eq");
    fireEvent.change(screen.getByPlaceholderText("Number"), { target: { value: "19.90" } });

    fireEvent.click(screen.getByText("Add"));
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0] as FilterClause[][];
    const value = emitted[0][0].value;
    expect(value).toBe("19.90"); // string, trailing zero intact
    expect(typeof value).toBe("string");
  });

  it("a decimal range commits both bounds as strings (scale preserved end to end)", () => {
    const onChange = vi.fn();
    renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "balance");
    selectByLabel("Operator", "notBetween");

    const inputs = screen.getAllByPlaceholderText("Number");
    expect(inputs).toHaveLength(2);
    fireEvent.change(inputs[0], { target: { value: "10.00" } });
    fireEvent.change(inputs[1], { target: { value: "20.50" } });

    fireEvent.click(screen.getByText("Add"));
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0] as FilterClause[][];
    expect(emitted[0][0]).toEqual({ field: "balance", op: "notBetween", value: ["10.00", "20.50"] });
    const [lo, hi] = emitted[0][0].value as unknown[];
    expect(typeof lo).toBe("string");
    expect(typeof hi).toBe("string");
  });

  it("a time column uses a step-aware time input (not text/number) for scalar and range", () => {
    const onChange = vi.fn();
    const { container } = renderPanel([], onChange);

    // scalar: one time input carrying the column's step
    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "opens_at");
    selectByLabel("Operator", "eq");
    const scalar = container.querySelector('input[type="time"]') as HTMLInputElement;
    expect(scalar).toBeTruthy();
    expect(scalar.getAttribute("step")).toBe("1");
    fireEvent.change(scalar, { target: { value: "09:30:00" } });
    fireEvent.click(screen.getByText("Add"));
    expect(onChange.mock.calls[0][0][0][0]).toEqual({ field: "opens_at", op: "eq", value: "09:30:00" });

    // range: reopen the editor; two time inputs, never text or number
    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "opens_at");
    selectByLabel("Operator", "between");
    const bounds = container.querySelectorAll('input[type="time"]');
    expect(bounds).toHaveLength(2);
    fireEvent.change(bounds[0], { target: { value: "09:00:00" } });
    fireEvent.change(bounds[1], { target: { value: "17:00:00" } });
    fireEvent.click(screen.getByText("Add"));
    expect(onChange.mock.calls[1][0][0][0]).toEqual({
      field: "opens_at",
      op: "between",
      value: ["09:00:00", "17:00:00"],
    });
  });

  it("a date clause commits the YYYY-MM-DD wire string from the native picker", () => {
    const onChange = vi.fn();
    const { container } = renderPanel([], onChange);

    fireEvent.click(screen.getByText("+ Or group"));
    selectByLabel("Column", "birthday");
    selectByLabel("Operator", "eq");
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeTruthy();
    fireEvent.change(dateInput, { target: { value: "2026-09-03" } });

    fireEvent.click(screen.getByText("Add"));
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0] as FilterClause[][];
    expect(emitted[0][0]).toEqual({ field: "birthday", op: "eq", value: "2026-09-03" });
  });
});
