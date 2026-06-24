/**
 * Type shim for `.sql` imports. At runtime `babel-plugin-inline-import` turns
 * `import x from "./0000.sql"` into a string literal; this tells TypeScript the
 * module's default export is a string.
 */
declare module "*.sql" {
  const content: string;
  export default content;
}
