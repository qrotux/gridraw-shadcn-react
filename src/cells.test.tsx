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

  it("uuid → monospace text, value shown verbatim", () => {
    const id = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
    const { container } = render(<CellValue column={col({ type: "uuid" })} value={id} />);
    const span = container.querySelector("span");
    expect(span?.textContent).toBe(id);
    expect(span?.className).toContain("font-mono");
  });

  it("decimal → right-aligned string, keeping the stored scale", () => {
    const { container } = render(<CellValue column={col({ type: "decimal" })} value="4.10" />);
    const span = container.querySelector(".tabular-nums");
    expect(span?.textContent).toBe("4.10"); // not 4.1
    expect(span?.className).toContain("text-right");
  });

  it("date → formatted, calendar day does not shift by time zone", () => {
    const { container } = render(
      <GridI18nProvider value={{ messages: defaultGridMessages, locale: "en-GB" }}>
        <CellValue column={col({ type: "date" })} value="2026-07-31" />
      </GridI18nProvider>,
    );
    const text = container.querySelector(".tabular-nums")?.textContent ?? "";
    expect(text).toContain("31");
    expect(text).toContain("2026");
  });

  it("time → non-empty formatted text, invalid string falls back to raw", () => {
    const { container: ok } = render(<CellValue column={col({ type: "time" })} value="09:30:00" />);
    expect(ok.querySelector(".tabular-nums")?.textContent).toBeTruthy();

    const { container: bad } = render(<CellValue column={col({ type: "time" })} value="not-a-time" />);
    expect(bad.querySelector(".tabular-nums")?.textContent).toBe("not-a-time");
  });

  it("time step drives second precision: step 1 shows seconds, a minute step hides them", () => {
    const withSec = render(
      <GridI18nProvider value={{ messages: defaultGridMessages, locale: "en-GB" }}>
        <CellValue column={col({ type: "time", step: 1 })} value="09:30:45" />
      </GridI18nProvider>,
    );
    expect(withSec.container.textContent).toContain("45");

    const noSec = render(
      <GridI18nProvider value={{ messages: defaultGridMessages, locale: "en-GB" }}>
        <CellValue column={col({ type: "time", step: 900 })} value="09:30:45" />
      </GridI18nProvider>,
    );
    expect(noSec.container.textContent).not.toContain("45");
  });

  it("string array → each element shown", () => {
    const { container } = render(
      <CellValue column={col({ type: "string", array: true })} value={["alpha", "beta"]} />,
    );
    expect(container.textContent).toContain("alpha");
    expect(container.textContent).toContain("beta");
  });

  it("enum array → a badge per element with its label", () => {
    render(
      <CellValue
        column={col({
          type: "enum",
          array: true,
          filter: {
            operators: [],
            enumValues: [
              { value: "en", label: "English" },
              { value: "ru", label: "Russian" },
            ],
          },
        })}
        value={["en", "ru"]}
      />,
    );
    expect(screen.getByText("English")).toBeTruthy();
    expect(screen.getByText("Russian")).toBeTruthy();
  });

  it("number array → each number shown", () => {
    const { container } = render(
      <CellValue column={col({ type: "number", array: true })} value={[10, 20]} />,
    );
    expect(container.textContent).toContain("10");
    expect(container.textContent).toContain("20");
  });

  it("empty array → em-dash (no data), not an empty box", () => {
    const { container } = render(<CellValue column={col({ type: "string", array: true })} value={[]} />);
    expect(container.textContent).toBe("—");
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
