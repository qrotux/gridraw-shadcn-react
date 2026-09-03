import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { GridPage, type GridPageProps } from "./grid-page";
import type { GridDescriptor, GridState } from "./core/types";
import descriptorFixtureRaw from "./__fixtures__/synthetic-descriptor.json";

// JSON import widens string-literal fields (`type`, `dir`) to `string` — cast
// through `unknown` to recover the narrowed GridDescriptor shape.
const descriptorFixture = descriptorFixtureRaw as unknown as GridDescriptor;

const rows = [
  { id: "1", name: "Alice", status: "active", createdAt: "2026-07-20T10:00:00Z", email: "alice@example.com" },
  { id: "2", name: "Bob", status: "inactive", createdAt: "2026-07-21T10:00:00Z", email: "bob@example.com" },
];

let lastRowsBody: { columns?: string[]; pageSize?: number; page?: number; search?: string } | null = null;
let rowsRequestCount = 0;

function mockFetch() {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const json = (v: unknown) =>
      new Response(JSON.stringify(v), { status: 200, headers: { "Content-Type": "application/json" } });
    if (url.endsWith("/rows")) {
      rowsRequestCount += 1;
      lastRowsBody = init?.body ? JSON.parse(String(init.body)) : null;
      return json({ rows, total: rows.length });
    }
    return json(descriptorFixture);
  });
}

/** Thin harness owning GridState locally (GridPage is controlled).
 *  `exposeSetState` hands the setter to a test so it can change the state
 *  from outside GridPage, the way a URL change would. */
type HarnessProps = Omit<GridPageProps, "name" | "state" | "onStateChange"> & {
  exposeSetState?: (set: (patch: Partial<GridState>) => void) => void;
};

function Harness({ exposeSetState, ...props }: HarnessProps) {
  const [state, setState] = React.useState<GridState>({ filters: [], sort: [], page: 1, q: "" });
  const apply = React.useCallback((patch: Partial<GridState>) => setState((s) => ({ ...s, ...patch })), []);
  React.useEffect(() => exposeSetState?.(apply), [exposeSetState, apply]);
  return <GridPage name="synthetic" state={state} onStateChange={apply} {...props} />;
}

function renderHarness(props: HarnessProps = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Harness {...props} />
    </QueryClientProvider>,
  );
}

describe("GridPage", () => {
  beforeEach(() => {
    lastRowsBody = null;
    rowsRequestCount = 0;
    vi.stubGlobal("fetch", mockFetch());
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders rows from the descriptor + rows fetch", async () => {
    renderHarness();
    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("applies a cellOverrides render for a string column, with Default rendering the standard CellValue", async () => {
    renderHarness({
      cellOverrides: {
        name: (ctx, Default) => (
          <>
            <span data-testid="name-override">OV:{String(ctx.value)}</span>
            <Default />
          </>
        ),
      },
    });

    await screen.findByText("Alice");
    // marker rendered once per row
    expect(screen.getAllByTestId("name-override")).toHaveLength(rows.length);
    expect(screen.getByText("OV:Alice")).toBeInTheDocument();
    // Default still renders the standard CellValue text alongside the marker
    expect(screen.getAllByText("Alice")).toHaveLength(1);
    expect(screen.getAllByText("Bob")).toHaveLength(1);
  });

  it("includes the extraFetch key and idColumn in the POST /rows request body", async () => {
    renderHarness({ extraFetch: ["email"] });

    await screen.findByText("Alice");
    await waitFor(() => expect(lastRowsBody).not.toBeNull());
    expect(lastRowsBody?.columns).toContain("email");
    expect(lastRowsBody?.columns).toContain(descriptorFixture.idColumn);
  });

  it("requests the server-driven default page size (descriptor.pageSize) when not overridden", async () => {
    renderHarness();
    await screen.findByText("Alice");
    await waitFor(() => expect(lastRowsBody).not.toBeNull());
    expect(lastRowsBody?.pageSize).toBe(descriptorFixture.pageSize); // 20 from the fixture
  });

  it("offers the server-provided page-size options in the selector", async () => {
    renderHarness();
    await screen.findByText("Alice");
    const select = screen.getByLabelText("Rows per page") as HTMLSelectElement;
    expect([...select.options].map((o) => Number(o.value))).toEqual(descriptorFixture.pageSizeOptions);
    expect(select.value).toBe(String(descriptorFixture.pageSize)); // default selected = server default
  });

  it("changing the page-size selector re-requests with the chosen size", async () => {
    renderHarness();
    await screen.findByText("Alice");
    await waitFor(() => expect(lastRowsBody?.pageSize).toBe(descriptorFixture.pageSize));

    fireEvent.change(screen.getByLabelText("Rows per page"), { target: { value: "50" } });
    await waitFor(() => expect(lastRowsBody?.pageSize).toBe(50));
  });

  it("fires exactly ONE rows request after the descriptor loads (no visible-columns init race)", async () => {
    renderHarness({ extraFetch: ["email"] });
    await screen.findByText("Alice");
    await waitFor(() => expect(lastRowsBody).not.toBeNull());
    // let any deferred effect / re-render settle — a regression would fire a
    // second request (first with only extraFetch+id, then the full set)
    await new Promise((r) => setTimeout(r, 60));

    expect(rowsRequestCount).toBe(1);
    // the single request already carries the full defaultVisible set, not the
    // intermediate "extraFetch + id" shape
    expect(lastRowsBody?.columns).toContain("name"); // a defaultVisible column
    expect(lastRowsBody?.columns).toContain("email"); // extraFetch
    expect(lastRowsBody?.columns).toContain(descriptorFixture.idColumn);
  });

  it('the toolbar "+ Or group" button opens the filters panel new-group editor', async () => {
    renderHarness();
    await screen.findByText("Alice");
    // no clause editor open initially
    expect(screen.queryByLabelText("Column")).toBeNull();

    fireEvent.click(screen.getByText("+ Or group"));
    // the panel's new-group ClauseEditor appears (column select, aria-label "Column")
    expect(screen.getByLabelText("Column")).toBeInTheDocument();
  });

  it("shows a header filter button only for filterable columns and opens a preselected editor", async () => {
    renderHarness();
    await screen.findByText("Alice");

    // synthetic fixture: name + status are filterable, createdAt is not → 2 buttons
    const filterBtns = screen.getAllByRole("button", { name: "Add filter for column" });
    expect(filterBtns).toHaveLength(2);

    // no editor open yet
    expect(screen.queryByLabelText("Column")).toBeNull();

    fireEvent.click(filterBtns[0]); // "name" header (first filterable column)
    // editor opens preselected to that column
    expect((screen.getByLabelText("Column") as HTMLSelectElement).value).toBe("name");
  });

  it("overwrites the search draft when state.q changes from outside (URL navigation)", async () => {
    let setState: ((patch: Partial<GridState>) => void) | null = null;
    renderHarness({ exposeSetState: (set) => (setState = set) });
    await screen.findByText("Alice");
    const input = screen.getByPlaceholderText(/Search/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "ali" } });
    expect(input.value).toBe("ali");
    // Debounce pushes the draft into state; the echo must not disturb the draft.
    await waitFor(() => expect(lastRowsBody).toMatchObject({ search: "ali" }));
    expect(input.value).toBe("ali");
    // External change (back button / link): the draft follows the state.
    act(() => setState?.({ q: "bob" }));
    await waitFor(() => expect(input.value).toBe("bob"));
    await waitFor(() => expect(lastRowsBody).toMatchObject({ search: "bob" }));
  });

  it("renders a passed-in message override in place of the default English string", async () => {
    renderHarness({ messages: { orGroup: "OVERRIDE" } });
    await screen.findByText("Alice");
    expect(screen.getByText("OVERRIDE")).toBeInTheDocument();
    expect(screen.queryByText("+ Or group")).toBeNull();
  });
});
