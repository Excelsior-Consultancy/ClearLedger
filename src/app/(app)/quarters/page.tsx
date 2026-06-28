import Link from "next/link";
import { Button, Card, CardContent, Chip } from "@heroui/react";
import { canManageCompany, getRoleLabel, getWorkspaceAccess } from "@/modules/auth/service";
import { getWorkspaceQuarterContext } from "@/modules/quarters/service";
import { createQuarterAction, setQuarterLockAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function QuartersPage() {
  const access = await getWorkspaceAccess();
  const context = await getWorkspaceQuarterContext(access.workspaceId);
  const canManage = canManageCompany(access.role);

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Workspace / Quarter browser</p>
          <h1 className="text-2xl font-semibold text-zinc-900 mt-1">Quarters</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Browse past reporting periods, lock the current quarter, or roll forward to the next one when you are ready.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/companies">
            <Button variant="outline" size="sm">Companies</Button>
          </Link>
          <Link href="/admin/setup">
            <Button variant="outline" size="sm">Setup</Button>
          </Link>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-4">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-700">Current quarter</p>
                <p className="text-xs text-zinc-500 mt-1">{context.workspaceName} · {getRoleLabel(access.role)}</p>
              </div>
              <Chip color={context.currentQuarter.locked ? "success" : "warning"} variant="soft" size="sm">
                {context.currentQuarter.locked ? "Locked" : "Open"}
              </Chip>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-400">Label</p>
                <p className="text-sm font-medium text-zinc-800 mt-1">{context.currentQuarter.label}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-400">Start</p>
                <p className="text-sm font-medium text-zinc-800 mt-1">{context.currentQuarter.startDate}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-400">End</p>
                <p className="text-sm font-medium text-zinc-800 mt-1">{context.currentQuarter.endDate}</p>
              </div>
            </div>

            {canManage && (
              <form action={setQuarterLockAction} className="flex items-center gap-3">
                <input type="hidden" name="locked" value={String(!context.currentQuarter.locked)} />
                <Button type="submit" variant={context.currentQuarter.locked ? "outline" : "primary"} size="sm">
                  {context.currentQuarter.locked ? "Unlock quarter" : "Lock quarter"}
                </Button>
                <p className="text-xs text-zinc-500">
                  Locking the quarter prevents edits to source records until an admin opens it again.
                </p>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <p className="text-sm font-medium text-zinc-700">Roll forward</p>
              <p className="text-xs text-zinc-500 mt-1">
                Create the next quarter and move the workspace into it so teams can keep working without losing history.
              </p>
            </div>
            <form action={createQuarterAction} className="space-y-3">
              <Button type="submit" variant="primary" size="sm" className="w-full" disabled={!canManage}>
                Start next quarter
              </Button>
              {!canManage && (
                <p className="text-xs text-zinc-500">
                  Only admins can create a new quarter.
                </p>
              )}
            </form>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
              New quarters are created in order, and all existing BAS source rows stay traceable to their original dates.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div>
              <p className="text-sm font-medium text-zinc-700">Quarter history</p>
              <p className="text-xs text-zinc-500">Newest first, so users can work backwards from the current reporting period.</p>
            </div>
            <Chip color="accent" variant="soft" size="sm">{context.quarters.length} quarters</Chip>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  {["Quarter", "Period", "Status"].map((header) => (
                    <th key={header} className="text-left text-xs font-semibold text-zinc-400 px-5 py-3">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {context.quarters.map((quarter) => (
                  <tr key={quarter.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-800">{quarter.label}</span>
                        {quarter.active && <Chip color="success" variant="flat" size="sm">Current</Chip>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{quarter.startDate} → {quarter.endDate}</td>
                    <td className="px-5 py-3">
                      <Chip color={quarter.locked ? "success" : "warning"} variant="soft" size="sm">
                        {quarter.locked ? "Locked" : "Open"}
                      </Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
