import { describe, it, expect } from "vitest";

import { interpolate, mergeMessages, defaultGridMessages } from "./messages";

describe("grid messages", () => {
  it("interpolates tokens", () => {
    expect(interpolate("{total} rows", { total: 3 })).toBe("3 rows");
    expect(interpolate("Search {columns}…", { columns: "a, b" })).toBe("Search a, b…");
  });
  it("merges partial over English defaults", () => {
    const m = mergeMessages({ next: "Suivant" });
    expect(m.next).toBe("Suivant");
    expect(m.prev).toBe(defaultGridMessages.prev); // untouched key falls back
  });
});
