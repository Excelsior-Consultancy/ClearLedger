"use server";

import { revalidatePath } from "next/cache";
import {
  BasFrequency,
  BasTreatment,
  CategoryType,
  GstTreatment,
  PersonType,
  PayrollBasis,
  WorkspaceRole
} from "@prisma/client";
import { prisma } from "@/modules/db/prisma";
import { canManageCompany, getWorkspaceAccess } from "@/modules/auth/service";
import { assertQuarterEditable } from "@/modules/shared/quarterGuard";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function intOrNull(formData: FormData, key: string): number | null {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function floatOrNull(formData: FormData, key: string): number | null {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOrNull(formData: FormData, key: string): Date | null {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function updateCompanySetup(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    throw new Error("Only admins can edit company setup.");
  }
  const workspaceId = access.workspaceId;
  await assertQuarterEditable(workspaceId);
  const month = Number(text(formData, "financialYearStartMonth") || 7);

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      name: text(formData, "name"),
      legalName: text(formData, "legalName") || null,
      abn: text(formData, "abn") || null,
      address: text(formData, "address") || null,
      contactEmail: text(formData, "contactEmail") || null,
      gstRegistered: text(formData, "gstRegistered") === "true",
      basFrequency: text(formData, "basFrequency") as BasFrequency,
      financialYearStartMonth: month,
      invoicePrefix: text(formData, "invoicePrefix") || null
    }
  });

  revalidatePath("/");
  revalidatePath("/admin/setup");
  revalidatePath("/expenses");
}

export async function addBankAccount(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    throw new Error("Only admins can edit company setup.");
  }
  await assertQuarterEditable(access.workspaceId);
  await prisma.bankAccount.create({
    data: {
      workspaceId: access.workspaceId,
      name: text(formData, "name"),
      bank: text(formData, "bank"),
      label: text(formData, "label"),
      ownerLabel: text(formData, "ownerLabel") || null
    }
  });

  revalidatePath("/admin/setup");
  revalidatePath("/");
  revalidatePath("/expenses");
}

export async function setBankAccountActive(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    throw new Error("Only admins can edit company setup.");
  }
  await assertQuarterEditable(access.workspaceId);
  const id = text(formData, "id");
  const record = await prisma.bankAccount.findFirst({ where: { id, workspaceId: access.workspaceId } });
  if (!record) {
    throw new Error("Bank account not found in this company.");
  }
  await prisma.bankAccount.update({
    where: { id },
    data: { active: text(formData, "active") === "true" }
  });

  revalidatePath("/admin/setup");
  revalidatePath("/");
  revalidatePath("/expenses");
}

export async function addCategory(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    throw new Error("Only admins can edit company setup.");
  }
  await assertQuarterEditable(access.workspaceId);
  await prisma.category.create({
    data: {
      workspaceId: access.workspaceId,
      name: text(formData, "name"),
      type: text(formData, "type") as CategoryType,
      defaultGstTreatment: text(formData, "defaultGstTreatment") as GstTreatment,
      basTreatment: text(formData, "basTreatment") as BasTreatment
    }
  });

  revalidatePath("/admin/setup");
  revalidatePath("/");
  revalidatePath("/expenses");
}

export async function setCategoryActive(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    throw new Error("Only admins can edit company setup.");
  }
  await assertQuarterEditable(access.workspaceId);
  const id = text(formData, "id");
  const record = await prisma.category.findFirst({ where: { id, workspaceId: access.workspaceId } });
  if (!record) {
    throw new Error("Category not found in this company.");
  }
  await prisma.category.update({
    where: { id },
    data: { active: text(formData, "active") === "true" }
  });

  revalidatePath("/admin/setup");
  revalidatePath("/");
  revalidatePath("/expenses");
}

export async function addPerson(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    throw new Error("Only admins can edit company setup.");
  }
  await assertQuarterEditable(access.workspaceId);
  await prisma.person.create({
    data: {
      workspaceId: access.workspaceId,
      name: text(formData, "name"),
      email: text(formData, "email") || null,
      personType: text(formData, "personType") as PersonType,
      workspaceRole: text(formData, "workspaceRole") as WorkspaceRole,
      payrollEnabled: text(formData, "payrollEnabled") === "true",
      payrollBasis: (text(formData, "payrollBasis") || null) as PayrollBasis | null,
      hourlyRateCents: intOrNull(formData, "hourlyRateCents"),
      salaryPerPayPeriodCents: intOrNull(formData, "salaryPerPayPeriodCents"),
      ordinaryHoursPerPayPeriod: floatOrNull(formData, "ordinaryHoursPerPayPeriod"),
      superRateBps: intOrNull(formData, "superRateBps") ?? 1100,
      tfnLast4: text(formData, "tfnLast4") || null,
      employmentStartDate: dateOrNull(formData, "employmentStartDate"),
      employmentEndDate: dateOrNull(formData, "employmentEndDate"),
      bankAccountName: text(formData, "bankAccountName") || null,
      bankAccountBsb: text(formData, "bankAccountBsb") || null,
      bankAccountNumber: text(formData, "bankAccountNumber") || null,
      notes: text(formData, "notes") || null
    }
  });

  revalidatePath("/admin/setup");
}

export async function setPersonActive(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    throw new Error("Only admins can edit company setup.");
  }
  await assertQuarterEditable(access.workspaceId);
  const id = text(formData, "id");
  const record = await prisma.person.findFirst({ where: { id, workspaceId: access.workspaceId } });
  if (!record) {
    throw new Error("Person not found in this company.");
  }
  await prisma.person.update({
    where: { id },
    data: { active: text(formData, "active") === "true" }
  });

  revalidatePath("/admin/setup");
}

export async function toggleQuarterLock(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    throw new Error("Only admins can edit company setup.");
  }

  const workspaceId = access.workspaceId;
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { quarterLocked: true }
  });

  if (!workspace) {
    throw new Error("Company not found.");
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { quarterLocked: text(formData, "quarterLocked") === "true" }
  });

  revalidatePath("/admin/setup");
  revalidatePath("/");
  revalidatePath("/expenses");
}
