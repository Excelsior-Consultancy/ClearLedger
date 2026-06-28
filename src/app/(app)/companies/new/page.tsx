import Link from "next/link";
import { Button, Card, CardContent } from "@heroui/react";
import { createCompanyAction } from "@/app/auth/actions";
import { getWorkspaceAccess } from "@/modules/auth/service";

export const dynamic = "force-dynamic";

export default async function NewCompanyPage() {
  await getWorkspaceAccess();

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Workspace onboarding</p>
        <h1 className="text-2xl font-semibold text-zinc-900 mt-1">Create a new company</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Add another workspace without leaving the app, then switch into it immediately.
        </p>
      </header>

      <Card>
        <CardContent className="p-5">
          <form action={createCompanyAction} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-zinc-400 mb-2" htmlFor="companyName">
                Company name
              </label>
              <input
                id="companyName"
                name="companyName"
                required
                placeholder="Example Advisory Pty Ltd"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" variant="primary" size="sm">
                Create company
              </Button>
              <Link href="/companies">
                <Button variant="outline" size="sm">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
