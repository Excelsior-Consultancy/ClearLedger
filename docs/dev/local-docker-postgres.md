# Local Docker and Postgres Setup

This is the MVP local development path for ClearLedger. It keeps Postgres local, persistent, and resettable without introducing managed infrastructure.

## Prerequisites

- Node.js 24+
- Docker
- npm dependencies installed with `npm install`

## Environment

Copy the local env example:

```bash
cp .env.example .env
```

The default local values match `docker-compose.yml`:

```bash
POSTGRES_PRISMA_URL="postgresql://clearledger:clearledger@localhost:54329/clearledger?schema=public"
POSTGRES_URL_NON_POOLING="postgresql://clearledger:clearledger@localhost:54329/clearledger?schema=public"
```

Prisma reads `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` from `prisma/schema.prisma`.

## Start From A Fresh Checkout

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Reset Local Data

Use this when Prisma reports schema drift or when you need a clean seeded database:

```bash
npm run db:reset
```

This drops local data only, reapplies tracked migrations, regenerates Prisma Client, and runs the seed script.

## Docker Notes

- The Postgres container is named `clearledger-postgres`.
- The host port is `54329`, which avoids collisions with a default Postgres install on `5432`.
- Data persists in the Docker volume `clearledger-postgres-data`.
- `npm run db:down` stops the container but keeps the volume.
- To fully remove local database state outside Prisma, run `docker compose down -v`.

## Failure Modes

- If `npm run db:migrate` reports drift, run `npm run db:reset`.
- If Postgres is not reachable, check `docker compose ps` and confirm the `db` service is healthy.
- If Prisma cannot find env vars, confirm `.env` contains both `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`.
