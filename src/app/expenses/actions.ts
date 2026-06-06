"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { GstTreatment as PrismaGstTreatment } from "@prisma/client";
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

export async function addExpense(formData: FormData) {
  const result = await createExpense(parseExpenseInput(formData));
  if (!result.ok) {
    redirect(`/expenses?error=${issueMessage(result.issues)}`);
  }

  revalidatePath("/");
  revalidatePath("/expenses");
  redirect("/expenses?saved=created");
}

export async function editExpense(formData: FormData) {
  const id = text(formData, "expenseId");
  const result = await updateExpense(id, parseExpenseInput(formData));
  if (!result.ok) {
    redirect(`/expenses/${id}/edit?error=${issueMessage(result.issues)}`);
  }

  revalidatePath("/");
  revalidatePath("/expenses");
  redirect("/expenses?saved=updated");
}
