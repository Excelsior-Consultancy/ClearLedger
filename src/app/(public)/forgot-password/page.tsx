import Link from "next/link";
import { Button, Card, CardContent } from "@heroui/react";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-[radial-gradient(circle_at_top,_#1f2937,_#0f172a_55%,_#020617)] px-4 py-10">
      <Card className="w-full max-w-md shadow-2xl border border-white/10 bg-white/95">
        <CardContent className="p-8 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">ClearLedger</p>
            <h1 className="text-3xl font-semibold text-zinc-900 mt-2">Reset password</h1>
            <p className="text-sm text-zinc-500 mt-1">
              ClearLedger uses Google-only sign-in, so there is no password reset flow.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            Use the Google account tied to your company invitation or ask an admin to send a new invite.
          </div>
          <Link href="/login">
            <Button className="w-full" variant="primary">Back to login</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
