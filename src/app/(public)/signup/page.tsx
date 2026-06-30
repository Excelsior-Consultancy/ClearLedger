import Link from "next/link";
import { redirect } from "next/navigation";
import { beginGoogleAuthAction, createCompanyAction } from "@/app/auth/actions";
import { getAuthContext } from "@/modules/auth/service";
import { Button, Card, CardContent } from "@heroui/react";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignUpPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const error = single(params.error);
  const auth = await getAuthContext();

  if (auth?.currentMembership) {
    redirect("/");
  }

  const hasGoogleIdentity = Boolean(auth);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1f2937,_#0f172a_55%,_#020617)] px-4 py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="border border-white/10 bg-white/96 shadow-2xl">
          <CardContent className="p-8 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">ClearLedger</p>
              <h1 className="text-3xl font-semibold text-zinc-900 mt-2">Start a workspace</h1>
              <p className="mt-2 text-sm text-zinc-600">
                Every workspace maps to one business, company, or ABN.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              <p className="font-medium text-zinc-900">If you already have an invitation</p>
              <p className="mt-1">
                Close this browser window and open the invitation email instead. The invitation link will
                connect you to the existing workspace.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {decodeURIComponent(error)}
              </div>
            )}

            {hasGoogleIdentity ? (
              <form action={createCompanyAction} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Workspace name</label>
                  <input
                    name="companyName"
                    required
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
                    placeholder="ClearLedger Consulting"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">ABN</label>
                  <input
                    name="abn"
                    required
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
                    placeholder="12 345 678 901"
                    inputMode="numeric"
                  />
                </div>
                <Button type="submit" className="w-full" variant="primary">
                  Create workspace
                </Button>
              </form>
            ) : (
              <form action={beginGoogleAuthAction} className="space-y-4">
                <Button type="submit" className="w-full" variant="primary">
                  Continue with Google
                </Button>
              </form>
            )}

            <div className="text-sm text-zinc-500">
              Already have a workspace?{" "}
              <Link href="/login" className="text-blue-700 hover:underline">
                Log in with Google
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-white/90 shadow-xl">
          <CardContent className="p-8 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">What happens next</p>
              <h2 className="text-xl font-semibold text-zinc-900 mt-2">Create the workspace, then finish onboarding</h2>
            </div>

            <ol className="space-y-3 text-sm text-zinc-700">
              <li>1. Sign in with Google.</li>
              <li>2. Create the workspace using the business name and ABN.</li>
              <li>3. Complete the company profile onboarding screen.</li>
              <li>4. Add bank accounts, categories, people, and invite the rest of the team.</li>
            </ol>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
              The user who creates the workspace becomes the admin automatically.
              They can then send invitation URLs to other admins, accountants, editors, or viewers.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
