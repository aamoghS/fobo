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
        NEON_AUTH_JWKS_URL: process.env.NEON_AUTH_JWKS_URL!,
        GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID!,
        GOOGLE_WEB_CLIENT_SECRET: process.env.GOOGLE_WEB_CLIENT_SECRET!,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
        AUTH_SECRET: process.env.AUTH_SECRET!,
        GEMINI_MODEL: process.env.GEMINI_MODEL!,
        PUBLIC_API_URL: process.env.PUBLIC_API_URL!,
        CONTACT_EMAIL: process.env.CONTACT_EMAIL!,
        EXPO_GO_USERS: process.env.EXPO_GO_USERS ?? "",
        WEB_APP_ORIGINS: process.env.WEB_APP_ORIGINS ?? "",
      },
    },
  },
});
