import { spawnSync } from "node:child_process";

function syncEnv(primaryName, fallbackName) {
  const primaryValue = process.env[primaryName]?.trim();
  const fallbackValue = process.env[fallbackName]?.trim();
  const resolvedValue = primaryValue || fallbackValue;

  if (resolvedValue) {
    process.env[primaryName] = resolvedValue;
    process.env[fallbackName] = resolvedValue;
  }
}

// Vercel projects in the repo history have used both env naming schemes.
// Normalize them before Prisma CLI commands run so either setup works.
syncEnv("DATABASE_URL", "POSTGRES_PRISMA_URL");
syncEnv("DIRECT_URL", "POSTGRES_URL_NON_POOLING");

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npx", ["prisma", "generate"]);
run("npx", ["next", "build"]);
