import { describe, it, expect } from "vitest";

import { applyGridStatePatch, parseGridState, parseSort, serializeGridState } from "./url-codec";
import type { GridState } from "./types";

const empty: GridState = { filters: [], sort: [], page: 1, q: "" };

describe("url codec", () => {
  it("parses defaults from empty params", () => {
    expect(parseGridState(new URLSearchParams())).toEqual({ ...empty, pageSize: undefined });
  });

  it("round-trips every field", () => {
    const state: GridState = {
      filters: [[{ field: "email", op: "contains", value: "a" }]],
      sort: [
        { column: "rating", dir: "desc" },
        { column: "email", dir: "asc" },
      ],
      page: 3,
      q: "hello",
      pageSize: 50,
    };
    expect(parseGridState(serializeGridState(state))).toEqual(state);
  });

  it("omits default values from the serialized params", () => {
    expect(serializeGridState(empty).toString()).toBe("");
    expect(serializeGridState({ ...empty, page: 1, q: "" }).toString()).toBe("");
  });

  it("drops duplicate and invalid sort segments (first wins)", () => {
    expect(parseSort("email:asc,email:desc,name:bogus")).toEqual([{ column: "email", dir: "asc" }]);
  });

  it("ignores malformed filters JSON and non-array payloads", () => {
    expect(parseGridState(new URLSearchParams("f=%7B")).filters).toEqual([]);
    expect(parseGridState(new URLSearchParams("f=%7B%22a%22:1%7D")).filters).toEqual([]);
  });

  it("clamps page to >= 1 and rejects non-positive page sizes", () => {
    expect(parseGridState(new URLSearchParams("page=0")).page).toBe(1);
    expect(parseGridState(new URLSearchParams("page=-2")).page).toBe(1);
    expect(parseGridState(new URLSearchParams("ps=0")).pageSize).toBeUndefined();
    expect(parseGridState(new URLSearchParams("ps=2.5")).pageSize).toBeUndefined();
  });
});

describe("applyGridStatePatch", () => {
  const onPage3: GridState = { ...empty, page: 3 };

  it("resets page to 1 when filters, q or pageSize change", () => {
    expect(applyGridStatePatch(onPage3, { q: "x" }).page).toBe(1);
    expect(applyGridStatePatch(onPage3, { filters: [[{ field: "a", op: "eq", value: 1 }]] }).page).toBe(1);
    expect(applyGridStatePatch(onPage3, { pageSize: 50 }).page).toBe(1);
  });

  it("keeps the page when only sort changes", () => {
    expect(applyGridStatePatch(onPage3, { sort: [{ column: "a", dir: "asc" }] }).page).toBe(3);
  });

  it("honours an explicit page in the same patch", () => {
    expect(applyGridStatePatch(onPage3, { q: "x", page: 2 }).page).toBe(2);
  });
});
