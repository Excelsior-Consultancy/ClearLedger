import { prisma } from "@/modules/db/prisma";
import { getSetupJourney, getSetupReadiness, type SetupJourney, type SetupReadiness } from "./readiness";
import { getWorkspaceAccess } from "@/modules/auth/service";
import { formatAbn, getCompanyProfileIssues, normalizeAbn } from "@/modules/company/profile";

export type WorkspaceProfileInput = {
  name: string;
  legalName: string;
  abn: string;
  address: string;
  contactEmail: string;
  gstRegistered: boolean | null;
  gstAccountingBasis: "CASH" | "ACCRUAL";
  basFrequency: "QUARTERLY" | "MONTHLY";
  financialYearStartMonth: number;
  invoicePrefix?: string | null;
};

type SetupWorkspaceRecord = {
  id: string;
  name: string;
  legalName: string | null;
  abn: string | null;
  address: string | null;
  contactEmail: string | null;
  gstRegistered: boolean | null;
  gstAccountingBasis: string | null;
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
    payrollBasis: string | null;
    hourlyRateCents: number | null;
    salaryPerPayPeriodCents: number | null;
    ordinaryHoursPerPayPeriod: number | null;
    superRateBps: number | null;
    tfnLast4: string | null;
    employmentStartDate: Date | null;
    employmentEndDate: Date | null;
    bankAccountName: string | null;
    bankAccountBsb: string | null;
    bankAccountNumber: string | null;
    notes: string | null;
    active: boolean;
  }>;
};

export type PrimaryWorkspaceSetup = {
  workspace: SetupWorkspaceRecord & { setupComplete: boolean };
  readiness: SetupReadiness;
  journey: SetupJourney;
};

export async function getPrimaryWorkspaceSetup(): Promise<PrimaryWorkspaceSetup> {
  const access = await getWorkspaceAccess();
  const workspace = (await prisma.workspace.findUnique({
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
        gstAccountingBasis: null,
        basFrequency: null,
        financialYearStartMonth: 7,
        quarterLocked: false
      },
      include: {
        bankAccounts: true,
        categories: true,
        people: true
      }
    })) as unknown as SetupWorkspaceRecord;

  const readiness = getSetupReadiness(workspace);
  const journey = getSetupJourney(workspace);
  return { workspace: { ...workspace, setupComplete: readiness.complete }, readiness, journey };
}

export async function saveWorkspaceProfile(workspaceId: string, input: WorkspaceProfileInput) {
  const normalizedAbn = normalizeAbn(input.abn);
  const validationIssues = getCompanyProfileIssues({
    name: input.name,
    legalName: input.legalName,
    abn: normalizedAbn,
    address: input.address,
    contactEmail: input.contactEmail,
    gstRegistered: input.gstRegistered,
    gstAccountingBasis: input.gstAccountingBasis,
    basFrequency: input.basFrequency,
    financialYearStartMonth: input.financialYearStartMonth,
    invoicePrefix: input.invoicePrefix
  });

  if (validationIssues.length > 0) {
    throw new Error(validationIssues[0].message);
  }

  const duplicate = await prisma.workspace.findFirst({
    where: {
      abn: normalizedAbn,
      NOT: { id: workspaceId }
    },
    select: { id: true, name: true, abn: true }
  });

  if (duplicate) {
    throw new Error(
      `That ABN is already registered for another workspace. Ask an admin to invite you to ${formatAbn(normalizedAbn)} instead.`
    );
  }

  return prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      name: input.name.trim(),
      legalName: input.legalName.trim(),
      abn: normalizedAbn,
      address: input.address.trim(),
      contactEmail: input.contactEmail.trim().toLowerCase(),
      gstRegistered: input.gstRegistered,
      gstAccountingBasis: input.gstAccountingBasis,
      basFrequency: input.basFrequency,
      financialYearStartMonth: input.financialYearStartMonth,
      invoicePrefix: input.invoicePrefix?.trim() || null
    }
  });
}
