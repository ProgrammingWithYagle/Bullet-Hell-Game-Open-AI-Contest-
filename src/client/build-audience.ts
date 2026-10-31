declare const __GA_TESTING_BUILD__: boolean;
export type BuildAudience = "testing" | "public";
// Vite replaces this literal in the client and Solo worker; native tests default to testing.
export const TESTING_BUILD =
  typeof __GA_TESTING_BUILD__ === "undefined" ? true : __GA_TESTING_BUILD__;
export const BUILD_AUDIENCE: BuildAudience = TESTING_BUILD
  ? "testing"
  : "public";
