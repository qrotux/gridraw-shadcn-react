import { describe, it, expect } from "vitest";

import {
  coerceBoolean,
  coerceDatetimeLocal,
  coerceElement,
  coerceNumber,
  coerceText,
  datetimeLocalFromIso,
} from "./coerce";

describe("coerce", () => {
  it("reads an empty field as no value", () => {
    expect(coerceText("")).toBeUndefined();
    expect(coerceNumber("   ")).toBeUndefined();
    expect(coerceBoolean("")).toBeUndefined();
    expect(coerceDatetimeLocal("")).toBeUndefined();
  });

  it("keeps a decimal as its exact text", () => {
    expect(coerceText("19.90")).toBe("19.90");
  });

  it("types numbers and booleans, which the server rejects as strings", () => {
    expect(coerceNumber("42")).toBe(42);
    expect(coerceNumber("abc")).toBeUndefined();
    expect(coerceBoolean("true")).toBe(true);
    expect(coerceBoolean("false")).toBe(false);
  });

  it("round-trips a datetime through the local input form", () => {
    const iso = coerceDatetimeLocal("2024-03-05T14:30");
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(datetimeLocalFromIso(iso)).toBe("2024-03-05T14:30");
  });

  it("gives no input text for an unparseable instant", () => {
    expect(datetimeLocalFromIso("not a date")).toBe("");
    expect(datetimeLocalFromIso(undefined)).toBe("");
    expect(coerceDatetimeLocal("not a date")).toBeUndefined();
  });

  it("types a multi-value token by the element type", () => {
    expect(coerceElement("number", "7")).toBe(7);
    expect(coerceElement("number", "x")).toBeUndefined();
    expect(coerceElement("decimal", "7.50")).toBe("7.50");
    expect(coerceElement("uuid", "abc")).toBe("abc");
  });
});
