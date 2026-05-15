import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isAdminPassword } from "@/lib/admin";
import { ADMIN_COOKIE } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function login(formData: FormData) {
  "use server";
  const password = formData.get("password")?.toString() ?? "";
  if (!isAdminPassword(password)) {
    redirect("/admin/login?error=1");
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE, password, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  redirect("/library");
}

async function logout() {
  "use server";
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

type SearchParams = Promise<{ error?: string }>;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-medium tracking-tight">Admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Single-user moderation gate. Phase D will replace this with magic-link
        auth.
      </p>

      <form action={login} className="mt-8 space-y-3">
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoFocus />
        </div>
        {error && (
          <p className="text-xs text-destructive">Wrong password.</p>
        )}
        <Button type="submit">Sign in</Button>
      </form>

      <form action={logout} className="mt-8">
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </main>
  );
}
