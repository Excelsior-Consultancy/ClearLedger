import crypto from "node:crypto";
import { MembershipRole, Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { formatAbn, isValidAbn, normalizeAbn } from "@/modules/company/profile";
import { getAuthProvider, readDevIdentityCookie, type AuthIdentity } from "@/modules/auth/provider";
import { prisma } from "@/modules/db/prisma";

const WORKSPACE_COOKIE = "clearledger_workspace";
const INVITE_DAYS = 14;

export type WorkspaceOption = {
  id: string;
  name: string;
};

export type AuthMembership = {
  id: string;
  role: MembershipRole;
  workspaceId: string;
  workspace: WorkspaceOption;
};

export type AuthContext = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  memberships: AuthMembership[];
  currentMembership: AuthMembership | null;
};

export type WorkspaceAccess = {
  workspaceId: string;
  workspaceName: string;
  role: MembershipRole;
  memberships: AuthMembership[];
};

function now() {
  return new Date();
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

type CookieStoreLike = {
  set: (name: string, value: string, options?: any) => void;
  delete: (name: string) => void;
  get: (name: string) => { value: string } | undefined;
};

function appUserId(identity: AuthIdentity) {
  return `${identity.provider}:${identity.providerUserId}`;
}

async function upsertUserFromIdentity(identity: AuthIdentity) {
  const id = appUserId(identity);
  const email = normalizeEmail(identity.email);
  const name = identity.name.trim() || email.split("@")[0] || "User";

  return prisma.user.upsert({
    where: {
      authProvider_authProviderUserId: {
        authProvider: identity.provider,
        authProviderUserId: identity.providerUserId
      }
    },
    create: {
      id,
      authProvider: identity.provider,
      authProviderUserId: identity.providerUserId,
      name,
      email
    },
    update: {
      name,
      email,
      active: true
    },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      memberships: {
        where: { active: true },
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          role: true,
          workspaceId: true,
          workspace: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });
}

async function currentIdentity() {
  const provider = getAuthProvider();
  const identity = await provider.getCurrentIdentity();
  if (identity) return identity;
  return readDevIdentityCookie();
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const identity = await currentIdentity();
  if (!identity || !identity.emailVerified) {
    return null;
  }

  const user = await upsertUserFromIdentity(identity);
  if (!user.active) {
    return null;
  }

  const cookieStore = await cookies();
  const selectedWorkspaceId = cookieStore.get(WORKSPACE_COOKIE)?.value;
  const memberships = user.memberships.map((membership) => ({
    ...membership,
    workspace: {
      id: membership.workspace.id,
      name: membership.workspace.name
    }
  }));
  const currentMembership =
    memberships.find((membership) => membership.workspaceId === selectedWorkspaceId) ??
    memberships[0] ??
    null;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    },
    memberships,
    currentMembership
  };
}

export async function requireAuthContext() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/login");
  }
  return context;
}

export function canManageCompany(role: MembershipRole | null | undefined) {
  return role === MembershipRole.ADMIN;
}

export function canEditCompany(role: MembershipRole | null | undefined) {
  return role === MembershipRole.ADMIN || role === MembershipRole.EDITOR;
}

export function canComment(role: MembershipRole | null | undefined) {
  return role === MembershipRole.ADMIN || role === MembershipRole.EDITOR || role === MembershipRole.ACCOUNTANT;
}

export function getRoleLabel(role: MembershipRole) {
  switch (role) {
    case MembershipRole.ADMIN:
      return "Admin";
    case MembershipRole.EDITOR:
      return "Editor";
    case MembershipRole.ACCOUNTANT:
      return "Accountant";
    case MembershipRole.VIEWER:
      return "Viewer";
    default:
      return role;
  }
}

async function createWorkspaceWithMembership(tx: Prisma.TransactionClient, userId: string, workspaceName: string, abn: string) {
  const workspace = await tx.workspace.create({
    data: {
      name: workspaceName.trim(),
      abn: normalizeAbn(abn),
      gstRegistered: null,
      gstAccountingBasis: null,
      basFrequency: null,
      financialYearStartMonth: 7,
      quarterLocked: false
    }
  });

  await tx.membership.create({
    data: {
      userId,
      workspaceId: workspace.id,
      role: MembershipRole.ADMIN
    }
  });

  return workspace;
}

export async function createWorkspaceForUser(
  input: { userId: string; workspaceName: string; abn: string },
  cookieStore?: CookieStoreLike
) {
  const workspaceName = input.workspaceName.trim();
  const normalizedAbn = normalizeAbn(input.abn);
  if (!workspaceName) {
    throw new Error("Company name is required.");
  }
  if (!isValidAbn(normalizedAbn)) {
    throw new Error("Enter a valid Australian Business Number (11 digits).");
  }

  try {
    const workspace = await prisma.$transaction(async (tx) =>
      createWorkspaceWithMembership(tx, input.userId, workspaceName, normalizedAbn)
    );
    await selectWorkspace(workspace.id, cookieStore);
    return workspace;
  } catch (error) {
    const prismaError = error as { code?: string; meta?: { target?: unknown } } | null;
    if (
      prismaError?.code === "P2002" &&
      Array.isArray(prismaError.meta?.target) &&
      prismaError.meta.target.includes("abn")
    ) {
      throw new Error(
        `That ABN is already registered for another workspace. Ask an admin to invite you to ${formatAbn(normalizedAbn)} instead.`
      );
    }
    throw error;
  }
}

export async function findOrCreateAuthUser(identity: AuthIdentity) {
  return upsertUserFromIdentity(identity);
}

export async function createInvitation(input: {
  workspaceId: string;
  email: string;
  role: MembershipRole;
  createdByUserId: string;
}) {
  const token = randomToken(24);
  const invitation = await prisma.invitation.create({
    data: {
      workspaceId: input.workspaceId,
      email: normalizeEmail(input.email),
      role: input.role,
      tokenHash: hashToken(token),
      expiresAt: new Date(now().getTime() + INVITE_DAYS * 24 * 60 * 60 * 1000),
      createdByUserId: input.createdByUserId
    }
  });

  return {
    invitation,
    inviteToken: token,
    inviteUrl: `/invite/${token}`
  };
}

export async function acceptInvitation(token: string, userId: string, cookieStore?: CookieStoreLike) {
  const tokenHash = hashToken(token);
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash }
  });

  if (!invitation || invitation.acceptedAt || invitation.expiresAt < now()) {
    throw new Error("That invite is no longer valid.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, active: true }
  });

  if (!user || !user.active) {
    throw new Error("You must be signed in to accept an invite.");
  }

  if (normalizeEmail(user.email) !== normalizeEmail(invitation.email)) {
    throw new Error("That invite was sent to a different email address.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.membership.upsert({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: invitation.workspaceId
        }
      },
      create: {
        userId: user.id,
        workspaceId: invitation.workspaceId,
        role: invitation.role
      },
      update: {
        role: invitation.role,
        active: true
      }
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: now() }
    });
  });

  await selectWorkspace(invitation.workspaceId, cookieStore);
  return invitation.workspaceId;
}

export async function selectWorkspace(workspaceId: string, cookieStore?: CookieStoreLike) {
  const store = cookieStore ?? (await cookies());
  store.set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60
  });
}

export async function getWorkspaceAccess() {
  const context = await requireAuthContext();
  const currentMembership = context.currentMembership;
  if (!currentMembership) {
    redirect("/login");
  }

  return {
    workspaceId: currentMembership.workspaceId,
    workspaceName: currentMembership.workspace.name,
    role: currentMembership.role,
    memberships: context.memberships
  } satisfies WorkspaceAccess;
}

export async function listWorkspaceUsers(workspaceId: string) {
  return prisma.membership.findMany({
    where: { workspaceId },
    orderBy: [{ createdAt: "asc" }],
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          active: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });
}

export async function listWorkspaceInvitations(workspaceId: string) {
  return prisma.invitation.findMany({
    where: { workspaceId, acceptedAt: null, expiresAt: { gte: now() } },
    orderBy: [{ createdAt: "desc" }]
  });
}

export async function updateMembershipRole(input: {
  workspaceId: string;
  membershipId: string;
  role: MembershipRole;
  actorUserId: string;
}) {
  const membership = await prisma.membership.findFirst({
    where: { id: input.membershipId, workspaceId: input.workspaceId }
  });

  if (!membership) {
    throw new Error("Membership not found in this company.");
  }

  if (membership.userId === input.actorUserId) {
    throw new Error("You cannot change your own role.");
  }

  if (membership.role === MembershipRole.ADMIN && input.role !== MembershipRole.ADMIN) {
    const remainingAdmins = await prisma.membership.count({
      where: {
        workspaceId: input.workspaceId,
        active: true,
        role: MembershipRole.ADMIN,
        NOT: { id: input.membershipId }
      }
    });

    if (remainingAdmins === 0) {
      throw new Error("At least one admin must remain active in the company.");
    }
  }

  await prisma.membership.update({
    where: { id: input.membershipId },
    data: { role: input.role }
  });
}

export async function deactivateMembership(input: {
  workspaceId: string;
  membershipId: string;
  active: boolean;
  actorUserId: string;
}) {
  const membership = await prisma.membership.findFirst({
    where: { id: input.membershipId, workspaceId: input.workspaceId }
  });

  if (!membership) {
    throw new Error("Membership not found in this company.");
  }

  if (membership.userId === input.actorUserId && !input.active) {
    throw new Error("You cannot deactivate your own membership.");
  }

  if (membership.role === MembershipRole.ADMIN && !input.active) {
    const remainingAdmins = await prisma.membership.count({
      where: {
        workspaceId: input.workspaceId,
        active: true,
        role: MembershipRole.ADMIN,
        NOT: { id: input.membershipId }
      }
    });

    if (remainingAdmins === 0) {
      throw new Error("At least one admin must remain active in the company.");
    }
  }

  await prisma.membership.update({
    where: { id: input.membershipId },
    data: { active: input.active }
  });
}

export async function createReviewComment(input: {
  workspaceId: string;
  authorUserId: string;
  targetType: string;
  targetId?: string;
  body: string;
}) {
  const trimmedBody = input.body.trim();
  if (!trimmedBody) {
    throw new Error("Comment body is required.");
  }

  return prisma.comment.create({
    data: {
      workspaceId: input.workspaceId,
      authorUserId: input.authorUserId,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      body: trimmedBody
    }
  });
}

export async function listReviewComments(workspaceId: string, targetType = "quarter", targetId?: string) {
  return prisma.comment.findMany({
    where: {
      workspaceId,
      targetType,
      targetId: targetId ?? undefined
    },
    include: {
      author: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });
}
