import { cookies } from "next/headers";
import { isAdminPassword } from "@/lib/admin";

export const ADMIN_COOKIE = "fd_admin";

export async function isAdminFromCookie(): Promise<boolean> {
  const store = await cookies();
  const supplied = store.get(ADMIN_COOKIE)?.value;
  return isAdminPassword(supplied);
}
