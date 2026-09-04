import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { GridPage } from "./grid-page";
import type { GridDescriptor, GridState } from "./core/types";
import descriptorFixtureRaw from "./__fixtures__/synthetic-descriptor.json";

const descriptorFixture = descriptorFixtureRaw as unknown as GridDescriptor;
const rows = [{ id: "1", name: "Alice", status: "active", createdAt: "2026-07-20T10:00:00Z" }];
const DESCRIBED = "status";

function mockFetch() {
  return vi.fn(async (url: string) => {
    const json = (v: unknown) =>
      new Response(JSON.stringify(v), { status: 200, headers: { "Content-Type": "application/json" } });
    return url.endsWith("/rows")
      ? json({ rows, total: 1, hasPrev: false, hasNext: false })
      : json(descriptorFixture);
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Harness() {
    const [state, setState] = React.useState<GridState>({ filters: [], sort: [], page: 1, q: "" });
    return (
      <GridPage
        name="synthetic"
        state={state}
        onStateChange={(patch) => setState((s) => ({ ...s, ...patch }))}
      />
    );
  }
  return render(
    <QueryClientProvider client={qc}>
      <Harness />
    </QueryClientProvider>,
  );
}

describe("column descriptions", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch()));
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("wraps a described header in a tooltip trigger and leaves the others alone", async () => {
    const { container } = renderPage();
    await screen.findByText("Alice");
    const triggers = container.querySelectorAll('[data-slot="tooltip-trigger"]');
    // Only the one fixture column carries a description; the header text is
    // still rendered, the trigger only wraps it.
    expect(triggers).toHaveLength(1);
    expect(triggers[0].textContent).toContain(
      descriptorFixture.columns.find((c) => c.key === DESCRIBED)?.title,
    );
  });

  it("marks the described column in the picker and describes it for assistive tech", async () => {
    renderPage();
    await screen.findByText("Alice");
    // Radix opens the menu on pointerdown, not on click.
    fireEvent.pointerDown(
      screen.getByRole("button", { name: /Columns/ }),
      new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
    );
    const described = descriptorFixture.columns.find((c) => c.key === DESCRIBED);
    expect(await screen.findByLabelText(described!.description!)).toBeInTheDocument();
    // Reachable without a mouse: the marker takes focus inside the menu.
    expect(screen.getByLabelText(described!.description!)).toHaveAttribute("tabindex", "0");
  });
});
