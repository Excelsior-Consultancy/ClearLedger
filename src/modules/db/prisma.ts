import { PrismaClient } from "@prisma/client";

function resolvedEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}

const postgresPrismaUrl = resolvedEnv("DATABASE_URL", "POSTGRES_PRISMA_URL");
if (postgresPrismaUrl) {
  process.env.DATABASE_URL = postgresPrismaUrl;
  process.env.POSTGRES_PRISMA_URL = postgresPrismaUrl;
}

const postgresDirectUrl = resolvedEnv("DIRECT_URL", "POSTGRES_URL_NON_POOLING");
if (postgresDirectUrl) {
  process.env.DIRECT_URL = postgresDirectUrl;
  process.env.POSTGRES_URL_NON_POOLING = postgresDirectUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
