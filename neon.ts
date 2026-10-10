import { defineConfig } from "@neon/config/v1";

// Variables the API function reads. Only those set locally are deployed; a missing one is left
// as already deployed.
const API_ENV = [
  "DATABASE_URL",
  "NEON_AUTH_URL",
  "NEON_AUTH_JWKS_URL",
  "GOOGLE_WEB_CLIENT_ID",
  "GOOGLE_WEB_CLIENT_SECRET",
  "GEMINI_API_KEY",
] as const;

export default defineConfig({
  auth: true,
  buckets: {
    uploads: { access: "private" },
  },
  functions: {
    api: {
      name: "api",
      source: "./server/functions/api.ts",
      env: Object.fromEntries(
        API_ENV.filter((k) => process.env[k]).map((k) => [k, process.env[k]!]),
      ),
    },
  },
});
