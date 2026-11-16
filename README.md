# Terrain Forge

Terrain Forge generates terrain layouts for tabletop wargames (Warhammer Fantasy, Warhammer 40,000, Age of Sigmar, One Page Rules) from the player's own terrain, so setup is quick and both sides can accept the board as fair.

**Live:** https://terrain-forge.web.app

## What it does

The user picks a game system, a deployment and which balance rules apply, and the app places terrain pieces on the board from a seed, so the same board can be generated again. The result can be adjusted by hand: drag, rotate, add and remove pieces, measure distances to the board edge and change the mat, while a fairness panel shows how well the board meets the balance rules. With an account (Google or email) users keep their own terrain library, with size and a photo for each piece, and save boards to open again later; without an account the app still works, but everything is lost when the page reloads.

## Getting started

### Requirements

- Node.js 22.12 or newer (24 LTS recommended, see `.nvmrc`)
- Yarn 4 through Corepack (bundled with Node): run `corepack enable` once. The exact version is pinned in `package.json`.
- For local development with emulators: the [Firebase CLI](https://firebase.google.com/docs/cli) and Java 21 or newer
- For a real backend: a Firebase project with Authentication (Google and email/password) and Firestore enabled

### Installation

```bash
git clone https://github.com/Woblin/terrain-forge.git
cd terrain-forge
yarn install
```

### Configuration

Create a `.env.local` file in the project root (Vite reads it; git ignores it, and it must never be committed). The easiest way is to copy the example:

```bash
cp .env.example .env.local
```

```
VITE_FIREBASE_API_KEY=your-value
VITE_FIREBASE_AUTH_DOMAIN=your-value
VITE_FIREBASE_PROJECT_ID=your-value
VITE_FIREBASE_STORAGE_BUCKET=your-value
VITE_FIREBASE_MESSAGING_SENDER_ID=your-value
VITE_FIREBASE_APP_ID=your-value
VITE_USE_EMULATORS=true
```

All required variables are listed in `.env.example`. Its example values work as they are with the local emulators, no Firebase project needed. For a real project, take the values from the Firebase console under _Project settings → Your apps_ and set `VITE_USE_EMULATORS=false`.

### Running the project

Start the emulators (Auth, Firestore and the Emulator UI at http://127.0.0.1:4000) in one terminal:

```bash
yarn emulators
```

Start the dev server in another (http://localhost:5180):

```bash
yarn dev
```

Other commands:

| Command | What it does |
| --- | --- |
| `yarn build` | Type-check and build for production to `dist/` |
| `yarn preview` | Serve the production build locally |
| `yarn test` / `yarn test:watch` | Run Vitest once / in watch mode |
| `yarn test:rules` | Test `firestore.rules` against the Firestore emulator (needs the Firebase CLI and Java) |
| `yarn lint`, `yarn typecheck`, `yarn format:check` | ESLint, TypeScript without output, Prettier check |
| `yarn validate` | Type check, lint, format check and tests (what CI runs) |

**Deploy:** every merge into `main` deploys automatically. The `deploy` job in `.github/workflows/ci.yml` runs after the checks pass, builds with the Firebase values from GitHub secrets (`VITE_FIREBASE_*` and `FIREBASE_SERVICE_ACCOUNT`) and runs `firebase deploy --only hosting,firestore`, so the site, `firestore.rules` and indexes go live together. To deploy by hand: make sure `.env.local` holds the real values and does not set `VITE_USE_EMULATORS=true` (the values are baked into the build), then run `yarn build` and `firebase deploy`.

## Architecture

Terrain Forge is a client-only app (a React SPA) with no backend of its own; Firebase handles sign-in, the database and hosting. The code is split into layers that depend in one direction: `pages` and `components` get data through `hooks`, which use `services` and `domain`. All generation and balance logic lives in `domain/`, which is plain TypeScript with no React or Firebase: the same input and seed always give the same board, which makes it easy to test. All Firebase I/O happens in `services/`, which also validates Firestore data with zod before it reaches the rest of the app. Board coordinates are always stored in inches; inches or centimeters is only a display setting, converted in the UI.

```
terrain-forge/
├── src/
│   ├── domain/          # Pure logic: types, geometry, generator, balance rules, line of sight, share links (with tests)
│   ├── services/        # All Firebase I/O (auth, Firestore), schema validation, image encoding, generation web worker
│   ├── hooks/           # Connect React to services and domain (e.g. useAuth, useTerrainLibrary)
│   ├── components/      # UI components, get data through props or hooks
│   ├── pages/           # Views: home, board, saved boards, library, sign-in, account
│   └── assets/mats/     # Board mat images
├── tests/rules/         # Tests of firestore.rules against the emulator
├── public/              # Static files (favicon)
├── .github/workflows/   # CI checks and automatic deploy to Firebase Hosting
├── firestore.rules      # Security rules: each user can only reach their own documents
├── firebase.json        # Hosting, Firestore and emulator settings
├── .env.example         # Template for environment variables
└── CLAUDE.md            # Conventions and rules for agent-driven development
```

## Tech stack

| Component | Choice | Reason |
| --- | --- | --- |
| Build tool | Vite | Fast dev server and builds with minimal configuration |
| UI | React | The component model fits an interactive editor with many independent parts |
| Language | TypeScript (strict) | Geometry and Firestore documents have exact shapes; types catch mistakes in coordinates, units and data models early |
| Styling | Tailwind CSS | Fast to style directly in components without separate CSS files |
| Routing | React Router | Established routing for a single-page app with several views |
| Validation | zod | Validates Firestore data on read so broken documents never reach the app |
| Sign-in | Firebase Authentication | Google and email/password without a server of our own |
| Database | Cloud Firestore | Per-user terrain library, photos and saved boards, protected by security rules |
| Hosting | Firebase Hosting | Same service as the rest, deployed automatically from GitHub Actions |
| Tests | Vitest | Same config and transform pipeline as Vite; tests the generator and balance rules |
| Package manager | Yarn 4 (Corepack) | Version pinned through `packageManager` in `package.json` |

## Limitations

- **No guarantee of fairness.** The balance rules measure deployment zones, coverage and line of sight in two dimensions. Height, the terrain rules of each game and how pieces are actually used at the table are not taken into account. When the terrain cannot meet every rule, the app shows the closest board it found and marks which rules failed.
- **Offline changes can be lost.** Firestore uses a memory cache, so a change made without a connection is only saved if the tab stays open until the connection returns. Closing the tab before then loses the change, even though the app says it will save later.
- **Error messages are sometimes too generic or too technical.** Every refused write is shown as a connection problem, and errors when reading data can show internal Firestore ids and field names.
- **No limit on documents per user.** The security rules cap the size of each document but not how many a user can create, which at worst could drive up the cost of the Firebase project. The site also lacks security headers such as a Content-Security-Policy.
- **Nothing is saved without an account.** Terrain and boards only last until the page reloads. Email accounts must be verified before anything is saved, and signing out gives no warning about unsaved changes.
- **Share links only recreate the generated board.** A link carries the seed, terrain and rules, but not pieces moved by hand.
- **Photos are stored at low resolution** directly in Firestore (no Cloud Storage), to keep size and cost down.
- **Other:** no 404 page for unknown addresses, only four preset game systems, no export to image.

## Built with

Claude Code (agent-driven development) as part of the course Next-Generation Software Development with AI.
