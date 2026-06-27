"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { GstTreatment as PrismaGstTreatment } from "@prisma/client";
import { canEditCompany, getWorkspaceAccess } from "@/modules/auth/service";
import {
  createExpense,
  updateExpense,
  type ExpenseInput
} from "@/modules/expenses/service";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function parseCents(value: string): number {
  const normalized = value.replaceAll(",", "").replace("$", "").trim();
  const dollars = Number(normalized);
  if (!Number.isFinite(dollars)) {
    return 0;
  }
  return Math.round(dollars * 100);
}

function parseExpenseInput(formData: FormData): ExpenseInput {
  const gstTreatment = text(formData, "gstTreatment") as PrismaGstTreatment;
  const userEnteredGst = text(formData, "userEnteredGst");

  return {
    workspaceId: text(formData, "workspaceId"),
    date: text(formData, "date"),
    supplier: text(formData, "supplier") || undefined,
    categoryId: text(formData, "categoryId"),
    bankAccountId: text(formData, "bankAccountId"),
    grossCents: parseCents(text(formData, "grossAmount")),
    gstTreatment,
    userEnteredGstCents: userEnteredGst ? parseCents(userEnteredGst) : undefined,
    receiptUrl: text(formData, "receiptUrl") || undefined,
    notes: text(formData, "notes") || undefined,
    overrideReason: text(formData, "overrideReason") || undefined
  };
}

function issueMessage(issues: { message: string }[]): string {
  return encodeURIComponent(issues.map((issue) => issue.message).join(" "));
}

function isNextRedirectError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.includes("NEXT_REDIRECT")
  );
}

export async function addExpense(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canEditCompany(access.role)) {
    redirect("/expenses?error=permission");
  }
  let validationError: string | null = null;
  try {
    const result = await createExpense(parseExpenseInput(formData));
    if (!result.ok) {
      validationError = issueMessage(result.issues);
    }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    validationError = encodeURIComponent(error instanceof Error ? error.message : "Unable to save expense.");
  }

  if (validationError) {
    redirect(`/expenses?error=${validationError}`);
  }

  revalidatePath("/");
  revalidatePath("/expenses");
  redirect("/expenses?saved=created");
}

export async function editExpense(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canEditCompany(access.role)) {
    redirect("/expenses?error=permission");
  }
  const id = text(formData, "expenseId");
  let validationError: string | null = null;
  try {
    const result = await updateExpense(id, parseExpenseInput(formData));
    if (!result.ok) {
      validationError = issueMessage(result.issues);
    }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    validationError = encodeURIComponent(error instanceof Error ? error.message : "Unable to update expense.");
  }

  if (validationError) {
    redirect(`/expenses/${id}/edit?error=${validationError}`);
  }

  revalidatePath("/");
  revalidatePath("/expenses");
  redirect("/expenses?saved=updated");
}
