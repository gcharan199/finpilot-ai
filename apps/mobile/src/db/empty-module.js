// Empty stub for Node-only modules that must never be bundled into the app.
//
// `@finpilot/database` exposes a Node-only `createDb()` that lazily
// `import()`s `drizzle-orm/better-sqlite3` (for tests). The app never calls it
// — it builds its own `drizzle-orm/expo-sqlite` instance — but Metro resolves
// dynamic imports statically, so it would otherwise try to bundle
// `better-sqlite3` (which requires Node's `fs`). The Metro resolver aliases
// those specifiers to this stub. See metro.config.js.
module.exports = {};
