import { prisma } from "@/modules/db/prisma";
import { getSetupReadiness } from "./readiness";

export async function getPrimaryWorkspaceSetup() {
  const workspace =
    (await prisma.workspace.findFirst({
      orderBy: { createdAt: "asc" },
      include: {
        bankAccounts: { orderBy: { createdAt: "asc" } },
        categories: { orderBy: { createdAt: "asc" } },
        people: { orderBy: { createdAt: "asc" } }
      }
    })) ??
    (await prisma.workspace.create({
      data: {
        name: "",
        gstRegistered: null,
        basFrequency: null,
        financialYearStartMonth: null
      },
      include: {
        bankAccounts: true,
        categories: true,
        people: true
      }
    }));

  const readiness = getSetupReadiness(workspace);
  return { workspace, readiness };
}
