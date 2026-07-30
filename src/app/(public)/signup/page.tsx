import Link from "next/link";
import { redirect } from "next/navigation";
import { beginGoogleAuthAction, createCompanyAction } from "@/app/auth/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
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
    redirect("/dashboard");
  }

  const hasGoogleIdentity = Boolean(auth);

  return (
    <div className="min-h-screen grid place-items-center bg-[radial-gradient(circle_at_top,_#1f2937,_#0f172a_55%,_#020617)] px-4 py-10">
      <Card className="w-full max-w-md shadow-2xl border border-white/10 bg-white/95">
        <CardContent className="p-8 space-y-6">
          <div>
            <Link
              href="/"
              className="text-xs uppercase tracking-[0.22em] text-zinc-500 hover:text-zinc-700"
            >
              ClearLedger
            </Link>
            <h1 className="text-3xl font-semibold text-zinc-900 mt-2">Create your workspace</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Sign in with Google, then set up your first workspace.
            </p>
          </div>

          <p className="text-xs text-zinc-500">
            Already have an invitation? Use the link in your invitation email instead of creating a
            new workspace.
          </p>

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
                  inputMode="text"
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Use the 11-digit ABN, with or without spaces, for example 51 824 753 556 or 51824753556.
                </p>
              </div>
              <FormSubmitButton className="w-full" pendingLabel="Creating workspace...">
                Create workspace
              </FormSubmitButton>
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
    </div>
  );
}
