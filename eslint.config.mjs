import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import * as yamlParser from "yaml-eslint-parser";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.yml", "**/*.yaml"],
    languageOptions: {
      parser: yamlParser,
    },
    rules: {},
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "ref/**",
  ]),
]);

export default eslintConfig;
