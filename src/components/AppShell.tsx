import { Sidebar } from "./Sidebar";
import { getAuthContext } from "@/modules/auth/service";
import { redirect } from "next/navigation";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const auth = await getAuthContext();
  if (!auth || !auth.currentMembership) {
    redirect("/login");
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
