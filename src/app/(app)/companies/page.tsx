import Link from "next/link";
import { Button, Card, CardContent, Chip } from "@heroui/react";
import { getRoleLabel, getWorkspaceAccess } from "@/modules/auth/service";
import { selectWorkspaceAction } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const access = await getWorkspaceAccess();

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Workspace browser</p>
          <h1 className="text-2xl font-semibold text-zinc-900 mt-1">Companies</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Move between companies quickly, add a new one, and keep the active workspace obvious.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/companies/new">
            <Button variant="primary" size="sm">New company</Button>
          </Link>
          <Link href="/quarters">
            <Button variant="outline" size="sm">Quarters</Button>
          </Link>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-zinc-700">Accessible companies</p>
              <p className="text-xs text-zinc-500 mt-1">{access.memberships.length} company memberships available.</p>
            </div>
            <Chip color="accent" variant="soft" size="sm">{getRoleLabel(access.role)}</Chip>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {access.memberships.map((membership) => {
              const active = membership.workspaceId === access.workspaceId;
              return (
                <form key={membership.workspaceId} action={selectWorkspaceAction}>
                  <input type="hidden" name="workspaceId" value={membership.workspaceId} />
                  <button
                    type="submit"
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      active
                        ? "border-blue-300 bg-blue-50"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-zinc-800">{membership.workspace.name}</p>
                      {active && <Chip color="success" variant="soft" size="sm">Current</Chip>}
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">Role: {getRoleLabel(membership.role)}</p>
                    <p className="text-xs text-zinc-500 mt-1">Click to switch into this company.</p>
                  </button>
                </form>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
