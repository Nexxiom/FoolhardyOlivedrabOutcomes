# Solar Monitor

Application mobile Expo pour suivre en temps réel la production, la consommation et le solde d’une installation solaire.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/solar-monitor` — application mobile Expo et tableau de bord principal.
- `artifacts/api-server/src/routes/solar.ts` — proxy sécurisé vers l’API solaire externe.
- `lib/api-spec/openapi.yaml` — contrat de l’API interne et source de codegen.
- `artifacts/solar-monitor/constants/colors.ts` — palette énergie sombre de l’application.

## Architecture decisions

- La clé de l’API solaire reste dans le secret `SOLAR_API_KEY` et n’est jamais embarquée dans le client mobile.
- L’application appelle le proxy Express interne, ce qui évite d’exposer la clé dans les requêtes du téléphone.
- Le tableau de bord met en avant la dernière mesure et une tendance des 18 derniers points reçus.

## Product

Solar Monitor affiche la puissance solaire en direct, la consommation, l’injection ou l’import réseau, une tendance de production et quelques indicateurs de qualité des données. Les données peuvent être actualisées par geste de tirage ou via le bouton d’actualisation.

## User preferences

L’interface est en français.

## Gotchas

Après toute modification du contrat solaire, relancer le codegen de `@workspace/api-spec` avant de vérifier l’app mobile.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
