/**
 * Babel plugin: neutralize dynamic `import()` calls with a NON-literal specifier.
 *
 * Why this exists
 * ---------------
 * `@finpilot/ai-engine`'s `OnDeviceProvider` loads its native LLM lib via
 * `await import(specifier)` where `specifier` is a *variable* (so bundlers can't
 * eagerly resolve a lib that's only present in an EAS dev build). The Hermes
 * bytecode compiler — used for every React Native release/`expo export` bundle —
 * does NOT support `import()` with a non-literal argument and fails the whole
 * build with "Invalid expression encountered".
 *
 * This is a known Hermes limitation (see facebook/hermes; supabase-js #2380).
 *
 * What this does
 * --------------
 * It rewrites `import(<non-StringLiteral>)` into a rejected promise:
 *   `Promise.reject(new Error("dynamic import unavailable in this bundle"))`
 *
 * The on-device provider already wraps that import in `try/catch` and rethrows
 * its own actionable "needs a dev build" message, so the user-facing contract is
 * unchanged — the feature stays the documented dev-build path (docs/on-device.md)
 * and the standard export bundles cleanly. `import("literal")` is untouched, so
 * normal code-splitting still works.
 */
module.exports = function stripDynamicImport({ types: t }) {
  return {
    name: "strip-dynamic-import-nonliteral",
    visitor: {
      Import(path) {
        const callExpr = path.parentPath;
        if (!callExpr.isCallExpression()) return;
        const arg = callExpr.node.arguments[0];
        // Leave static `import("some-string")` alone — Hermes handles those.
        if (!arg || t.isStringLiteral(arg)) return;

        callExpr.replaceWith(
          t.callExpression(
            t.memberExpression(t.identifier("Promise"), t.identifier("reject")),
            [
              t.newExpression(t.identifier("Error"), [
                t.stringLiteral("dynamic import unavailable in this bundle"),
              ]),
            ],
          ),
        );
      },
    },
  };
};
