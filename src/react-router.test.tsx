import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

import { useGridUrlState } from "./react-router";

function wrapper(initialEntries: string[]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  };
}

describe("useGridUrlState", () => {
  it("returns defaults from an empty URL", () => {
    const { result } = renderHook(() => useGridUrlState(), { wrapper: wrapper(["/"]) });
    const [state] = result.current;
    expect(state).toEqual({ filters: [], sort: [], page: 1, q: "" });
  });

  it("roundtrips filters through the f param", () => {
    const { result } = renderHook(() => useGridUrlState(), { wrapper: wrapper(["/"]) });
    const filters = [[{ field: "email", op: "contains" as const, value: "a" }]];

    act(() => {
      const [, setState] = result.current;
      setState({ filters });
    });

    const [state] = result.current;
    expect(state.filters).toEqual(filters);
  });

  it("roundtrips a multi-column sort through the sort param (order preserved)", () => {
    const { result } = renderHook(() => useGridUrlState(), {
      wrapper: wrapper(["/?sort=rating:desc,email:asc"]),
    });
    expect(result.current[0].sort).toEqual([
      { column: "rating", dir: "desc" },
      { column: "email", dir: "asc" },
    ]);

    act(() => {
      const [, setState] = result.current;
      setState({ sort: [{ column: "name", dir: "asc" }] });
    });
    expect(result.current[0].sort).toEqual([{ column: "name", dir: "asc" }]);
  });

  it("drops duplicate/invalid segments when parsing the sort param", () => {
    const { result } = renderHook(() => useGridUrlState(), {
      wrapper: wrapper(["/?sort=email:asc,email:desc,name:bogus"]),
    });
    // dupe email kept once (first wins), bad dir dropped
    expect(result.current[0].sort).toEqual([{ column: "email", dir: "asc" }]);
  });

  it("resets page to 1 when q changes", () => {
    const { result } = renderHook(() => useGridUrlState(), { wrapper: wrapper(["/?page=3"]) });
    expect(result.current[0].page).toBe(3);

    act(() => {
      const [, setState] = result.current;
      setState({ q: "hello" });
    });

    const [state] = result.current;
    expect(state.q).toBe("hello");
    expect(state.page).toBe(1);
  });

  it("preserves an explicit page when setState({ page: 3 }) is called", () => {
    const { result } = renderHook(() => useGridUrlState(), { wrapper: wrapper(["/"]) });

    act(() => {
      const [, setState] = result.current;
      setState({ page: 3 });
    });

    const [state] = result.current;
    expect(state.page).toBe(3);
  });

  it("roundtrips pageSize through the ps param", () => {
    const { result } = renderHook(() => useGridUrlState(), { wrapper: wrapper(["/?ps=50"]) });
    expect(result.current[0].pageSize).toBe(50);

    act(() => {
      const [, setState] = result.current;
      setState({ pageSize: 25 });
    });
    expect(result.current[0].pageSize).toBe(25);
  });

  it("resets page to 1 when pageSize changes", () => {
    const { result } = renderHook(() => useGridUrlState(), { wrapper: wrapper(["/?page=4"]) });
    expect(result.current[0].page).toBe(4);

    act(() => {
      const [, setState] = result.current;
      setState({ pageSize: 50 });
    });

    const [state] = result.current;
    expect(state.pageSize).toBe(50);
    expect(state.page).toBe(1);
  });
});
