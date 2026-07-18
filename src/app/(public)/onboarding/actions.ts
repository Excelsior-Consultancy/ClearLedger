"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageCompany, getWorkspaceAccess } from "@/modules/auth/service";
import { saveWorkspaceProfile } from "@/modules/setup/service";
import { withQuarterQuery } from "@/modules/quarters/navigation";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function booleanOrNull(formData: FormData, key: string) {
  const value = text(formData, key);
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export async function completeOnboardingAction(formData: FormData) {
  const quarterId = text(formData, "quarterId") || undefined;
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    redirect(withQuarterQuery("/onboarding?error=admin-required", quarterId));
  }

  try {
    await saveWorkspaceProfile(access.workspaceId, {
      name: text(formData, "name"),
      legalName: text(formData, "legalName"),
      abn: text(formData, "abn"),
      address: text(formData, "address"),
      contactEmail: text(formData, "contactEmail"),
      gstRegistered: booleanOrNull(formData, "gstRegistered"),
      gstAccountingBasis: text(formData, "gstAccountingBasis") as "CASH" | "ACCRUAL",
      basFrequency: text(formData, "basFrequency") as "QUARTERLY" | "MONTHLY",
      financialYearStartMonth: Number(text(formData, "financialYearStartMonth") || 7),
      invoicePrefix: text(formData, "invoicePrefix") || null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete onboarding.";
    redirect(withQuarterQuery(`/onboarding?error=${encodeURIComponent(message)}`, quarterId));
  }

  revalidatePath("/");
  revalidatePath("/admin/setup");
  revalidatePath("/expenses");
  revalidatePath("/onboarding");
  redirect(withQuarterQuery("/", quarterId));
}
