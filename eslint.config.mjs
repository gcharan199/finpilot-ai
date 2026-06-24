// Flat ESLint config (ESLint 9) shared across the whole workspace.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Never lint build output, deps, generated migration SQL, or CJS config
    // files (jest.config.cjs etc. are Node CommonJS, not part of the TS source).
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/migrations/**",
      "**/coverage/**",
      "**/*.cjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      // Allow intentionally-unused args/vars when prefixed with `_`.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // onDevice.ts intentionally uses require() inside a dynamic import shim.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // Test + eval files run in Node and use console freely.
    files: ["**/__tests__/**/*.ts", "**/eval/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
