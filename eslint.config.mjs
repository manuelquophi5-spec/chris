import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Plain Node CLI scripts, run directly with `node`, not bundled by Next — CommonJS is intentional here.
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // eslint-plugin-react-hooks v7 (pulled in by eslint-config-next 16) enables React Compiler
    // rules as errors by default. This project has no babel-plugin-react-compiler configured in
    // next.config.ts, so these are pure style guidance, not enforcement of an adopted feature —
    // downgrade to warnings instead of blocking on ordinary fetch-on-mount effect patterns.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
