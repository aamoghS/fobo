import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  buckets: {
    uploads: { access: "private" },
  },
  functions: {
    api: {
      name: "api",
      source: "./server/functions/api.ts",
      env: {
        DATABASE_URL: process.env.DATABASE_URL!,
        NEON_AUTH_URL: process.env.NEON_AUTH_URL!,
        NEON_AUTH_JWKS_URL: process.env.NEON_AUTH_JWKS_URL!,
        GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID!,
        GOOGLE_WEB_CLIENT_SECRET: process.env.GOOGLE_WEB_CLIENT_SECRET!,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
        AUTH_SECRET: process.env.AUTH_SECRET!,
        PUBLIC_API_URL: "https://br-dawn-shadow-b59k4l6b-api.compute.c-7.us-east-2.aws.neon.tech",
      },
    },
  },
});
