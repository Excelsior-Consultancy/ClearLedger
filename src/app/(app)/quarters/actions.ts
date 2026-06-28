"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageCompany, getWorkspaceAccess } from "@/modules/auth/service";
import { createNextQuarter, toggleCurrentQuarterLock } from "@/modules/quarters/service";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createQuarterAction() {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    redirect("/login");
  }

  await createNextQuarter(access.workspaceId);
  revalidatePath("/quarters");
  revalidatePath("/");
  revalidatePath("/admin/setup");
  redirect("/quarters?saved=quarter");
}

export async function setQuarterLockAction(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    redirect("/login");
  }

  const locked = text(formData, "locked") === "true";
  await toggleCurrentQuarterLock(access.workspaceId, locked);
  revalidatePath("/quarters");
  revalidatePath("/");
  revalidatePath("/admin/setup");
  redirect("/quarters?saved=lock");
}
