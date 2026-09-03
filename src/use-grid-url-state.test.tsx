import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import * as React from "react";

import { useGridUrlState } from "./use-grid-url-state";

/** Drives the router-agnostic hook with an in-memory URLSearchParams pair. */
function useHarness(initial: string) {
  const [params, setParams] = React.useState(() => new URLSearchParams(initial));
  return { params, ...Object.fromEntries([["hook", useGridUrlState(params, setParams)]]) } as {
    params: URLSearchParams;
    hook: ReturnType<typeof useGridUrlState>;
  };
}

describe("useGridUrlState (router-agnostic)", () => {
  it("parses the given params and writes back through the setter", () => {
    const { result } = renderHook(() => useHarness("sort=email:asc&page=2"));
    expect(result.current.hook[0]).toMatchObject({ sort: [{ column: "email", dir: "asc" }], page: 2 });

    act(() => result.current.hook[1]({ q: "bob" }));

    expect(result.current.params.get("q")).toBe("bob");
    expect(result.current.params.get("page")).toBeNull(); // reset to 1, omitted
    expect(result.current.hook[0]).toMatchObject({
      q: "bob",
      page: 1,
      sort: [{ column: "email", dir: "asc" }],
    });
  });
});
