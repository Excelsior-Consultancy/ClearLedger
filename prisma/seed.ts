import { prisma } from "@/modules/db/prisma";
import { seedDatabase } from "@/modules/dev/seedDatabase";

function parseSeedFlags(argv: string[]) {
  const flags = new Set(argv.slice(2));
  return {
    includeDemoFixtures: flags.has("--demo-fixtures")
      ? true
      : flags.has("--workbook-only")
        ? false
        : undefined
  };
}

async function main() {
  await seedDatabase(parseSeedFlags(process.argv));
}

if (process.argv[1]?.includes("/prisma/seed.ts") || process.argv[1]?.includes("\\prisma\\seed.ts")) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}

export { seedDatabase };
