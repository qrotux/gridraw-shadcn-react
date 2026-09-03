import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, renderHook } from "@testing-library/react";

import { GridIdColumnProvider, useGridIdColumn, useGridRowId } from "./grid-id-column";
import type { GridRow } from "./core/types";

function Wrapper(idColumn: string) {
  return function W({ children }: { children: React.ReactNode }) {
    return <GridIdColumnProvider idColumn={idColumn}>{children}</GridIdColumnProvider>;
  };
}

describe("useGridIdColumn", () => {
  it("returns the provider's idColumn", () => {
    const { result } = renderHook(() => useGridIdColumn(), { wrapper: Wrapper("user_uuid") });
    expect(result.current).toBe("user_uuid");
  });

  it("throws a named error outside GridIdColumnProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useGridIdColumn())).toThrow(/useGridIdColumn\(\) called outside GridPage/);
    spy.mockRestore();
  });
});

describe("useGridRowId", () => {
  it("reads row[idColumn], not a literal row.id", () => {
    const row: GridRow = { user_uuid: "u-custom" };
    const { result } = renderHook(() => useGridRowId(row), { wrapper: Wrapper("user_uuid") });
    expect(result.current).toBe("u-custom");
  });

  it('returns null as a legitimate value (NULL is not "missing")', () => {
    const row: GridRow = { user_uuid: null };
    const { result } = renderHook(() => useGridRowId(row), { wrapper: Wrapper("user_uuid") });
    expect(result.current).toBeNull();
  });

  // A row without idColumn at all (not fetched / stub without it): the hook
  // must throw with the cause, not hand the string "undefined" outward.
  it("throws a named error instead of silently returning undefined when the row lacks idColumn", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const row: GridRow = { other_field: "x" };
    expect(() => renderHook(() => useGridRowId(row), { wrapper: Wrapper("user_uuid") })).toThrow(
      /the row has no column "user_uuid"/,
    );
    spy.mockRestore();
  });

  it("works end to end when mounted through GridIdColumnProvider directly (render, not just renderHook)", () => {
    function Probe({ row }: { row: GridRow }) {
      const id = useGridRowId(row);
      return <span data-testid="id">{String(id)}</span>;
    }
    const { getByTestId } = render(
      <GridIdColumnProvider idColumn="chat_uuid">
        <Probe row={{ chat_uuid: "c-custom" }} />
      </GridIdColumnProvider>,
    );
    expect(getByTestId("id").textContent).toBe("c-custom");
  });
});
