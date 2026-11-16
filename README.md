# Terrain Forge

Terrain Forge genererar terränguppställningar för bordskrigsspel (Warhammer Fantasy, Warhammer 40,000, Age of Sigmar, One Page Rules) av spelarens egen terräng, så att uppställningen går snabbt och båda sidor kan godta brädet som rättvist.

**Live:** https://terrain-forge.web.app

## Vad det gör

Användaren väljer spelsystem, deployment och vilka balansregler som ska gälla, och appen placerar ut terrängbitar på brädet med ett frö (seed) så att samma bräde kan återskapas. Resultatet går att justera för hand: dra, rotera, lägga till och ta bort bitar, mäta avstånd till brädkanten och byta underlag (mat), medan en rättvisepanel visar hur väl brädet håller balansreglerna. Med ett konto (Google eller e-post) sparas ett eget terrängbibliotek med mått och foto för varje bit, samt brädor som går att öppna igen; utan konto fungerar appen men allt försvinner när sidan laddas om.

## Kom igång

### Krav

- Node.js 22.12 eller senare (24 LTS rekommenderas, se `.nvmrc`)
- Yarn 4 via Corepack (följer med Node): kör `corepack enable` en gång. Exakt version är låst i `package.json`.
- För lokal utveckling med emulatorer: [Firebase CLI](https://firebase.google.com/docs/cli) och Java 21 eller senare
- För riktig backend: ett Firebase-projekt med Authentication (Google och e-post/lösenord) och Firestore aktiverat

### Installation

```bash
git clone https://github.com/Woblin/terrain-forge.git
cd terrain-forge
yarn install
```

### Konfiguration

Skapa en `.env.local`-fil i projektets rot (Vite läser den; den är ignorerad av git och ska aldrig committas). Enklast är att kopiera exemplet:

```bash
cp .env.example .env.local
```

```
VITE_FIREBASE_API_KEY=ditt-värde
VITE_FIREBASE_AUTH_DOMAIN=ditt-värde
VITE_FIREBASE_PROJECT_ID=ditt-värde
VITE_FIREBASE_STORAGE_BUCKET=ditt-värde
VITE_FIREBASE_MESSAGING_SENDER_ID=ditt-värde
VITE_FIREBASE_APP_ID=ditt-värde
VITE_USE_EMULATORS=true
```

Alla nödvändiga variabler finns listade i `.env.example`. Exempelvärdena där fungerar direkt mot de lokala emulatorerna utan något Firebase-projekt. För ett riktigt projekt hämtar du värdena i Firebase-konsolen under *Project settings → Your apps* och sätter `VITE_USE_EMULATORS=false`.

### Kör projektet

Starta emulatorerna (Auth, Firestore och Emulator UI på http://127.0.0.1:4000) i en terminal:

```bash
yarn emulators
```

Starta utvecklingsservern i en annan (http://localhost:5180):

```bash
yarn dev
```

Övriga kommandon:

| Kommando | Vad det gör |
| --- | --- |
| `yarn build` | Typkontroll och produktionsbygge till `dist/` |
| `yarn preview` | Servera produktionsbygget lokalt |
| `yarn test` / `yarn test:watch` | Kör Vitest en gång / i watch-läge |
| `yarn test:rules` | Testa `firestore.rules` mot Firestore-emulatorn (kräver Firebase CLI och Java) |
| `yarn lint`, `yarn typecheck`, `yarn format:check` | ESLint, TypeScript utan utdata, Prettier-kontroll |
| `yarn validate` | Typkontroll, lint, formatkontroll och tester (det som CI kör) |

**Driftsättning:** varje merge till `main` driftsätts automatiskt. Jobbet `deploy` i `.github/workflows/ci.yml` körs när kontrollerna gått igenom, bygger med Firebase-värdena från GitHub-secrets (`VITE_FIREBASE_*` och `FIREBASE_SERVICE_ACCOUNT`) och kör `firebase deploy --only hosting,firestore`, så sajten, `firestore.rules` och index publiceras tillsammans. Vid manuell driftsättning: se till att `.env.local` har riktiga värden och inte `VITE_USE_EMULATORS=true` (värdena bakas in i bygget), kör sedan `yarn build` och `firebase deploy`.

## Arkitektur

Terrain Forge är en ren klientapp (React-SPA) utan egen backend; Firebase sköter inloggning, databas och hosting. Koden är uppdelad i lager med en riktning: `pages` och `components` hämtar data via `hooks`, som i sin tur använder `services` och `domain`. All logik för generering och balans ligger i `domain/`, som är ren TypeScript utan React eller Firebase: samma indata och samma frö ger alltid samma bräde, vilket gör den lätt att testa. All I/O mot Firebase sker i `services/`, som också validerar Firestore-data med zod innan den når resten av appen. Brädets koordinater lagras alltid i tum; tum/cm är bara en visningsinställning som räknas om i gränssnittet.

```
terrain-forge/
├── src/
│   ├── domain/          # Ren logik: typer, geometri, generatorn, balansregler, siktlinjer, delningslänkar (med tester)
│   ├── services/        # All Firebase-I/O (auth, Firestore), schemavalidering, bildkodning, web worker för generering
│   ├── hooks/           # Kopplar React till services och domain (t.ex. useAuth, useTerrainLibrary)
│   ├── components/      # UI-komponenter, får data via props eller hooks
│   ├── pages/           # Vyer: start, bräde, sparade brädor, bibliotek, inloggning, konto
│   └── assets/mats/     # Bilder för brädunderlag
├── tests/rules/         # Tester av firestore.rules mot emulatorn
├── public/              # Statiska filer (favicon)
├── .github/workflows/   # CI (kontroller) och automatisk driftsättning till Firebase Hosting
├── firestore.rules      # Säkerhetsregler: varje användare når bara sina egna dokument
├── firebase.json        # Hosting-, Firestore- och emulatorinställningar
├── .env.example         # Mall för miljövariabler
└── CLAUDE.md            # Konventioner och regler för agentdriven utveckling
```

## Teknisk stack

| Komponent | Val | Anledning |
| --- | --- | --- |
| Byggverktyg | Vite | Snabb utvecklingsserver och bygge med minimal konfiguration |
| Gränssnitt | React | Komponentmodellen passar en interaktiv editor med många oberoende delar |
| Språk | TypeScript (strict) | Geometri och Firestore-dokument har exakta former; typerna fångar fel i koordinater, enheter och datamodeller tidigt |
| Styling | Tailwind CSS | Snabbt att styla direkt i komponenterna utan separata CSS-filer |
| Routing | React Router | Etablerad routing för en SPA med flera vyer |
| Validering | zod | Validerar Firestore-data vid läsning så att trasiga dokument inte når appen |
| Inloggning | Firebase Authentication | Google och e-post/lösenord utan egen server |
| Databas | Cloud Firestore | Terrängbibliotek, foton och sparade brädor per användare, skyddat med säkerhetsregler |
| Hosting | Firebase Hosting | Samma tjänst som resten, automatisk driftsättning från GitHub Actions |
| Tester | Vitest | Samma konfiguration och transformering som Vite; testar generatorn och balansreglerna |
| Pakethanterare | Yarn 4 (Corepack) | Låst version via `packageManager` i `package.json` |

## Begränsningar

- **Ingen garanti för rättvisa.** Balansreglerna mäter deployment-zoner, täckning och siktlinjer i två dimensioner. Höjd, terrängregler i det enskilda spelet och hur bitarna faktiskt används vid bordet ingår inte. När terrängen inte räcker för att uppfylla alla regler visas det närmaste brädet som gick att hitta, med en markering om vilka regler som inte höll.
- **Offlineändringar kan gå förlorade.** Firestore använder minnescache, så en ändring som görs utan nätverk sparas bara om fliken är öppen tills anslutningen kommer tillbaka. Stänger man fliken innan dess försvinner ändringen, trots att appen säger att den sparas senare.
- **Felmeddelanden är ibland för allmänna eller för tekniska.** Alla nekade skrivningar visas som ett anslutningsproblem, och fel vid inläsning av data kan visa interna Firestore-id:n och fältnamn.
- **Ingen gräns för antal dokument per användare.** Säkerhetsreglerna begränsar storleken på varje dokument men inte hur många en användare kan skapa, vilket i värsta fall kan driva upp kostnaden för Firebase-projektet. Sajten saknar också säkerhetshuvuden som Content-Security-Policy.
- **Utan konto sparas inget.** Terräng och brädor finns bara kvar tills sidan laddas om. E-postkonton måste verifieras innan något sparas, och den som loggar ut får ingen varning om osparade ändringar.
- **Delningslänkar återskapar bara det genererade brädet.** En länk innehåller seed, terräng och regler men inte handgjorda flyttningar av bitar.
- **Foton lagras i låg upplösning** direkt i Firestore (ingen Cloud Storage), för att hålla nere storlek och kostnad.
- **Övrigt:** ingen 404-sida för okända adresser, bara fyra förinställda spelsystem, ingen export till bild.

## Utvecklat med

Claude Code (agentdriven utveckling) som del av kursen Next-Generation Software Development with AI.
