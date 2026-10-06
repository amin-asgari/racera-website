import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".next-*/**",
    ".build-check*/**",
    "out/**",
    "build/**",
    "public/web-app/**",
    "cloudflare-vote-api/worker-configuration.d.ts",
    "next-env.d.ts",
  ]),
]);
