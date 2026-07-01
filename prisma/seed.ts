import { prisma } from "@/modules/db/prisma";
import { seedDatabase } from "@/modules/dev/seedDatabase";

async function main() {
  await seedDatabase();
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
