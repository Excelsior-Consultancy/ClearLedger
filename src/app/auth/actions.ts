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
  createSession,
  destroySession,
  getAuthContext,
  getWorkspaceAccess,
  registerFirstCompany,
  selectWorkspace,
  signIn,
  updateMembershipRole,
  deactivateMembership,
  normalizeEmail
} from "@/modules/auth/service";
import { prisma } from "@/modules/db/prisma";

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

export async function signInAction(formData: FormData) {
  const email = text(formData, "email");
  const password = text(formData, "password");
  const inviteToken = text(formData, "inviteToken");
  const user = await signIn(email, password);
  if (!user) {
    redirect("/login?error=invalid");
  }

  await createSession(user.id);
  const cookieStore = await cookies();
  const rememberedWorkspaceId = cookieStore.get("clearledger_workspace")?.value;
  let selectedWorkspaceId =
    user.memberships.find((membership) => membership.workspaceId === rememberedWorkspaceId)?.workspaceId ??
    user.memberships[0]?.workspaceId;
  if (inviteToken) {
    selectedWorkspaceId = await acceptInvitation(inviteToken, user.id);
  }
  if (selectedWorkspaceId) {
    await selectWorkspace(selectedWorkspaceId);
  }

  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const name = text(formData, "name");
  const email = text(formData, "email");
  const password = text(formData, "password");
  const companyName = text(formData, "companyName");

  if (!name || !email || !password || !companyName) {
    redirect("/signup?error=missing");
  }

  try {
    await registerFirstCompany({ name, email, password, companyName });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sign up.";
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }

  redirect("/");
}

export async function signOutAction() {
  await destroySession();
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
    redirect(`/login?invite=${encodeURIComponent(token)}`);
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
