// Lint for the search shell: TypeScript's recommended rules plus React's hooks rules, which is
// what the eslint-disable react-hooks/exhaustive-deps comments in components/ assume.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    rules: {
      // The React Compiler rules in the v7 preset flag the deliberate "latest value in a ref"
      // pattern in SearchApp; keep them visible as warnings, not merge-blocking.
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
      // Storage access is wrapped in try/catch {} on purpose (private mode, blocked storage).
      "no-empty": ["error", { allowEmptyCatch: true }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
);
