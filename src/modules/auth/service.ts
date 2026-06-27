import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MembershipRole } from "@prisma/client";
import { prisma } from "@/modules/db/prisma";

const SESSION_COOKIE = "clearledger_session";
const WORKSPACE_COOKIE = "clearledger_workspace";
const PASSWORD_ITERATIONS = 210_000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";
const SESSION_DAYS = 30;
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

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function sessionCookieOptions(maxAgeDays = SESSION_DAYS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeDays * 24 * 60 * 60
  };
}

export async function createSession(userId: string) {
  const token = randomToken(32);
  const expiresAt = new Date(now().getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function destroySession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashToken(sessionToken) }
    });
  }

  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(WORKSPACE_COOKIE);
}

async function getSessionRecord() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  return prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: {
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
      }
    }
  });
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getSessionRecord();
  if (!session || session.expiresAt < now() || !session.user.active) {
    return null;
  }

  const cookieStore = await cookies();
  const selectedWorkspaceId = cookieStore.get(WORKSPACE_COOKIE)?.value;
  const memberships = session.user.memberships.map((membership) => ({
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
      id: session.user.id,
      name: session.user.name,
      email: session.user.email
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

export async function signIn(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      passwordHash: true,
      passwordSalt: true,
      memberships: {
        where: { active: true },
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          role: true,
          workspaceId: true
        }
      }
    }
  });

  if (!user || !user.active || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    memberships: user.memberships
  };
}

export async function registerFirstCompany(input: {
  name: string;
  email: string;
  password: string;
  companyName: string;
}) {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new Error("An account already exists for this email. Please log in instead.");
  }

  const { salt, hash } = hashPassword(input.password);
  const companyName = input.companyName.trim();
  if (!companyName) {
    throw new Error("Company name is required.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name: companyName,
        gstRegistered: null,
        basFrequency: null,
        financialYearStartMonth: 7,
        quarterLocked: false
      }
    });

    const user = await tx.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash: hash,
        passwordSalt: salt
      }
    });

    await tx.membership.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: MembershipRole.ADMIN
      }
    });

    return { user, workspace };
  });

  await createSession(result.user.id);
  await selectWorkspace(result.workspace.id);

  return result;
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

export async function acceptInvitation(token: string, userId: string) {
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

  await selectWorkspace(invitation.workspaceId);
  return invitation.workspaceId;
}

export async function selectWorkspace(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60
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

export async function listReviewComments(workspaceId: string, targetType = "quarter") {
  return prisma.comment.findMany({
    where: { workspaceId, targetType },
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
