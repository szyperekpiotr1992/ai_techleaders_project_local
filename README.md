# DevMentor

DevMentor jest monorepo npm Workspaces z aplikacją TypeScript opartą o Next.js i React. Pakiety znajdują się w `packages/`.

## Architektura

```text
.
├── package.json                 # npm Workspaces i skrypty repozytorium
└── packages/
    ├── app/                     # Aplikacja Next.js i jej konfiguracja
    │   ├── app/                 # Strony, layouty, trasy i globalne style
    │   └── public/              # Statyczne zasoby aplikacji
    ├── core/
    │   └── src/index.ts         # Publiczny punkt wejścia logiki współdzielonej
    ├── db/
    │   └── src/index.ts         # Publiczny punkt wejścia persystencji
    └── ui/
        └── src/index.ts         # Publiczny punkt wejścia komponentów UI
```

Pakiety `@devmentor/app`, `@devmentor/core`, `@devmentor/db` i `@devmentor/ui` są zadeklarowane jako npm Workspaces. Aplikacja Next.js oraz jej zasoby statyczne znajdują się w `packages/app`.

### Odpowiedzialność pakietów

- **`packages/app`** — udostępnia aplikację Next.js, strony i trasy; pełni rolę composition root i integruje usługi przez Awilix.
- **`packages/core`** — zawiera współdzielone reguły domenowe i typy bez zależności od Next.js, React ani MikroORM.
- **`packages/db`** — obsługuje PostgreSQL przez MikroORM; utrzymuje encje, konfigurację połączeń/puli oraz migracje.
- **`packages/ui`** — udostępnia wielokrotnego użytku komponenty UI; komponenty shadcn/ui dla ekranów administracyjnych powinny być współdzielone tutaj, a układ konkretnych stron pozostaje w aplikacji.

Utrzymuj acykliczny graf zależności. Pakiety współdzielone nie mogą zależeć od `packages/app`; logika domenowa należy do `packages/core`, persystencja do `packages/db`, a prezentacja do `packages/ui`.

## Technologie

- Next.js, React i TypeScript — aplikacja webowa.
- PostgreSQL i MikroORM — relacyjna baza danych, persystencja i migracje.
- Awilix — kontener Dependency Injection; konfiguruj i składaj zależności w composition root aplikacji.
- Tailwind CSS — style interfejsu.
- shadcn/ui — komponenty ekranów administracyjnych, współdzielone w pakiecie UI.

## Stan konfiguracji

`packages/app` używa Next.js 16.4.3 i React 19.3.0, Tailwind CSS 4 oraz Awilix. `packages/db` deklaruje MikroORM 7 i adapter PostgreSQL. Pakiety aplikacji mogą importować pakiety współdzielone przez eksporty `@devmentor/*`; Next.js transpile'uje ich źródła z workspace. Konfiguracja połączenia PostgreSQL, pula, jawne polecenia migracji i lazy DI są gotowe; rzeczywiste połączenie wymaga `DATABASE_URL` i dostępnego serwera PostgreSQL. Rejestr encji pozostaje pusty do czasu zdefiniowania schematu domenowego. shadcn/ui nie zostało jeszcze zainicjalizowane — pozostałą fazę migracji opisuje `.ai/specs/monorepo-migration-plan.md`.

### PostgreSQL i migracje

Skonfiguruj `DATABASE_URL`, `DB_POOL_MAX` (domyślnie `10`, zakres `1–100`) i `DB_POOL_IDLE_TIMEOUT_MS` (domyślnie `30000`, zakres `1–300000`) w środowisku uruchomieniowym. `.env.example` zawiera wyłącznie lokalny przykład bez rzeczywistych danych dostępowych. Moduł `@devmentor/db` waliduje URL przed połączeniem, utrzymuje współdzieloną pulę MikroORM i wyszukuje migracje w `packages/db/migrations`.

Uruchom migracje wyłącznie jawnie, po skonfigurowaniu środowiska:

```bash
npm run db:migrate
npm run db:migrate:down
```

`db:migrate:down` cofa ostatnią migrację. Nie uruchamiaj poleceń migracji na współdzielonej bazie bez zatwierdzenia. Build i start aplikacji nie wykonują migracji ani nie otwierają połączenia z bazą automatycznie. Aplikacja rejestruje `databaseFactory` w kontenerze Awilix; pobranie fabryki nie łączy się z bazą.

## Uruchamianie i kontrola

Wymagania: Node.js oraz npm. Najprostszą ścieżką jest uruchomienie z katalogu głównego:

```bash
npm run setup
```

Polecenie weryfikuje zainstalowane zależności, naprawia brakującą lub niezgodną instalację przez `npm ci`, a następnie uruchamia serwer deweloperski. Terminal pozostaje podłączony do serwera; zatrzymaj go przez `Ctrl+C`. Przy błędzie instalacji aplikacja nie zostanie uruchomiona.

Ręczna alternatywa pozostaje dostępna:

```bash
npm ci
npm run dev
```

`npm run setup` nie uruchamia migracji ani nie łączy się z bazą danych. Migracje PostgreSQL pozostają jawnym, osobnym krokiem opisanym wyżej.

Dostępne kontrole z katalogu głównego:

```bash
npm run lint
npm run typecheck
npm test
npm run test:unit
npm run test:integration
npm run build
```

`npm test` uruchamia Vitest z progami 100% pokrycia instrukcji, gałęzi, funkcji i linii dla kodu aplikacji, konfiguracji persystencji, warstwy dostępu do bazy oraz ekranów Next.js. `npm run test:integration` wymaga działającego Dockera: Testcontainers uruchamia tymczasowy PostgreSQL, test startuje zbudowaną aplikację i `agent-browser` sprawdza jej widok. Workflow GitHub Actions uruchamia lint, kontrolę typów, testy jednostkowe, build i test integracyjny przy każdym pull requeście.
