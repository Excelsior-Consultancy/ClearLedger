"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { MembershipRole } from "@prisma/client";
import {
  acceptInvitation,
  canManageCompany,
  createInvitation,
  createReviewComment,
  getAuthContext,
  getWorkspaceAccess,
  createWorkspaceForUser,
  selectWorkspace,
  updateMembershipRole,
  deactivateMembership,
  normalizeEmail
} from "@/modules/auth/service";
import { prisma } from "@/modules/db/prisma";
import {
  GOOGLE_PENDING_COMPANY_COOKIE,
  GOOGLE_PENDING_INVITE_COOKIE,
  clearPendingGoogleAuth,
  pendingGoogleAuthCookieOptions
} from "@/modules/auth/google";
import { getAuthProvider } from "@/modules/auth/provider";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function roleFromString(value: string) {
  if (value === MembershipRole.ADMIN) return MembershipRole.ADMIN;
  if (value === MembershipRole.EDITOR) return MembershipRole.EDITOR;
  if (value === MembershipRole.ACCOUNTANT) return MembershipRole.ACCOUNTANT;
  return MembershipRole.VIEWER;
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  if (!host) {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
  }
  return `${protocol}://${host}`;
}

export async function beginGoogleAuthAction(formData: FormData) {
  const inviteToken = text(formData, "inviteToken");
  const companyName = text(formData, "companyName");
  const shouldStoreCompanyName = companyName.length > 0;

  const cookieStore = await cookies();
  let url: string;

  try {
    if (inviteToken) {
      cookieStore.set(GOOGLE_PENDING_INVITE_COOKIE, inviteToken, pendingGoogleAuthCookieOptions());
    }
    if (shouldStoreCompanyName) {
      cookieStore.set(GOOGLE_PENDING_COMPANY_COOKIE, encodeURIComponent(companyName), pendingGoogleAuthCookieOptions());
    }

    const origin = await getRequestOrigin();
    const provider = getAuthProvider();
    url = await provider.beginSignIn({
      origin,
      inviteToken,
      companyName,
      state: "unused"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google sign-in is not available right now.";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  redirect(url);
}

export async function createCompanyAction(formData: FormData) {
  const context = await getAuthContext();
  if (!context) {
    redirect("/login");
  }
  if (context.currentMembership) {
    redirect("/");
  }

  const companyName = text(formData, "companyName");
  if (!companyName) {
    redirect("/signup?error=missing-company");
  }

  await createWorkspaceForUser({
    userId: context!.user.id,
    companyName
  });

  revalidatePath("/");
  redirect("/");
}

export async function signOutAction() {
  try {
    const provider = getAuthProvider();
    await provider.signOut();
  } catch {
    // Best-effort sign-out. The app cookie state is cleared below.
  }
  const store = await cookies();
  store.delete("clearledger_dev_identity");
  store.delete("clearledger_workspace");
  await clearPendingGoogleAuth(store);
  redirect("/login");
}

export async function selectWorkspaceAction(formData: FormData) {
  const context = await getAuthContext();
  if (!context) {
    redirect("/login");
  }

  const workspaceId = text(formData, "workspaceId");
  if (!workspaceId || !context.memberships.some((membership) => membership.workspaceId === workspaceId)) {
    redirect("/");
  }

  await selectWorkspace(workspaceId);
  revalidatePath("/");
  revalidatePath("/expenses");
  revalidatePath("/income");
  revalidatePath("/admin/setup");
  revalidatePath("/admin/users");
  redirect("/");
}

export async function createInviteAction(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canManageCompany(access.role)) {
    redirect("/login");
  }

  const email = text(formData, "email");
  const role = roleFromString(text(formData, "role"));
  const workspaceId = access.workspaceId;

  if (!email) {
    redirect("/admin/users?error=missing-email");
  }

  const invite = await createInvitation({
    workspaceId,
    email,
    role,
    createdByUserId: (await getAuthContext())!.user.id
  });

  revalidatePath("/admin/users");
  const inviteUrl = new URL(invite.inviteUrl, await getRequestOrigin()).toString();
  redirect(
    `/admin/users?invite=${encodeURIComponent(inviteUrl)}&email=${encodeURIComponent(normalizeEmail(email))}&role=${encodeURIComponent(role)}`
  );
}

export async function acceptInviteAction(formData: FormData) {
  const context = await getAuthContext();
  if (!context) {
    const token = text(formData, "token");
    redirect(`/signup?invite=${encodeURIComponent(token)}`);
  }

  const token = text(formData, "token");
  if (!token) {
    redirect("/?error=missing-invite-token");
  }

  try {
    await acceptInvitation(token, context!.user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to accept invite.";
    redirect(`/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/");
  revalidatePath("/admin/users");
  redirect("/");
}

export async function updateMembershipRoleAction(formData: FormData) {
  const context = await getAuthContext();
  if (!context || !canManageCompany(context.currentMembership?.role)) {
    redirect("/login");
  }

  await updateMembershipRole({
    workspaceId: context.currentMembership!.workspaceId,
    membershipId: text(formData, "membershipId"),
    role: roleFromString(text(formData, "role")),
    actorUserId: context.user.id
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?saved=role");
}

export async function toggleMembershipAction(formData: FormData) {
  const context = await getAuthContext();
  if (!context || !canManageCompany(context.currentMembership?.role)) {
    redirect("/login");
  }

  const membershipId = text(formData, "membershipId");
  const active = text(formData, "active") === "true";

  await deactivateMembership({
    workspaceId: context.currentMembership!.workspaceId,
    membershipId,
    active,
    actorUserId: context.user.id
  });
  revalidatePath("/admin/users");
  redirect("/admin/users?saved=status");
}

export async function addReviewCommentAction(formData: FormData) {
  const context = await getAuthContext();
  if (!context || !context.currentMembership) {
    redirect("/login");
  }

  const targetType = text(formData, "targetType") || "quarter";
  const targetId = text(formData, "targetId") || undefined;
  const body = text(formData, "body");

  await createReviewComment({
    workspaceId: context.currentMembership.workspaceId,
    authorUserId: context.user.id,
    targetType,
    targetId,
    body
  });

  revalidatePath("/");
  redirect("/?saved=comment");
}
