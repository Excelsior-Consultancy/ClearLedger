/**
 * One-off production setup script.
 * Targets the production Supabase DB via .env.production — never the local Docker instance.
 * Run with: npx tsx scripts/setup-production-workspace.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

// Load production env BEFORE PrismaClient is imported so it picks up the right DATABASE_URL
config({ path: resolve(process.cwd(), ".env.production"), override: true });

// Verify we're pointed at production, not localhost
const dbUrl = process.env.POSTGRES_PRISMA_URL ?? "";
if (dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")) {
  console.error("❌  Refusing to run: POSTGRES_PRISMA_URL points to localhost. Load .env.production first.");
  process.exit(1);
}
console.log(`✓ Targeting DB host: ${new URL(dbUrl).hostname}`);

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

async function main() {
  // 1. Upsert workspace with real company details
  await prisma.workspace.upsert({
    where: { id: "excelsior" },
    update: {
      name: "Excelsior Consultancy",
      legalName: "Excelsior Consultancy Pty Ltd",
      abn: "22 663 111 171",
    },
    create: {
      id: "excelsior",
      name: "Excelsior Consultancy",
      legalName: "Excelsior Consultancy Pty Ltd",
      abn: "22 663 111 171",
      address: "Sydney NSW",
      contactEmail: "owner@excelsior.com.au",
      gstRegistered: true,
      basFrequency: "QUARTERLY",
      financialYearStartMonth: 7,
      invoicePrefix: "EXC",
    },
  });
  console.log("✓ Workspace: Excelsior Consultancy Pty Ltd (ABN 22 663 111 171)");

  // 2. Skip if bank accounts already exist (idempotent)
  const existing = await prisma.bankAccount.count({ where: { workspaceId: "excelsior" } });
  if (existing > 0) {
    console.log(`ℹ  Bank accounts already exist (${existing} found) — skipping creation.`);
    return;
  }

  // 3. Create real bank accounts
  // Normalisation applied from Excel raw values:
  //   CBA / cba / CBA+Rewards / CBA-Raja  → CBA, owner Raja
  //   Westpac / westpac (Raja rows)        → Westpac, owner Raja
  //   Up / up                              → Up, owner Raja
  //   Wise / wise / westpac- wise          → Wise, owner Raja
  //   Other / Others / other               → Other, owner Raja
  //   westpac Charchit / westpac (Charchit rows) → Westpac, owner Charchit
  const accounts = await prisma.bankAccount.createManyAndReturn({
    data: [
      { workspaceId: "excelsior", name: "CBA",     bank: "Commonwealth Bank", label: "Expense account", ownerLabel: "Raja" },
      { workspaceId: "excelsior", name: "Westpac", bank: "Westpac",           label: "Expense account", ownerLabel: "Raja" },
      { workspaceId: "excelsior", name: "Up",      bank: "Up",                label: "Expense account", ownerLabel: "Raja" },
      { workspaceId: "excelsior", name: "Wise",    bank: "Wise",              label: "Expense account", ownerLabel: "Raja" },
      { workspaceId: "excelsior", name: "Other",   bank: "Other",             label: "Miscellaneous",   ownerLabel: "Raja" },
      { workspaceId: "excelsior", name: "Westpac", bank: "Westpac",           label: "Expense account", ownerLabel: "Charchit" },
    ],
  });

  console.log("✓ Created bank accounts:");
  for (const a of accounts) {
    console.log(`  [${a.id}]  ${(a.ownerLabel ?? "Unknown").padEnd(10)} ${a.name} (${a.bank})`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
