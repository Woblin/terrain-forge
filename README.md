# Terrain Forge

Auto-generate tabletop wargame battlefields with balanced terrain placement.

Terrain Forge is a web app that generates a battlefield layout for tabletop wargames such as **Warhammer 40,000**, **Age of Sigmar** and **One Page Rules**. The goal is a board that both players agree is fair and that is still fun to play on: no lopsided deployment zones and no empty shooting galleries, but enough variety to make every game feel different.

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
- Sign in to keep your terrain library and saved battlefields
- Access your boards from any device

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
- [Node.js](https://nodejs.org/) (LTS)
- A [Firebase](https://firebase.google.com/) project with Authentication and Firestore enabled
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`

### Setup
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd terrain-forge
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the project root with your Firebase configuration, found in the Firebase console under *Project settings → Your apps*:
   ```bash
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Deploy
```bash
npm run build
firebase login
firebase deploy
```

## Roadmap
- [ ] Battlefield generation algorithm with balance rules
- [ ] Board editor (drag and drop, rotate, add, remove)
- [ ] Terrain library
- [ ] Firebase Authentication
- [ ] Save and load battlefields
- [ ] Presets for popular game systems
- [ ] Export or share a battlefield (image / link)

## Contributing
Contributions, ideas and bug reports are welcome. Open an issue to discuss what you'd like to change.

## License
TBD
