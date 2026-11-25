# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   bun install
   ```

2. Start the app

   ```bash
   bunx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
bun run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `bunx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## System design

How a request or a run moves through the code, then the choices behind that shape. In the decision charts, a **solid** box is the route this repo takes and a **dashed** box is the alternative it turns down; the edge label is the tradeoff.

### Request path

The Expo app (phone and web) talks to one API: a fetch handler deployed as a Neon Function. Every request runs as a single Postgres transaction with `SET LOCAL ROLE app_user`, so row-level security in the migrations decides what a user or a friend can read. Google Calendar and the Gemini planner sit behind the server, never on the device.

```mermaid
flowchart LR
  classDef chosen fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1b5e20
  classDef rejected fill:#f5f5f5,stroke:#9e9e9e,stroke-width:1px,stroke-dasharray:5 5,color:#616161
  app["Expo app: iOS, Android, web"]
  core["@fobo/core shared options and wording"]
  api["API fetch handler on a Neon Function"]
  auth["auth.ts: HS256 session or Neon Auth JWT"]
  tx["One transaction per request, SET LOCAL ROLE"]
  pg[("Neon Postgres with RLS")]
  views["friend_blocks and day_scores"]
  google["Google Calendar API"]
  gemini["Gemini: weigh and fix my week"]
  app -->|"30 s poll with If-None-Match"| api
  core -.-> app
  core -.-> api
  api --> auth --> tx --> pg
  pg --> views
  api -->|"server-held refresh token"| google
  api -->|"no transaction open during the call"| gemini
  class app,api,auth,tx,pg,views,google,gemini chosen
```

### Why this shape

Privacy lives in the database: friends read `friend_blocks` and `day_scores`, which hide titles by visibility, instead of the raw `events` table. Sign-in returns the API's own session because Neon Auth cannot sign in from a Google ID token and so cannot serve the phone apps. Polling with weak ETags keeps the client simple; a 304 costs little when nothing changed.

```mermaid
flowchart TD
  classDef chosen fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1b5e20
  classDef rejected fill:#f5f5f5,stroke:#9e9e9e,stroke-width:1px,stroke-dasharray:5 5,color:#616161
  priv{"Where friend privacy is enforced"}
  priv -->|"roles and RLS in SQL migrations, one rule for every route"| rls["Postgres RLS plus friend views"]
  priv -->|"each route filters, easy to miss one"| appcheck["Checks in route code only"]
  sess{"How the phone gets a session"}
  sess -->|"works for web, Expo Go and builds"| own["API-issued HS256 session after Google OAuth"]
  sess -->|"cannot sign in from an ID token"| neonauth["Neon Auth tokens only"]
  fresh{"How the app stays current"}
  fresh -->|"ETag makes an unchanged poll a 304"| poll["30 s polling"]
  fresh -->|"another moving part for one user's week"| push["Realtime socket"]
  gtoken{"Where the Google token lives"}
  gtoken -->|"encrypted in google_accounts, stays off the device"| server["Server-side sync"]
  gtoken -->|"token on every phone"| device["Sync on the device"]
  class rls,own,poll,server chosen
  class appcheck,neonauth,push,device rejected
```
