import * as React from "react";

import { defaultGridMessages, type GridMessages } from "./core/messages";

export { interpolate } from "./core/interpolate";
export { defaultGridMessages, mergeMessages, type GridMessages } from "./core/messages";

export type GridI18n = { messages: Required<GridMessages>; locale: string };

const GridI18nContext = React.createContext<GridI18n>({
  messages: defaultGridMessages,
  locale: "en-GB",
});

export function GridI18nProvider({ value, children }: { value: GridI18n; children: React.ReactNode }) {
  return React.createElement(GridI18nContext.Provider, { value }, children);
}

export function useGridI18n(): GridI18n {
  return React.useContext(GridI18nContext);
}
