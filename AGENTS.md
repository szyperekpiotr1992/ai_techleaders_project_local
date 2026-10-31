# DevMentor — Agent Guidelines

Pracuj nad DevMentor zgodnie z obecnym kodem i docelową architekturą monorepo opisaną w `README.md`.

## Task Router

| When the task involves… | Read first | Key rules |
|---|---|---|
| Dodawanie lub zmiana stron, tras i stylów Next.js | `packages/app/app/` | Zachowaj działający układ aplikacji; sprawdź dokumentację zainstalowanej wersji Next.js przed zmianą kodu. |
| Granice pakietów, zależności i architektura | `README.md` | Zachowaj zależności workspace w kierunku aplikacji; umieszczaj persystencję w `packages/db` i komponenty współdzielone w `packages/ui`. |
| Skrypty, TypeScript i lint | `package.json` | Używaj skryptów npm z katalogu głównego i zachowuj ścisłe typowanie. |

## Always

1. **MUST zachować rozdział odpowiedzialności pakietów** — `app` składa aplikację, `core` przechowuje logikę domenową niezależną od frameworka, `db` integruje PostgreSQL przez MikroORM, a `ui` udostępnia współdzielone komponenty interfejsu.
2. **MUST zachować kierunek zależności** — aplikacja może integrować pakiety; żaden pakiet współdzielony nie może zależeć od `packages/app`, a graf zależności musi pozostać acykliczny.
3. **MUST umieszczać aplikację Next.js i jej konfigurację w `packages/app`** — traktuj `packages/app/app` jako katalog tras, `packages/app/public` jako statyczne zasoby, a `packages/*` jako workspace'y npm.
4. **MUST sprawdzić dokumentację Next.js zainstalowaną w `node_modules/next/dist/docs/`** przed zmianą kodu Next.js i stosować wskazówki zgodne z wersją z `packages/app/package.json`.
5. **MUST umieszczać encje, konfigurację persystencji i migracje MikroORM w `packages/db`**; migracje mają opisywać schemat, a połączenia z PostgreSQL mają korzystać ze wspólnej konfiguracji puli.
6. **MUST uruchomić dostępne kontrole** po zmianach: `npm run lint`, `npm run typecheck`, `npm test` i `npm run build` dla zmian w kodzie lub typach.
7. **MUST zapewnić 100% pokrycia testami jednostkowymi każdej nowej funkcji**; dodaj testy dla wszystkich jej gałęzi, uruchom `npm run test:unit` i nie obniżaj progów pokrycia.

## Ask First

- Zapytaj przed zastąpieniem npm Workspaces innym menedżerem workspace lub dodaniem osobnego orkiestratora monorepo.
- Zapytaj przed dodaniem lub zamianą głównych technologii bądź zależności sprzecznych z ustaleniami: Next.js, TypeScript, React, PostgreSQL, MikroORM, Awilix, Tailwind i shadcn/ui.
- Zapytaj przed zmianą istniejących danych, kontraktu persystencji albo uruchomieniem migracji na współdzielonej bazie.

## Never

- Never umieszczaj reguł domenowych w komponentach UI ani kodu zależnego od MikroORM/PostgreSQL w `packages/core`.
- Never umieszczaj kodu serwerowego, dostępu do bazy ani sekretów w komponentach klienckich lub pakiecie `packages/ui`.
- Never edytuj ręcznie plików generowanych przez Next.js ani zawartości `.next/`; nie umieszczaj sekretów w kodzie, dokumentacji ani logach.

## Validation Commands

```bash
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
```

## Struktura

Bieżąca struktura: `packages/app/app/`, `packages/app/public/`, `packages/core/src/`, `packages/db/src/`, `packages/ui/src/`.
Konfiguracja aplikacji: `packages/app/next.config.ts`, `packages/app/tsconfig.json`.
Workspaces i skrypty: `package.json`.

## Cross-Reference

- **Docelowa architektura, odpowiedzialności pakietów i stan konfiguracji**: `README.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
