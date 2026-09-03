/**
 * Testing a component you render inside the grid, without mounting GridPage.
 *
 * RowActions calls useGridRowId, which reads the descriptor's id column from
 * context. GridPage installs that context; a bare render does not, and the
 * hook throws by design rather than guessing "id". GridIdColumnProvider is
 * exported for exactly this: it names the id column your grid uses.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  GridIdColumnProvider,
  invalidateGridRows,
  useGridRowId,
  type GridRow,
} from "@qrotux/gridraw-shadcn-react";

/** The component under test, as it appears in custom-cells-and-actions.tsx. */
function RowActions({ row }: { row: GridRow }) {
  const id = useGridRowId(row);
  const qc = useQueryClient();

  async function block() {
    await fetch(`/api/admin/users/${String(id)}/block`, { method: "POST" });
    await invalidateGridRows(qc, "users");
  }

  return (
    <button type="button" onClick={block}>
      Заблокировать
    </button>
  );
}

/** GridPage's two providers, reproduced around a single cell. */
function renderCell(row: GridRow, idColumn = "id") {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <GridIdColumnProvider idColumn={idColumn}>
        <RowActions row={row} />
      </GridIdColumnProvider>
    </QueryClientProvider>,
  );
}

describe("RowActions", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("posts to the endpoint of the row's id", async () => {
    renderCell({ id: "u-7", email: "a@example.com" });
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/admin/users/u-7/block", { method: "POST" }));
  });

  it("reads whatever column the descriptor declares as the key", async () => {
    // A grid keyed by "uuid" needs no change in RowActions: the column name
    // travels through the provider, not through a prop.
    renderCell({ uuid: "abc", email: "a@example.com" }, "uuid");
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/admin/users/abc/block", { method: "POST" }));
  });

  it("fails loudly when the row lacks the id column", () => {
    // The usual cause is a hand-written row stub. In the application the id
    // column is always in the rows request, so this cannot happen there.
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderCell({ email: "a@example.com" })).toThrow(/no column "id"/);
    quiet.mockRestore();
  });
});
