# Stoury API

Travel planner MVP backend built with Node.js, Express, PostgreSQL, and Sequelize.

This README is the developer guide for the repository. Swagger/OpenAPI is available in the app and should become the payload-level API reference, while this document covers project structure, setup, database workflow, conventions, and current implementation status.

## Current scope

The MVP plan covers:

- email/password authentication with JWT access and refresh tokens
- user profile and preference management
- curated destinations and attractions
- Batam-first dashboard home aggregation
- trip creation with trip-owned preference snapshots
- manual itinerary save and AI-assisted itinerary planning flows

Current workspace status:

- implemented: auth, users, preferences, destinations, attractions, trips, database schema, migrations, seeders, Swagger/OpenAPI wiring
- planned / still evolving: itinerary save endpoints, AI itinerary preview flow
- internal / operational only: admin Google Places attraction enrichment, which can be disabled per environment

## Tech stack

- Node.js
- Express 5
- PostgreSQL
- Sequelize 6
- Zod for request validation
- JWT for authentication
- Swagger UI / OpenAPI
- Jest + Supertest

## Quick start

1. Install dependencies.
2. Copy `.env.example` to `.env`.
3. Fill in JWT secrets and PostgreSQL credentials.
4. Initialize the database.
5. Start the API.

```bash
npm install
cp .env.example .env
npm run db:init
npm run dev
```

If you only want to boot the server with inline JWT secrets for a quick smoke test:

```bash
JWT_ACCESS_SECRET=change-me JWT_REFRESH_SECRET=change-me npm start
```

## API docs

- Swagger UI: `/docs`
- OpenAPI JSON: `/docs/openapi.json`
- OpenAPI assembly entry point: [`src/docs/openapi/index.js`](src/docs/openapi/index.js)

## Admin dashboard

- Admin login: `/admin/login`
- Admin dashboard: `/admin`
- The admin UI is server-rendered with EJS inside the same Express app and uses an `HttpOnly` access-token cookie scoped to `/admin`.
- The default non-production admin bootstrap still comes from the existing `SEED_ADMIN_*` environment variables in `.env.example`.

The OpenAPI document is composed from shared components plus per-module path files so future itinerary and AI-planning docs can be added without rewriting the existing sections.

Public catalog endpoints use `page` / `limit` pagination and return top-level `meta` with `page`, `limit`, `total`, and `totalPages`.
The public destination attraction endpoint also supports a destination-scoped `q` search term for the current mobile dashboard experience.

## Project structure

```text
.
├── docs/
│   └── schema.md
├── scripts/
│   └── model-check.js
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   ├── database/
│   │   ├── config/
│   │   ├── migrations/
│   │   ├── models/
│   │   ├── seeders/
│   │   ├── constants.js
│   │   ├── db-context.js
│   │   └── index.js
│   ├── docs/openapi/
│   ├── middlewares/
│   ├── modules/
│   │   ├── attractions/
│   │   ├── auth/
│   │   ├── destinations/
│   │   ├── preferences/
│   │   ├── trips/
│   │   └── users/
│   ├── routes/
│   ├── utils/
│   └── validators/
├── .env.example
├── .sequelizerc
├── package.json
└── plan.md
```

## Architecture notes

- `src/app.js` wires middleware, `/health`, Swagger, and the `/api` router.
- `src/server.js` starts the HTTP server.
- `src/routes/index.js` mounts the module routers.
- Each module follows a controller/service/validator split.
- `src/database/models/index.js` is the Sequelize model registry.
- `src/database/db-context.js` is the shared entry point for resolving models and wrapping transactional work.

## Active API modules

Mounted routes today:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/preferences/me`
- `PUT /api/preferences/me`
- `GET /api/destinations`
- `GET /api/destinations/:idOrSlug`
- `GET /api/dashboard/home`
- `GET /api/destinations/:destinationId/attractions`
- `GET /api/attractions/:idOrSlug`
- `GET /api/attractions/:idOrSlug/photo`
- `GET /api/trips`
- `POST /api/trips`
- `GET /api/trips/:tripId`
- `PATCH /api/trips/:tripId`
- `GET /health`

## Environment

Core app variables:

- `NODE_ENV`
- `PORT`
- `APP_NAME`
- `CLIENT_ORIGIN`
- `JWT_ACCESS_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_EXPIRES_IN`
- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_RATE_LIMIT_MAX`
- `ADMIN_ENRICHMENT_ENABLED`
- `ADMIN_ENRICHMENT_RATE_LIMIT_WINDOW_MS`
- `ADMIN_ENRICHMENT_RATE_LIMIT_MAX`
- `ADMIN_ENRICHMENT_BATCH_RATE_LIMIT_MAX`
- `ENABLE_HTTPS_UPGRADE_CSP`
- `OPENAPI_SERVER_URL`

Database variables:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME_TEST`
- `DB_USER_TEST`
- `DB_PASSWORD_TEST`
- `DB_NAME_PROD`
- `DB_USER_PROD`
- `DB_PASSWORD_PROD`
- `DATABASE_URL`
- `DATABASE_URL_TEST`
- `DATABASE_URL_PROD`
- `DB_LOGGING`
- `DB_SSL`

Notes:

- `src/config/env.js` validates the runtime app/auth env contract on boot.
- Admin enrichment is an internal admin-only operational feature. Set `ADMIN_ENRICHMENT_ENABLED=false` in shared environments if you want the traveler-facing MVP surface to stay isolated.
- When admin enrichment is enabled, `GOOGLE_PLACES_API_KEY` must also be configured. The app still boots if it is missing, but the admin enrichment routes return `503` and `/health` exposes the runtime state under `data.features.adminEnrichment`.
- User-facing attraction images should come from populated `thumbnailImageUrl` / `mainImageUrl` DB fields backed by owned/licensed asset URLs. The v1 rerunnable backfill command is `npm run assets:backfill` and it writes owned Stoury-managed SVG asset URLs plus `metadata.assetSource` provenance into attraction rows without overwriting good non-managed assets unless `--force` is used.
- `src/database/config/config.js` reads the PostgreSQL variables for Sequelize CLI and DB setup.
- If `DATABASE_URL`, `DATABASE_URL_TEST`, or `DATABASE_URL_PROD` is present, Sequelize uses that connection string for the matching environment.
- Leave `ENABLE_HTTPS_UPGRADE_CSP=false` when serving the app directly over plain HTTP on a VPS/IP. Set it to `true` only when the app is behind a real HTTPS terminator such as Nginx, Caddy, or a load balancer.
- Set `OPENAPI_SERVER_URL` if you want Swagger UI to offer a public VPS/base URL in its server selector.

## Database workflow

Sequelize CLI is configured through `.sequelizerc` and points at:

- config: `src/database/config/config.js`
- migrations: `src/database/migrations`
- models: `src/database/models`
- seeders: `src/database/seeders`

Common commands:

```bash
npm run db:create
npm run db:init
npm run db:migrate
npm run db:seed
npm run db:reset
npm run db:drop
npm run db:status
npm run db:migrate:undo
npm run db:seed:undo
```

Test database helpers:

```bash
npm run db:create:test
npm run db:init:test
npm run db:drop:test
```

`db:init` creates the development database, runs all migrations, and seeds the curated catalog in one flow. Use it for first-time local setup; use `db:reset` when the database already exists and you want to rebuild schema/data inside it.

Model registry smoke check:

```bash
npm run db:model-check
```

## Database design summary

The schema uses:

- UUID primary keys across core tables
- snake_case tables and columns
- `created_at` / `updated_at` timestamps
- persisted, hashed refresh tokens
- normalized roles via `roles` and `user_roles`
- trip-owned preference snapshots via `trip_preference_categories`
- curated destinations and attractions as the MVP source of truth
- provider enrichment fields on attractions, with internal workflow state for pending/review/failed tracking

Important database constraints:

- unique `users.email`, `destinations.slug`, `attractions.slug`
- unique provider attraction matches by `(external_source, external_place_id)` when both values are present
- same user cannot create overlapping trips for the same destination
- itinerary day numbering must stay sequential and within the trip date range
- the same attraction cannot appear twice in one trip
- itinerary items can only reference attractions from the trip destination

For the full schema summary, see [docs/schema.md](docs/schema.md). For a dedicated visual ERD, see [docs/database-relations.md](docs/database-relations.md).

## Seed data

The project includes curated data for:

- roles
- preference categories
- attraction categories
- destinations
- attractions
- attraction-category mappings
- a non-production QA user
- an admin bootstrap user

Seeded MVP destinations:

- Batam
- Yogyakarta
- Bali

Catalog density:

- 24 attractions for Batam
- 24 attractions for Yogyakarta
- 24 attractions for Bali

QA bootstrap user for development/test:

- email: `qa@stoury.local`
- password: `StouryQA123!`

Admin bootstrap user:

- email: `admin@stoury.co`
- password: `admin`
- seeded automatically in development/test
- for production, only seeded when `SEED_DEFAULT_ADMIN_USER=true`

These seeds are intended to support both manual planning flows and multi-day AI itinerary generation tests.

## Auth strategy

- Access tokens are JWT bearer tokens.
- Refresh tokens are also JWTs, but their SHA-256 hashes are persisted in `refresh_tokens`.
- Refresh rotates the stored token record by revoking the current token and issuing a new token pair.
- Logout revokes the supplied refresh token.

## Request lifecycle

Typical request flow:

1. Route receives the request.
2. Middleware handles auth, rate limiting, and validation.
3. Controller stays thin and delegates business logic.
4. Service uses models via `db-context`.
5. Centralized error handling shapes the final response.

## Conventions

- Use camelCase in Node.js code and snake_case in the database.
- Keep controllers thin and business rules in services.
- Use migrations for schema changes and seeders for fixed catalog data.
- Prefer transactional writes when touching multiple related tables.
- Keep curated data as the source of truth for MVP destination and attraction selection.

## Working with the schema

When changing persistence behavior:

1. Update or add a migration.
2. Update the corresponding Sequelize model.
3. Update seed data if the catalog contract changed.
4. Update [docs/schema.md](docs/schema.md) if the relational design or assumptions changed.
5. Re-run `npm run db:model-check`.

If you introduce a new constraint that affects trip, itinerary, or preference behavior, make sure it still matches the product decisions recorded in [plan.md](plan.md).

## Current assumptions

- Refresh tokens are persisted in the database as hashed records.
- Different-destination trips may overlap; same-destination overlaps are rejected.
- Attraction slugs are globally unique.
- `budget` is numeric and does not yet include a currency column.
- The itinerary schema already exists even though the itinerary API layer is still pending.

## Verification

Useful checks:

```bash
npm test
npm run db:model-check
find src scripts -name '*.js' -print0 | xargs -0 -n1 node --check
```
