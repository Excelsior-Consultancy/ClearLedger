import Link from "next/link";
import { createHash } from "node:crypto";
import { acceptInviteAction } from "@/app/auth/actions";
import { getAuthContext, normalizeEmail } from "@/modules/auth/service";
import { prisma } from "@/modules/db/prisma";
import { Button, Card, CardContent } from "@heroui/react";

type Params = Promise<{ token: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InvitePage({ params, searchParams }: { params: Params; searchParams?: SearchParams }) {
  const { token } = await params;
  const query = searchParams ? await searchParams : {};
  const error = single(query.error);
  const auth = await getAuthContext();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitation = await prisma.invitation.findFirst({
    where: { tokenHash }
  });
  const inviteExpired = invitation ? invitation.expiresAt < new Date() : true;
  const inviteUnavailable = !invitation || invitation.acceptedAt !== null || inviteExpired;

  return (
    <div className="min-h-screen grid place-items-center bg-[radial-gradient(circle_at_top,_#1f2937,_#0f172a_55%,_#020617)] px-4 py-10">
      <Card className="w-full max-w-lg shadow-2xl border border-white/10 bg-white/95">
        <CardContent className="p-8 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">ClearLedger</p>
            <h1 className="text-3xl font-semibold text-zinc-900 mt-2">Accept invite</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Join a company as an app user with the role specified in the invitation.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {decodeURIComponent(error)}
            </div>
          )}

          {inviteUnavailable && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This invite is no longer available. Ask the company admin to create a new invite.
            </div>
          )}

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 space-y-1">
            <div><strong>Invite:</strong> {invitation?.email ?? "Unknown"}</div>
            <div><strong>Role:</strong> {invitation?.role ?? "Unknown"}</div>
            <div><strong>Expires:</strong> {invitation ? invitation.expiresAt.toISOString().slice(0, 10) : "Unknown"}</div>
            <div><strong>Status:</strong> {auth ? "Signed in" : "Sign in required"}</div>
          </div>

          {inviteUnavailable ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-600">
                Ask the company admin to create a new invite for this email address.
              </p>
              <Link href={auth ? "/" : "/login"}>
                <Button className="w-full" variant="outline">
                  {auth ? "Back to dashboard" : "Log in"}
                </Button>
              </Link>
            </div>
          ) : auth ? (
            <form action={acceptInviteAction}>
              <input type="hidden" name="token" value={token} />
              <Button type="submit" className="w-full" variant="primary">
                Accept invite and continue
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zinc-600">
                Please log in using the same email address that received the invite ({normalizeEmail(invitation?.email ?? "")}).
              </p>
              <div className="flex gap-2">
                <Link href={`/login?invite=${encodeURIComponent(token)}`} className="flex-1">
                  <Button className="w-full" variant="primary">Log in</Button>
                </Link>
                <Link href="/signup" className="flex-1">
                  <Button className="w-full" variant="outline">Sign up</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
