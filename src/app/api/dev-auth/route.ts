import { NextRequest, NextResponse } from "next/server";
import {
  acceptInvitation,
  createWorkspaceForUser,
  findOrCreateAuthUser,
  selectWorkspace
} from "@/modules/auth/service";
import { getLocalDevAuthBootstrap } from "@/modules/auth/dev-mode";
import { writeDevIdentityCookie } from "@/modules/auth/provider";
import { resolveRequestOrigin } from "@/modules/shared/appOrigin";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const appOrigin = resolveRequestOrigin({ headers: request.headers });

  if (process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/login?error=dev-auth-disabled", appOrigin));
  }

  if (url.searchParams.get("logout") === "1") {
    const response = NextResponse.redirect(new URL("/login", appOrigin));
    await writeDevIdentityCookie(null, response.cookies);
    response.cookies.delete("clearledger_workspace");
    return response;
  }

  const localDevBootstrap = getLocalDevAuthBootstrap();
  const email = url.searchParams.get("email")?.trim().toLowerCase() ?? localDevBootstrap?.email ?? "";
  if (!email) {
    return NextResponse.redirect(new URL("/login?error=missing-email", appOrigin));
  }

  const name = url.searchParams.get("name")?.trim() || localDevBootstrap?.name || email.split("@")[0] || "Google user";
  const inviteToken = url.searchParams.get("inviteToken")?.trim() || "";
  const workspaceName = url.searchParams.get("workspaceName")?.trim() || "";
  const abn = url.searchParams.get("abn")?.trim() || "";

  const user = await findOrCreateAuthUser({
    provider: "supabase",
    providerUserId: email,
    email,
    name,
    emailVerified: true
  });
  const response = NextResponse.redirect(new URL("/dashboard", appOrigin));
  await writeDevIdentityCookie(
    {
      provider: "supabase",
      providerUserId: email,
      email,
      name,
      emailVerified: true
    },
    response.cookies
  );

  if (inviteToken) {
    await acceptInvitation(inviteToken, user.id, response.cookies);
    return response;
  }

  if (user.memberships.length > 0) {
    const membership =
      user.memberships.find((item) => item.workspaceId === url.searchParams.get("workspaceId") || item.workspaceId === localDevBootstrap?.workspaceId) ??
      user.memberships[0];
    await selectWorkspace(membership.workspaceId, response.cookies);
    return response;
  }

  if (workspaceName && abn) {
    try {
      await createWorkspaceForUser(
        {
          userId: user.id,
          workspaceName,
          abn
        },
        response.cookies
      );
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create workspace.";
      return NextResponse.redirect(new URL(`/signup?error=${encodeURIComponent(message)}`, appOrigin));
    }
  }

  response.headers.set("location", new URL("/signup", appOrigin).toString());
  return response;
}
