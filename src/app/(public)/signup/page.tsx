import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptInviteAction, beginGoogleAuthAction, createCompanyAction } from "@/app/auth/actions";
import { getAuthContext } from "@/modules/auth/service";
import { Button, Card, CardContent } from "@heroui/react";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignUpPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const error = single(params.error);
  const invite = single(params.invite);
  const auth = await getAuthContext();

  if (auth?.currentMembership) {
    redirect("/");
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[radial-gradient(circle_at_top,_#1f2937,_#0f172a_55%,_#020617)] px-4 py-10">
      <Card className="w-full max-w-md shadow-2xl border border-white/10 bg-white/95">
        <CardContent className="p-8 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">ClearLedger</p>
            <h1 className="text-3xl font-semibold text-zinc-900 mt-2">
              {invite ? "Accept invite" : auth ? "Create company" : "Create account"}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {invite
                ? "Join the invited company with your Google account."
                : auth
                  ? "Create your first company and become its admin."
                  : "Start with your first company using your Google account."}
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {decodeURIComponent(error)}
            </div>
          )}

          {invite ? (
            auth ? (
              <form action={acceptInviteAction} className="space-y-4">
                <input type="hidden" name="token" value={invite} />
                <Button type="submit" className="w-full" variant="primary">
                  Accept invite with Google
                </Button>
              </form>
            ) : (
              <form action={beginGoogleAuthAction} className="space-y-4">
                <input type="hidden" name="inviteToken" value={invite} />
                <Button type="submit" className="w-full" variant="primary">
                  Continue with Google
                </Button>
              </form>
            )
          ) : auth ? (
            <form action={createCompanyAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Company name</label>
                <input
                  name="companyName"
                  required
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
                  placeholder="ClearLedger Pty Ltd"
                />
              </div>
              <Button type="submit" className="w-full" variant="primary">
                Create company
              </Button>
            </form>
          ) : (
            <form action={beginGoogleAuthAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Company name</label>
                <input
                  name="companyName"
                  required
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
                  placeholder="ClearLedger Pty Ltd"
                />
              </div>
              <Button type="submit" className="w-full" variant="primary">
                Continue with Google
              </Button>
            </form>
          )}

          <div className="text-sm text-zinc-500">
            Already have a company? <Link href="/login" className="text-blue-700 hover:underline">Log in with Google</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
