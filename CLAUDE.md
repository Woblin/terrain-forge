# CLAUDE.md

## Project

Terrain Forge is a web app that generates battlefield layouts for tabletop wargames (Warhammer Fantasy, Warhammer 40,000, Age of Sigmar, One Page Rules, etc.).

**The problem it solves:** setting up terrain is slow, and a layout that one player places often favors one side. Terrain Forge generates a board that both players can accept as fair (balanced deployment zones, cover and line of sight) while still being varied and fun to play on.

Core features:
- **Battlefield generation** from the user's own terrain, with balance rules
- **Board editor:** drag and drop, rotate, add and remove terrain pieces
- **Terrain library:** each user's own collection of terrain pieces (type, size, footprint)
- **User accounts:** sign in to save the library and battlefields

## Tech stack

| Technology | Why |
| --- | --- |
| **Vite** | Fast dev server and builds, minimal configuration. |
| **React** | Component model fits an interactive editor with many independent pieces. |
| **TypeScript** (strict) | Board geometry and Firestore documents have exact shapes; types catch mistakes in coordinates, units and data models early. |
| **Tailwind CSS** | Fast styling directly in components without maintaining separate CSS files. |
| **Firebase** (Auth, Firestore, Hosting) | Login, database and hosting in one service with no backend of our own to run. |
| **Vitest** | Same config and transform pipeline as Vite. Used to test the generation logic. |

## Code conventions

- TypeScript `strict` mode. No `any`. Use `unknown` and narrow it instead.
- Function components and hooks only, no class components.
- Naming: `PascalCase` for components and types, `camelCase` for functions and variables, `useXxx` for hooks.
- One component per file. The file name matches the component name.
- Style with Tailwind classes. Do not add separate CSS files except `index.css` for Tailwind directives.
- Code, comments, commit messages and UI text are written in English.

## Architecture

```
src/
  domain/      Pure logic: types, geometry, generation algorithm, balance rules. No React, no Firebase.
  services/    All Firebase I/O (auth, Firestore reads/writes). The only place that imports firebase/*.
  hooks/       Connect React to services and domain (e.g. useTerrainLibrary, useAuth).
  components/  UI components. Get data and callbacks through props or hooks.
  pages/       Top-level views (generator, editor, library, login).
```

Principles:
- **All I/O happens in `services/`.** Components and `domain/` never call Firebase directly.
- **`domain/` is pure.** Same input gives the same output. The generator takes a seed so that results can be reproduced and tested.
- **Board coordinates are stored in inches**, not pixels. Converting to screen coordinates happens only in the rendering layer.
- **Users can choose inches or centimeters.** The unit is a display setting only: convert to and from inches at the UI edge (input fields, labels). `domain/` and Firestore always use inches. Keep the conversion in a single helper in `domain/`.
- **Functions do one thing.** If a function needs a comment to explain *what* it does, split it.
- **No global variables or global mutable state.** Shared state (e.g. the signed-in user) goes through React context. Configuration comes from `import.meta.env`.
- **Firestore data is validated** when it is read in `services/` before it reaches the rest of the app.
- **Errors are handled explicitly.** Never swallow exceptions. Show the user a clear message when a Firebase call fails.
- **Tests are written together with the code** in `domain/`, especially for the generation and balance rules.

## Rules: what the agent must NOT do

- **Do not switch away from Firebase**, and do not add another database or backend.
- **Do not add, remove or swap dependencies without asking first.** This also applies to libraries for drag and drop, state management and UI components.
- **Do not change the Firestore data model or `firestore.rules` without asking.** It affects existing user data and security.
- **Never commit `.env.local`** or any other API keys or secrets. Only `.env.example` is committed.
- **Never commit directly to `main`.** Work in feature branches.
- **Do not run `firebase deploy`.** Deploys are done either manually or by GitHub Actions when a PR is approved and merged into `main`. Do not change the deploy workflow in `.github/workflows/` without asking.
- **Do not change the balance rules in the generator without asking.** Fairness is the core of the product.
- Do not create new top-level folders in `src/` outside the structure above without asking.
