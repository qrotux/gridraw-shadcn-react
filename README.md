# @qrotux/gridraw-shadcn-react

Server-driven data grid for React, styled with shadcn/ui and Tailwind v4. The
server describes each grid (columns, types, filters, sort, page sizes) and
serves rows; the page renders a toolbar, a filter panel, a table with
multi-sort and pagination, and keeps the request state in the URL.

The reference server implementation is
[gridraw-go](https://github.com/qrotux/gridraw-go). Any backend that speaks the
wire protocol below works.

## Install

```sh
npm install @qrotux/gridraw-shadcn-react
```

Installing straight from git also works; the `prepare` script builds `dist` on
install.

```sh
npm install github:qrotux/gridraw-shadcn-react#v0.1.0
```

Peer dependencies: `react`, `react-dom`, `@tanstack/react-query`,
`@tanstack/react-table`, `lucide-react`. `react-router-dom` is optional and
only needed for the `./react-router` entry.

## Styling

The components carry Tailwind utility classes and use the shadcn theme
variables (`--background`, `--muted`, `--accent`, `--primary`, `--destructive`,
`--input`, `--ring`, `--popover`, and their `-foreground` pairs). Your Tailwind
setup must scan the package output so the classes are generated:

```css
@import "tailwindcss";
@source "../node_modules/@qrotux/gridraw-shadcn-react/dist";
```

Adjust the relative path to your CSS entry file.

## Usage

`GridPage` is controlled: it renders the grid for `state` and reports changes
through `onStateChange`. A `QueryClientProvider` must be mounted above it.

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GridPage } from "@qrotux/gridraw-shadcn-react";
import { useGridUrlState } from "@qrotux/gridraw-shadcn-react/react-router";

const qc = new QueryClient();

export function UsersPage() {
  const [state, setState] = useGridUrlState();
  return (
    <QueryClientProvider client={qc}>
      <GridPage name="users" state={state} onStateChange={setState} />
    </QueryClientProvider>
  );
}
```

### GridPage props

| Prop            | Description                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`          | Grid name; forms the endpoint path.                                                                                                         |
| `basePath`      | Endpoint prefix, default `/api/admin/grids`.                                                                                                |
| `state`         | `GridState`: filters, sort, page, search, page size.                                                                                        |
| `onStateChange` | Receives a partial `GridState` patch.                                                                                                       |
| `cellOverrides` | `{ [columnKey]: (ctx, Default) => ReactNode }`. `ctx` has `value`, `row`, `column`; render `<Default />` to fall back to the built-in cell. |
| `extraColumns`  | Client-only columns: `{ key, title, pin?: "left" \| "right", render(row) }`. Not sortable or filterable, absent from the column picker.     |
| `extraFetch`    | Column keys to request even when hidden (for example fields used by `extraColumns`). The id column is always requested.                     |
| `messages`      | Partial `GridMessages` overriding the English chrome strings.                                                                               |
| `locale`        | BCP-47 locale for date formatting, default `en-GB`.                                                                                         |

### URL state

`useGridUrlState` from the root entry is router-agnostic:

```ts
useGridUrlState(params: URLSearchParams, setParams: (next: URLSearchParams) => void)
```

The `./react-router` entry wraps it with `useSearchParams` and replaces the
history entry on every change. The parameters are `f` (filters as JSON),
`sort` (`col:dir,col:dir`), `page`, `q` and `ps`. Changing filters, search or
page size resets the page to 1.

The pure codec lives in `./core`: `parseGridState`, `serializeGridState`,
`applyGridStatePatch`.

### Row identity

The id column name comes from the descriptor, not from the page. Inside any
component rendered by `GridPage` (cell overrides, extra columns):

```tsx
import { useGridRowId } from "@qrotux/gridraw-shadcn-react";

function Actions({ row }: { row: GridRow }) {
  const id = useGridRowId(row);
  ...
}
```

`useGridRowId` throws when the row lacks the id column; `useGridIdColumn`
returns the column name. Tests rendering such a component outside `GridPage`
wrap it in `GridIdColumnProvider`.

### Cache invalidation

Rows are cached by react-query under `["grid", name, "rows", request]`. After
a mutation:

```ts
import { invalidateGridRows } from "@qrotux/gridraw-shadcn-react";
invalidateGridRows(queryClient, "users");
```

The descriptor is cached with `staleTime: Infinity`.

### Long text cells

`useClampedTextCell({ clamp, labels, wrap })` builds a cell override that
truncates text to `clamp` characters and expands the whole column on click.
Call it once per page and pass the result in `cellOverrides`.

### Column visibility

Visible columns start from the descriptor's `defaultVisible` flags and persist
per grid in `localStorage` under `grid:<name>:columns`.

## Examples

Complete page snippets live in [`examples/`](examples/): the minimal
react-router page, cell overrides with an actions column, and URL state driven
without a router.

## Entries

| Entry            | Contents                                                                                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.`              | `GridPage`, `useGridUrlState` (router-agnostic), `invalidateGridRows`, `useClampedTextCell`, `GridIdColumnProvider`, `useGridIdColumn`, `useGridRowId`, `defaultGridMessages`, protocol types. |
| `./core`         | Protocol types and constants, `fetchDescriptor`, `fetchRows`, URL codec, `interpolate`. No React.                                                                                              |
| `./react-router` | `useGridUrlState()` bound to `react-router-dom`.                                                                                                                                               |

## Wire protocol

`GET {basePath}/{name}` returns the descriptor:

```json
{
  "name": "users",
  "idColumn": "id",
  "pageSize": 25,
  "pageSizeOptions": [10, 25, 50, 100],
  "defaultSort": { "column": "created_at", "dir": "desc" },
  "search": { "columns": ["Email", "Name"] },
  "columns": [
    {
      "key": "email",
      "type": "string",
      "title": "Email",
      "sortable": true,
      "defaultVisible": true,
      "filter": { "operators": [{ "op": "contains", "label": "contains" }] }
    },
    {
      "key": "role",
      "type": "enum",
      "title": "Role",
      "sortable": true,
      "defaultVisible": true,
      "filter": {
        "operators": [{ "op": "in", "label": "in" }],
        "enumValues": [{ "value": "admin", "label": "Admin" }]
      }
    }
  ]
}
```

Column types: `string`, `number`, `boolean`, `enum`, `datetime`, `json`.
Operators: `eq`, `contains`, `starts`, `gte`, `lte`, `between`, `in`.
`search` is `null` when the grid has no quick search; otherwise it lists the
titles of the searched columns for the placeholder.

`POST {basePath}/{name}/rows` takes:

```json
{
  "columns": ["email", "role", "id"],
  "filters": [
    [{ "field": "email", "op": "contains", "value": "a" }],
    [{ "field": "role", "op": "in", "value": ["admin"] }]
  ],
  "search": "bob",
  "sort": [{ "column": "email", "dir": "asc" }],
  "page": 1,
  "pageSize": 25
}
```

`filters` is in disjunctive normal form: the outer array is OR, each inner
array is AND. Values are typed per column: strings for `string` and `enum`,
numbers for `number`, booleans for `boolean`, RFC 3339 strings for
`datetime`, `[a, b]` for `between`, `string[]` for `in`. Empty `sort` means
the server default. The response is:

```json
{ "rows": [{ "email": "a@x", "role": "admin", "id": "..." }], "total": 1 }
```

`datetime` values arrive as RFC 3339 strings, `json` values as parsed JSON.

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
```
