/**
 * Everything a page adds on top of the descriptor: replacement cells, a
 * client-only actions column, a clamped long-text column, cache invalidation
 * after a mutation, and translated chrome.
 */
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  GridPage,
  invalidateGridRows,
  useClampedTextCell,
  useGridRowId,
  type GridMessages,
  type GridRow,
} from "@qrotux/gridraw-shadcn-react";
import { useGridUrlState } from "@qrotux/gridraw-shadcn-react/react-router";

const queryClient = new QueryClient();

/**
 * A cell rendered by an extraColumn. The id column is not passed as a prop:
 * useGridRowId reads it from the descriptor through context, so the component
 * works on any grid whatever its key column is named.
 */
function RowActions({ row }: { row: GridRow }) {
  const id = useGridRowId(row);
  const qc = useQueryClient();

  async function block() {
    await fetch(`/api/admin/users/${String(id)}/block`, { method: "POST" });
    // The rows query is keyed by the whole request; invalidateGridRows drops
    // every page of this grid so the table refetches with the current filters.
    await invalidateGridRows(qc, "users");
  }

  return (
    <button type="button" onClick={block} className="text-sm underline">
      Заблокировать
    </button>
  );
}

/** English defaults replaced with Russian; unlisted keys keep their default. */
const messages: Partial<GridMessages> = {
  loading: "Загрузка…",
  searchPlaceholder: "Поиск по {columns}…",
  rowsTotal: "Всего строк: {total}",
  empty: "Нет данных",
  rowsPerPage: "Строк на странице",
  prev: "Назад",
  next: "Вперёд",
  columns: "Колонки",
  visibleColumns: "Видимые колонки",
  reset: "Сбросить",
};

function UsersGrid() {
  const [state, setState] = useGridUrlState();

  // Called once per page, not per cell: the expanded flag is shared, so one
  // click opens the whole column and the values stay comparable row by row.
  const userAgentCell = useClampedTextCell({
    clamp: 40,
    labels: { expand: "Показать полностью", collapse: "Свернуть" },
    // A user agent is one long token; break-words would leave it overflowing.
    wrap: "break-all",
  });

  return (
    <GridPage
      name="users"
      state={state}
      onStateChange={setState}
      messages={messages}
      locale="ru-RU"
      cellOverrides={{
        // Wraps the built-in cell instead of reimplementing it: Default still
        // renders the em dash for null and formats the value by column type.
        email: ({ value, row }, Default) => (
          <a href={`mailto:${String(value)}`} title={String(row.name ?? "")}>
            <Default />
          </a>
        ),
        userAgent: userAgentCell,
      }}
      // Client-only columns: no sorting, no filtering, no column-picker entry.
      extraColumns={[
        {
          key: "actions",
          title: "Действия",
          pin: "right",
          render: (row) => <RowActions row={row} />,
        },
      ]}
      // `name` backs the email cell's tooltip but is hidden by default, so it
      // must be requested explicitly. The id column is always requested.
      extraFetch={["name"]}
    />
  );
}

export function UsersPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <UsersGrid />
    </QueryClientProvider>
  );
}
