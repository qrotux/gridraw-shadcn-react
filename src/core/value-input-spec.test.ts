import { describe, it, expect } from "vitest";

import { scalarInputKind, valueInputSpec } from "./value-input-spec";
import type { GridColumn } from "./types";

function column(over: Partial<GridColumn>): GridColumn {
  return {
    key: "c",
    type: "string",
    title: "C",
    sortable: true,
    defaultVisible: true,
    ...over,
  };
}

describe("scalarInputKind", () => {
  it("sends the types with no picker to a text field", () => {
    expect(scalarInputKind("string")).toBe("text");
    expect(scalarInputKind("uuid")).toBe("text");
    expect(scalarInputKind("enum")).toBe("text");
    expect(scalarInputKind("json")).toBe("text");
  });
});

describe("valueInputSpec", () => {
  it("asks for no input on a value-less operator", () => {
    expect(valueInputSpec(column({}), "isNull")).toEqual({ kind: "none" });
  });

  it("enters both ends of a non-temporal range as numbers", () => {
    expect(valueInputSpec(column({ type: "string" }), "between")).toEqual({
      kind: "range",
      field: "number",
    });
    expect(valueInputSpec(column({ type: "date" }), "between")).toEqual({ kind: "range", field: "date" });
  });

  it("defaults an enum multi-value to checkboxes and follows the widget hint", () => {
    const options = [{ value: "a", label: "A" }];
    expect(
      valueInputSpec(column({ type: "enum", filter: { operators: [], enumValues: options } }), "in"),
    ).toEqual({ kind: "enumCheckboxes", options });
    expect(
      valueInputSpec(
        column({ type: "enum", filter: { operators: [], enumValues: options, widget: "combobox" } }),
        "in",
      ),
    ).toEqual({ kind: "enumTags", options, strict: false });
    expect(
      valueInputSpec(
        column({ type: "enum", filter: { operators: [], enumValues: options, widget: "nonsense" } }),
        "in",
      ),
    ).toEqual({ kind: "enumCheckboxes", options });
  });

  it("takes free tags when the column has no enum values", () => {
    expect(valueInputSpec(column({ type: "number", array: true }), "containsAny")).toEqual({
      kind: "tags",
      element: "number",
    });
  });
});
