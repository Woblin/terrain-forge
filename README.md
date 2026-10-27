# Terrain Forge

Auto-generate tabletop wargame battlefields with balanced terrain placement.

Terrain Forge is a web app that generates a battlefield layout for tabletop wargames such as **Warhammer Fantasy**, **Warhammer 40,000**, **Age of Sigmar** and **One Page Rules**. The goal is a board that both players agree is fair and that is still fun to play on: no lopsided deployment zones and no empty shooting galleries, but enough variety to make every game feel different.

> **Status:** Early development. Features below describe the planned scope of the project.

## Features

### Battlefield generation
- Generate a complete terrain layout with one click
- Balanced placement, so neither player gets an advantage in deployment, cover or line of sight
- Variety in each layout, so boards stay interesting from game to game
- Support for common board sizes (e.g. 44" × 60", 6' × 4')

### Board editor
- **Drag and drop** terrain pieces to adjust the generated layout
- **Rotate** pieces to fine-tune angles and firing lanes
- **Add** new pieces from your terrain library
- **Remove** pieces you don't want on the table

### Terrain library
- Build a library of the terrain you actually own
- Define each piece's footprint, size and type (e.g. ruins, forest, obstacle, building)
- Generate battlefields using only the terrain in your collection

### User accounts
- Sign in with Google or with an email and password to keep your terrain library and photos
- Email accounts save once the email address is verified
- Use the app without an account; your terrain then lasts until you reload the page
- Delete your account and everything saved with it from the account page
- Access your terrain from any device

## Tech stack

| Area | Technology |
| --- | --- |
| Build tool | [Vite](https://vitejs.dev/) |
| UI framework | [React](https://react.dev/) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore (terrain library, saved battlefields) |
| Hosting | Firebase Hosting |

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org/) 22.12 or newer (24 LTS recommended, see `.nvmrc`)
- [Yarn](https://yarnpkg.com/) 4, through Corepack (bundled with Node 22 and 24): run `corepack enable` once. The exact Yarn version is pinned in `package.json`.
- For local emulators: [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`) and Java 21 or newer
- For a real backend: a [Firebase](https://firebase.google.com/) project with Authentication and Firestore enabled

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/Woblin/terrain-forge.git
   cd terrain-forge
   ```
2. Install dependencies:
   ```bash
   yarn install
   ```
3. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   The example values work with the local emulators, no Firebase project needed. To use a real project, replace them with the config from the Firebase console under *Project settings → Your apps* and set `VITE_USE_EMULATORS=false`. Never commit `.env.local`.
4. Start the emulators (Auth, Firestore, and the Emulator UI on http://127.0.0.1:4000) in one terminal. The Auth emulator signs in with made-up Google and email accounts; verification and password reset links are printed in its log and listed in the Emulator UI.
   ```bash
   yarn emulators
   ```
5. Start the development server in another:
   ```bash
   yarn dev
   ```

### Scripts

| Script | What it does |
| --- | --- |
| `yarn dev` | Start the Vite dev server |
| `yarn build` | Type-check and build to `dist/` |
| `yarn preview` | Serve the production build locally |
| `yarn typecheck` | Run the TypeScript compiler without emitting |
| `yarn lint` | Run ESLint |
| `yarn format` / `format:check` | Format with Prettier / check formatting |
| `yarn test` / `test:watch` | Run Vitest once / in watch mode |
| `yarn test:rules` | Test `firestore.rules` against the Firestore emulator (needs the Firebase CLI and Java) |
| `yarn emulators` | Start the Firebase emulators, saving data to `.emulator-data/` |
| `yarn validate` | Typecheck, lint, format check and tests (what CI runs) |

### Deploy
Deploys are done manually by the maintainer:
```bash
yarn build
firebase login
firebase use <your-project-id>
firebase deploy
```

## Roadmap
- [x] Battlefield generation algorithm with balance rules
- [x] Board editor (drag and drop, rotate, add, remove)
- [x] Terrain library
- [x] Firebase Authentication (Google and email, verified email needed to save)
- [ ] Save and load battlefields
- [ ] Presets for popular game systems
- [ ] Export or share a battlefield (image / link)

## Contributing
Contributions, ideas and bug reports are welcome. Open an issue to discuss what you'd like to change.

## License
TBD
