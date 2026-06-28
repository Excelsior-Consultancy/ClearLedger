import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TARGET_MIGRATION = "20260606153223_init_setup";

const requiredTables = ["Workspace", "BankAccount", "Category", "Person"];
const requiredTypes = ["WorkspaceRole", "PersonType", "CategoryType", "GstTreatment", "BasTreatment", "BasFrequency"];

async function migrationTableExists() {
  const rows = await prisma.$queryRaw`
    SELECT to_regclass('_prisma_migrations') IS NOT NULL AS "exists"
  `;
  return rows[0]?.exists === true;
}

async function migrationIsFailed() {
  if (!(await migrationTableExists())) {
    return false;
  }

  const rows = await prisma.$queryRaw`
    SELECT 1
    FROM "_prisma_migrations"
    WHERE migration_name = ${TARGET_MIGRATION}
      AND finished_at IS NULL
      AND rolled_back_at IS NULL
    LIMIT 1
  `;
  return rows.length > 0;
}

async function objectExists(kind, name) {
  if (kind === "table") {
    const rows = await prisma.$queryRaw`
      SELECT to_regclass(${`"${name}"`}) IS NOT NULL AS "exists"
    `;
    return rows[0]?.exists === true;
  }

  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM pg_type
      WHERE typname = ${name}
    ) AS "exists"
  `;
  return rows[0]?.exists === true;
}

async function schemaLooksApplied() {
  const tables = await Promise.all(requiredTables.map((name) => objectExists("table", name)));
  if (tables.some((exists) => !exists)) {
    return false;
  }

  const types = await Promise.all(requiredTypes.map((name) => objectExists("type", name)));
  return !types.some((exists) => !exists);
}

async function main() {
  try {
    if (!(await migrationIsFailed())) {
      console.log(`No failed ${TARGET_MIGRATION} migration found. Skipping repair.`);
      return;
    }

    if (!(await schemaLooksApplied())) {
      throw new Error(
        `Failed migration ${TARGET_MIGRATION} is present, but the expected schema objects are not all in place. Manual recovery is required.`
      );
    }

    console.log(`Repairing failed migration ${TARGET_MIGRATION} by marking it as applied...`);
    execSync(`npx prisma migrate resolve --applied ${TARGET_MIGRATION}`, { stdio: "inherit" });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
