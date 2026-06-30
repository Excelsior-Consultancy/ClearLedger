import { Sidebar } from "./Sidebar";
import { getAuthContext } from "@/modules/auth/service";
import { prisma } from "@/modules/db/prisma";
import { getOnboardingReadiness } from "@/modules/setup/readiness";
import { redirect } from "next/navigation";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const auth = await getAuthContext();
  if (!auth || !auth.currentMembership) {
    redirect("/login");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.currentMembership.workspaceId },
    select: {
      name: true,
      legalName: true,
      abn: true,
      address: true,
      contactEmail: true,
      gstRegistered: true,
      basFrequency: true,
      financialYearStartMonth: true
    }
  });

  if (!workspace) {
    redirect("/signup");
  }

  const onboarding = getOnboardingReadiness({
    ...workspace,
    bankAccounts: [],
    categories: []
  });

  if (!onboarding.complete) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar
        currentRole={auth.currentMembership.role}
        memberships={auth.memberships}
        selectedWorkspaceId={auth.currentMembership.workspaceId}
        userName={auth.user.name}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
