import Link from "next/link";
import { redirect } from "next/navigation";
import { beginGoogleAuthAction } from "@/app/auth/actions";
import { getLocalDevAuthBootstrap } from "@/modules/auth/dev-mode";
import { Button, Card, CardContent } from "@heroui/react";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const error = single(params.error);
  const invite = single(params.invite);
  const manual = single(params.manual);
  const localDevBootstrap = getLocalDevAuthBootstrap();

  if (localDevBootstrap && !invite && !manual) {
    const searchParams = new URLSearchParams({
      email: localDevBootstrap.email,
      name: localDevBootstrap.name,
      workspaceId: localDevBootstrap.workspaceId
    });
    redirect(`/api/dev-auth?${searchParams.toString()}`);
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[radial-gradient(circle_at_top,_#1f2937,_#0f172a_55%,_#020617)] px-4 py-10">
      <Card className="w-full max-w-md shadow-2xl border border-white/10 bg-white/95">
        <CardContent className="p-8 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">ClearLedger</p>
            <h1 className="text-3xl font-semibold text-zinc-900 mt-2">Log in</h1>
            <p className="text-sm text-zinc-500 mt-1">Sign in with Google to access your companies.</p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={beginGoogleAuthAction} className="space-y-4">
            {invite && <input type="hidden" name="inviteToken" value={invite} />}
            <Button type="submit" className="w-full" variant="primary">
              Continue with Google
            </Button>
          </form>

          <div className="flex items-center justify-between text-sm">
            <Link href="/signup" className="text-blue-700 hover:underline">Create first company</Link>
            <span className="text-zinc-500">{localDevBootstrap ? "Local auto-login enabled" : "Google only for now"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
