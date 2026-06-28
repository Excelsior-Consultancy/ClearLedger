"use server";

import { revalidatePath } from "next/cache";
import {
  BasFrequency,
  BasTreatment,
  CategoryType,
  GstTreatment,
  PersonType,
  WorkspaceRole
} from "@prisma/client";
import { prisma } from "@/modules/db/prisma";
import { canManageCompany, getWorkspaceAccess } from "@/modules/auth/service";
import { assertQuarterEditable } from "@/modules/shared/quarterGuard";
import { toggleCurrentQuarterLock } from "@/modules/quarters/service";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
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
  revalidatePath("/quarters");
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
  revalidatePath("/quarters");
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
  revalidatePath("/quarters");
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
  revalidatePath("/quarters");
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
  revalidatePath("/quarters");
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
      payrollEnabled: text(formData, "payrollEnabled") === "true"
    }
  });

  revalidatePath("/admin/setup");
  revalidatePath("/quarters");
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
  revalidatePath("/quarters");
}

export async function toggleQuarterLock(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    throw new Error("Only admins can edit company setup.");
  }

  const workspaceId = access.workspaceId;
  await toggleCurrentQuarterLock(workspaceId, text(formData, "quarterLocked") === "true");

  revalidatePath("/admin/setup");
  revalidatePath("/");
  revalidatePath("/expenses");
  revalidatePath("/quarters");
}
