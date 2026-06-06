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

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function requiredWorkspaceId(formData: FormData): string {
  const workspaceId = text(formData, "workspaceId");
  if (!workspaceId) {
    throw new Error("Workspace id is required.");
  }
  return workspaceId;
}

export async function updateCompanySetup(formData: FormData) {
  const workspaceId = requiredWorkspaceId(formData);
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
}

export async function addBankAccount(formData: FormData) {
  await prisma.bankAccount.create({
    data: {
      workspaceId: requiredWorkspaceId(formData),
      name: text(formData, "name"),
      bank: text(formData, "bank"),
      label: text(formData, "label"),
      ownerLabel: text(formData, "ownerLabel") || null
    }
  });

  revalidatePath("/admin/setup");
}

export async function setBankAccountActive(formData: FormData) {
  await prisma.bankAccount.update({
    where: { id: text(formData, "id") },
    data: { active: text(formData, "active") === "true" }
  });

  revalidatePath("/admin/setup");
}

export async function addCategory(formData: FormData) {
  await prisma.category.create({
    data: {
      workspaceId: requiredWorkspaceId(formData),
      name: text(formData, "name"),
      type: text(formData, "type") as CategoryType,
      defaultGstTreatment: text(formData, "defaultGstTreatment") as GstTreatment,
      basTreatment: text(formData, "basTreatment") as BasTreatment
    }
  });

  revalidatePath("/admin/setup");
}

export async function setCategoryActive(formData: FormData) {
  await prisma.category.update({
    where: { id: text(formData, "id") },
    data: { active: text(formData, "active") === "true" }
  });

  revalidatePath("/admin/setup");
}

export async function addPerson(formData: FormData) {
  await prisma.person.create({
    data: {
      workspaceId: requiredWorkspaceId(formData),
      name: text(formData, "name"),
      email: text(formData, "email") || null,
      personType: text(formData, "personType") as PersonType,
      workspaceRole: text(formData, "workspaceRole") as WorkspaceRole,
      payrollEnabled: text(formData, "payrollEnabled") === "true"
    }
  });

  revalidatePath("/admin/setup");
}

export async function setPersonActive(formData: FormData) {
  await prisma.person.update({
    where: { id: text(formData, "id") },
    data: { active: text(formData, "active") === "true" }
  });

  revalidatePath("/admin/setup");
}
