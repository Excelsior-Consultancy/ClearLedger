import { prisma } from "@/modules/db/prisma";
import { getSetupReadiness } from "./readiness";
import { getWorkspaceAccess } from "@/modules/auth/service";

type SetupWorkspaceRecord = {
  id: string;
  name: string;
  legalName: string | null;
  abn: string | null;
  address: string | null;
  contactEmail: string | null;
  gstRegistered: boolean | null;
  basFrequency: string | null;
  financialYearStartMonth: number | null;
  invoicePrefix: string | null;
  quarterLocked: boolean;
  setupComplete: boolean;
  bankAccounts: Array<{
    id: string;
    name: string;
    bank: string;
    label: string;
    ownerLabel: string | null;
    active: boolean;
  }>;
  categories: Array<{
    id: string;
    name: string;
    type: string;
    defaultGstTreatment: string;
    basTreatment: string;
    active: boolean;
  }>;
  people: Array<{
    id: string;
    name: string;
    email: string | null;
    personType: string;
    workspaceRole: string;
    payrollEnabled: boolean;
    active: boolean;
  }>;
};

export async function getPrimaryWorkspaceSetup() {
  const access = await getWorkspaceAccess();
  const workspace = ((await prisma.workspace.findUnique({
    where: { id: access.workspaceId },
    include: {
      bankAccounts: { orderBy: { createdAt: "asc" } },
      categories: { orderBy: { createdAt: "asc" } },
      people: { orderBy: { createdAt: "asc" } }
    }
  })) ??
    (await prisma.workspace.create({
      data: {
        id: access.workspaceId,
        name: access.workspaceName,
        gstRegistered: null,
        basFrequency: null,
        financialYearStartMonth: 7,
        quarterLocked: false
      },
      include: {
        bankAccounts: true,
        categories: true,
        people: true
      }
  })) ?? (await prisma.workspace.create({
    data: {
      id: access.workspaceId,
      name: access.workspaceName,
      gstRegistered: null,
      basFrequency: null,
      financialYearStartMonth: 7,
      quarterLocked: false
    },
    include: {
      bankAccounts: true,
      categories: true,
      people: true
    }
  }))) as unknown as SetupWorkspaceRecord;

  const readiness = getSetupReadiness(workspace);
  return { workspace: { ...workspace, setupComplete: readiness.complete }, readiness };
}
