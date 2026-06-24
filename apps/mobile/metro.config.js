/**
 * Metro config — monorepo + NativeWind + drizzle migrations.
 *
 * 1. `watchFolders` points Metro at the repo root so the workspace packages
 *    (`@finpilot/*`, consumed as source) are watched and transpiled.
 * 2. `nodeModulesPaths` lets Metro resolve deps from both the app and the
 *    hoisted root `node_modules` (pnpm `node-linker=hoisted`).
 * 3. `'sql'` is added to `sourceExts` so `import x from "./0000.sql"` resolves
 *    (paired with `babel-plugin-inline-import` to inline the file as a string).
 * 4. A `resolveRequest` shim aliases the Node-only `better-sqlite3` path to an
 *    empty module. `@finpilot/database`'s `createDb()` lazily imports
 *    `drizzle-orm/better-sqlite3` (for Node tests); the app never calls it (it
 *    uses `drizzle-orm/expo-sqlite`), but Metro resolves dynamic imports
 *    statically and would otherwise try to bundle `better-sqlite3` → Node `fs`.
 * 5. `withNativeWind` wires the Tailwind pipeline to `global.css`.
 */
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the whole monorepo.
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from the app first, then the hoisted root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

// 3. Let drizzle migration `.sql` files be imported.
config.resolver.sourceExts = [...config.resolver.sourceExts, "sql"];

// 4. Alias the Node-only better-sqlite3 path (reached via @finpilot/database's
//    lazy createDb) to an empty module so it never bundles into the app.
const EMPTY_MODULE = path.resolve(projectRoot, "src/db/empty-module.js");
const NODE_ONLY = new Set(["better-sqlite3", "drizzle-orm/better-sqlite3"]);
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (NODE_ONLY.has(moduleName)) {
    return { type: "sourceFile", filePath: EMPTY_MODULE };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
