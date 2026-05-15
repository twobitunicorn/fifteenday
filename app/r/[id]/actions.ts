"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attachments,
  requests,
  statusEvents,
  type Attachment,
} from "@/drizzle/schema";
import { isAdminFromCookie } from "@/lib/auth";

export async function togglePublish(
  requestId: string,
  next: boolean,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdminFromCookie())) {
    return { ok: false, error: "Unauthorized" };
  }

  const [current] = await db
    .select()
    .from(requests)
    .where(eq(requests.id, requestId))
    .limit(1);
  if (!current) return { ok: false, error: "Not found" };

  await db
    .update(requests)
    .set({ published: next, publishedAt: next ? new Date() : null })
    .where(eq(requests.id, requestId));

  await db.insert(statusEvents).values({
    requestId,
    oldStatus: current.status,
    newStatus: current.status,
    reason: next ? "Published by admin" : "Unpublished by admin",
  });

  revalidatePath(`/r/${requestId}`);
  revalidatePath("/library");
  return { ok: true };
}

export async function reviewAttachment(
  attachmentId: string,
  next: Attachment["reviewStatus"],
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdminFromCookie())) {
    return { ok: false, error: "Unauthorized" };
  }

  const [updated] = await db
    .update(attachments)
    .set({ reviewStatus: next })
    .where(eq(attachments.id, attachmentId))
    .returning();
  if (!updated) return { ok: false, error: "Not found" };

  revalidatePath("/r");
  return { ok: true };
}
