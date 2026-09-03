import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { CellValue } from "./cells";
import { GridI18nProvider, defaultGridMessages } from "./messages";
import type { GridColumn } from "./core/types";

function col(overrides: Partial<GridColumn>): GridColumn {
  return {
    key: "c",
    type: "string",
    title: "C",
    sortable: false,
    defaultVisible: true,
    ...overrides,
  };
}

describe("CellValue", () => {
  it("null/undefined → em-dash", () => {
    const { rerender } = render(<CellValue column={col({ type: "string" })} value={null} />);
    expect(screen.getByText("—")).toBeTruthy();

    rerender(<CellValue column={col({ type: "string" })} value={undefined} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("boolean true → icon (svg), not the word true", () => {
    const { container } = render(<CellValue column={col({ type: "boolean" })} value={true} />);
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.textContent).not.toContain("true");
  });

  it("boolean false → icon (svg) too", () => {
    const { container } = render(<CellValue column={col({ type: "boolean" })} value={false} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("enum → Badge with label from enumValues", () => {
    render(
      <CellValue
        column={col({
          type: "enum",
          filter: {
            operators: [],
            enumValues: [{ value: "traveler", label: "Traveler" }],
          },
        })}
        value="traveler"
      />,
    );
    expect(screen.getByText("Traveler")).toBeTruthy();
  });

  it("enum → falls back to raw value when no label found", () => {
    render(<CellValue column={col({ type: "enum" })} value="unknown-value" />);
    expect(screen.getByText("unknown-value")).toBeTruthy();
  });

  it("datetime RFC3339 → non-empty tabular-nums text", () => {
    const { container } = render(
      <CellValue column={col({ type: "datetime" })} value="2026-07-31T12:34:56Z" />,
    );
    const span = container.querySelector(".tabular-nums");
    expect(span).toBeTruthy();
    expect(span?.textContent).toBeTruthy();
    expect(span?.textContent?.length).toBeGreaterThan(0);
  });

  it("number → right-aligned tabular-nums", () => {
    const { container } = render(<CellValue column={col({ type: "number" })} value={42} />);
    const span = container.querySelector(".tabular-nums");
    expect(span?.textContent).toBe("42");
    expect(span?.className).toContain("text-right");
  });

  it("datetime formatting follows the context locale (two locales → different output)", () => {
    const value = "2026-07-31T12:34:56Z";

    const { container: enContainer } = render(
      <GridI18nProvider value={{ messages: defaultGridMessages, locale: "en-US" }}>
        <CellValue column={col({ type: "datetime" })} value={value} />
      </GridI18nProvider>,
    );
    const enText = enContainer.querySelector(".tabular-nums")?.textContent;

    const { container: ruContainer } = render(
      <GridI18nProvider value={{ messages: defaultGridMessages, locale: "ru-RU" }}>
        <CellValue column={col({ type: "datetime" })} value={value} />
      </GridI18nProvider>,
    );
    const ruText = ruContainer.querySelector(".tabular-nums")?.textContent;

    expect(enText).toBeTruthy();
    expect(ruText).toBeTruthy();
    expect(enText).not.toBe(ruText);
  });

  it("json object → compact JSON, not [object Object]", () => {
    const { container } = render(
      <CellValue column={col({ type: "json" })} value={{ event: "probe", deviceCount: 1 }} />,
    );
    expect(container.textContent).toBe('{"event":"probe","deviceCount":1}');
    expect(container.textContent).not.toContain("[object Object]");
  });

  it("json array → compact JSON", () => {
    const { container } = render(
      <CellValue column={col({ type: "json" })} value={[{ field: "username" }]} />,
    );
    expect(container.textContent).toBe('[{"field":"username"}]');
  });

  it("json keeps the full text in title; the cell is clipped visually, not by data", () => {
    const value = { a: "x".repeat(200) };
    const { container } = render(<CellValue column={col({ type: "json" })} value={value} />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("truncate");
    expect(span?.getAttribute("title")).toBe(JSON.stringify(value));
  });

  it("json + null → em-dash, not the string null", () => {
    // container-scoped: this file has no cleanup (globals: false), so a
    // screen query for "—" would match earlier renders too.
    const { container } = render(<CellValue column={col({ type: "json" })} value={null} />);
    expect(container.textContent).toBe("—");
  });
});
