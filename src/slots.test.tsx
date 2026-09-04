import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { GridPage, type GridPageProps } from "./grid-page";
import type { GridComponents, GridClassNames } from "./slots";
import type { GridDescriptor, GridState } from "./core/types";
import descriptorFixtureRaw from "./__fixtures__/synthetic-descriptor.json";

const descriptorFixture = descriptorFixtureRaw as unknown as GridDescriptor;
const rows = [{ id: "1", name: "Alice", status: "active", createdAt: "2026-07-20T10:00:00Z" }];

function mockFetch() {
  return vi.fn(async (url: string) => {
    const json = (v: unknown) =>
      new Response(JSON.stringify(v), { status: 200, headers: { "Content-Type": "application/json" } });
    return url.endsWith("/rows")
      ? json({ rows, total: rows.length, hasPrev: false, hasNext: false })
      : json(descriptorFixture);
  });
}

// Marker components: each renders the same element as the default so the page
// keeps working, plus a data-testid the assertions look for.
const MarkerInput: GridComponents["Input"] = (props) => <input data-testid="mine-input" {...props} />;
const MarkerButton: GridComponents["Button"] = ({ variant, size, ...props }) => (
  <button data-testid="mine-button" data-variant={variant} data-size={size} {...props} />
);
const MarkerCell: GridComponents["TableCell"] = (props) => <td data-testid="mine-cell" {...props} />;

function renderPage(props: Partial<GridPageProps> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Harness() {
    const [state, setState] = React.useState<GridState>({ filters: [], sort: [], page: 1, q: "" });
    return (
      <GridPage
        name="synthetic"
        state={state}
        onStateChange={(patch) => setState((s) => ({ ...s, ...patch }))}
        {...props}
      />
    );
  }
  return render(
    <QueryClientProvider client={qc}>
      <Harness />
    </QueryClientProvider>,
  );
}

describe("component slots", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch()));
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the consumer's components instead of the built-in ones", async () => {
    renderPage({ components: { Input: MarkerInput, Button: MarkerButton, TableCell: MarkerCell } });
    await waitFor(() => expect(screen.getAllByTestId("mine-cell").length).toBeGreaterThan(0));
    expect(screen.getAllByTestId("mine-input").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("mine-button").length).toBeGreaterThan(0);
  });

  it("passes only the variants the slot contract declares", async () => {
    renderPage({ components: { Button: MarkerButton } });
    const buttons = await screen.findAllByTestId("mine-button");
    // The grid drives Button with "outline"/"ghost" and size "sm" only, which
    // is what the slot type promises a consumer's component will receive.
    for (const b of buttons) {
      expect(["outline", "ghost", undefined]).toContain(b.dataset.variant);
      expect(["sm", undefined]).toContain(b.dataset.size);
    }
  });

  it("leaves the other slots on their defaults", async () => {
    renderPage({ components: { Input: MarkerInput } });
    await waitFor(() => expect(screen.getAllByTestId("mine-input").length).toBeGreaterThan(0));
    expect(screen.queryByTestId("mine-button")).toBeNull();
    // the built-in Button is still what renders the toolbar action
    expect(screen.getByRole("button", { name: "+ Or group" })).toBeInTheDocument();
  });
});

describe("default components", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch()));
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // A call site passes Input a width, and cn() must merge that onto the
  // component's own classes rather than stand in for them. This pins the whole
  // src/ui copy reaching the DOM: an Input that lost its base string still
  // renders, still typechecks and still passes every other test — it is just
  // silently unstyled, with no border and no focus ring.
  it("merges the call-site class onto the built-in Input's own classes", async () => {
    renderPage();
    const search = await screen.findByRole("textbox");
    expect(search).toHaveClass("max-w-sm"); // from the call site
    expect(search).toHaveClass("border", "border-input", "rounded-md", "shadow-xs");
    expect(search).toHaveClass("focus-visible:border-ring", "focus-visible:ring-ring/50");
  });
});

describe("class overrides", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockFetch()));
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("appends the consumer's classes to the grid's own containers", async () => {
    const classNames: GridClassNames = { tableWrapper: "my-wrapper", cell: "my-cell" };
    const { container } = renderPage({ classNames });
    await waitFor(() => expect(container.querySelector(".my-wrapper")).not.toBeNull());
    // the built-in classes survive alongside the added one
    expect(container.querySelector(".my-wrapper")).toHaveClass("rounded-md", "border");
    expect(container.querySelector(".my-cell")).not.toBeNull();
  });
});
