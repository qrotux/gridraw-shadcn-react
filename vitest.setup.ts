// Registers jest-dom matchers on vitest's expect at runtime. Types for tsc
// come from src/vitest-env.d.ts.
import "@testing-library/jest-dom/vitest";

// jsdom ships no ResizeObserver; Radix primitives construct one on mount.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
