import Link from "next/link";
import { headers } from "next/headers";
import { MembershipRole } from "@prisma/client";
import {
  canManageCompany,
  getAuthContext,
  getWorkspaceAccess,
  listWorkspaceInvitations,
  listWorkspaceUsers,
  getRoleLabel
} from "@/modules/auth/service";
import {
  createInviteAction,
  toggleMembershipAction,
  updateMembershipRoleAction
} from "@/app/auth/actions";
import { Button, Card, CardContent, Chip } from "@heroui/react";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  if (origin) {
    return origin;
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  if (host) {
    return `${protocol}://${host}`;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) {
    throw new Error("Unable to determine the request origin.");
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
}

const roleOptions: MembershipRole[] = [
  MembershipRole.ADMIN,
  MembershipRole.EDITOR,
  MembershipRole.ACCOUNTANT,
  MembershipRole.VIEWER
];

export default async function UsersPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const inviteLink = single(params.invite);
  const inviteEmail = single(params.email);
  const inviteRole = single(params.role);
  const inviteHref = inviteLink ? new URL(inviteLink, await getRequestOrigin()).toString() : null;
  const access = await getWorkspaceAccess();
  const context = await getAuthContext();
  const memberships = await listWorkspaceUsers(access.workspaceId);
  const invites = await listWorkspaceInvitations(access.workspaceId);
  const canManage = canManageCompany(access.role);

  if (!canManage) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-zinc-400">Access denied</p>
              <h1 className="text-2xl font-semibold text-zinc-900 mt-1">Users</h1>
              <p className="text-sm text-zinc-500 mt-1">
                Only admins can manage company access.
              </p>
            </div>
            <Link href="/"><Button variant="outline" size="sm">Back to dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-zinc-400">Company access</p>
          <h1 className="text-3xl font-semibold text-zinc-900">{access.workspaceName} users</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage who can access this company. Roles are company-level only in the MVP.
          </p>
        </div>
        <Link href="/"><Button variant="outline" size="sm">Back to dashboard</Button></Link>
      </div>

      {inviteLink && (
        <Card className="border-blue-200 bg-blue-50" data-testid="invite-created-banner">
          <CardContent className="p-4 text-sm text-blue-900">
            <div className="font-medium">Invite ready to share</div>
            <div className="mt-1 text-blue-800">
              {inviteEmail ? <span className="font-medium">{inviteEmail}</span> : "Invite link"}{inviteRole ? <> · {getRoleLabel(inviteRole as MembershipRole)}</> : null}
            </div>
            <div className="mt-2 text-xs text-blue-700">
              This invite expires in 14 days. ClearLedger does not send email automatically in the MVP, so copy the link and share it with the user.
            </div>
            {inviteHref && (
              <a href={inviteHref} className="mt-3 block break-all font-mono text-blue-900 underline underline-offset-2">
                {inviteHref}
              </a>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-zinc-100 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">Memberships</h2>
                <p className="text-sm text-zinc-500">One row per user membership in this company.</p>
              </div>
              <Chip color="accent" variant="soft" size="sm">{memberships.length} members</Chip>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    {["Name", "Email", "Role", "Status", "Updated", "Actions"].map((heading) => (
                      <th key={heading} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {memberships.map((membership) => (
                    <tr key={membership.id} className="hover:bg-zinc-50/80">
                      <td className="px-5 py-3 text-zinc-900">{membership.user.name}</td>
                      <td className="px-5 py-3 text-zinc-600">{membership.user.email}</td>
                      <td className="px-5 py-3 text-zinc-600">{getRoleLabel(membership.role)}</td>
                      <td className="px-5 py-3">
                        <Chip color={membership.active ? "success" : "default"} variant="soft" size="sm">
                          {membership.active ? "Active" : "Inactive"}
                        </Chip>
                      </td>
                      <td className="px-5 py-3 text-zinc-500">
                        {membership.updatedAt.toISOString().slice(0, 10)}
                      </td>
                      <td className="px-5 py-3">
                        {membership.user.id === context?.user.id ? (
                          <Chip color="accent" variant="soft" size="sm">Current user</Chip>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <form action={updateMembershipRoleAction} className="flex items-center gap-2">
                              <input type="hidden" name="membershipId" value={membership.id} />
                              <select name="role" defaultValue={membership.role} className="rounded-md border border-zinc-200 px-2 py-1 text-xs bg-white">
                                {roleOptions.map((role) => (
                                  <option key={role} value={role}>{getRoleLabel(role)}</option>
                                ))}
                              </select>
                              <Button type="submit" size="sm" variant="ghost">
                                Save
                              </Button>
                            </form>
                            <form action={toggleMembershipAction}>
                              <input type="hidden" name="membershipId" value={membership.id} />
                              <input type="hidden" name="active" value={String(!membership.active)} />
                              <Button type="submit" size="sm" variant="outline">
                                {membership.active ? "Deactivate" : "Reactivate"}
                              </Button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <h2 className="text-lg font-semibold text-zinc-900">Invite user</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Create a shareable invite link for an accountant, editor, or viewer.
              </p>
              <form action={createInviteAction} className="space-y-3 mt-4">
                <input type="hidden" name="workspaceId" value={access.workspaceId} />
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Email</label>
                  <input name="email" type="email" required className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" placeholder="ca@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Role</label>
                  <select name="role" defaultValue={MembershipRole.ACCOUNTANT} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm bg-white">
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>{getRoleLabel(role)}</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" variant="primary" className="w-full">
                  Create invite
                </Button>
                <p className="text-xs text-zinc-500">
                  The invite is company-specific and must be accepted with the same email address.
                </p>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Pending invites</h2>
                  <p className="text-sm text-zinc-500">Invite links can be shared with the user directly.</p>
                </div>
                <Chip color="accent" variant="soft" size="sm">{invites.length} open</Chip>
              </div>
              <div className="space-y-3 mt-4">
                {invites.length === 0 && (
                  <p className="text-sm text-zinc-500">No active invites.</p>
                )}
                {invites.map((invite) => (
                  <div key={invite.id} className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{invite.email}</p>
                        <p className="text-xs text-zinc-500">{getRoleLabel(invite.role)} · expires {invite.expiresAt.toISOString().slice(0, 10)}</p>
                      </div>
                      <Chip color="warning" variant="soft" size="sm">Pending</Chip>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
