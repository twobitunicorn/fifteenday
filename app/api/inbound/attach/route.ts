import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { messages, requests, statusEvents } from "@/drizzle/schema";
import { isAdminPassword } from "@/lib/admin";
import { pickStatus } from "@/lib/inbound";

export const runtime = "nodejs";

const Body = z.object({
  adminPassword: z.string().min(1),
  requestId: z.string().uuid(),
  fromEmail: z.string().email(),
  subject: z.string().min(1).max(500),
  bodyText: z.string().min(1).max(100_000),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!isAdminPassword(parsed.data.adminPassword)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [request] = await db
    .select()
    .from(requests)
    .where(eq(requests.id, parsed.data.requestId))
    .limit(1);
  if (!request) {
    return Response.json({ error: "Request not found" }, { status: 404 });
  }

  const [msg] = await db
    .insert(messages)
    .values({
      requestId: request.id,
      direction: "inbound",
      fromEmail: parsed.data.fromEmail.toLowerCase(),
      toEmail: process.env.OUTBOUND_FROM_EMAIL ?? "manual-attach",
      subject: parsed.data.subject,
      bodyText: parsed.data.bodyText,
      raw: { manualAttach: true },
    })
    .returning();
  if (!msg) {
    return Response.json({ error: "Insert failed" }, { status: 500 });
  }

  const nextStatus = pickStatus(parsed.data.subject, parsed.data.bodyText);
  if (nextStatus && nextStatus !== request.status) {
    await db
      .update(requests)
      .set({ status: nextStatus })
      .where(eq(requests.id, request.id));
    await db.insert(statusEvents).values({
      requestId: request.id,
      oldStatus: request.status,
      newStatus: nextStatus,
      reason: "Manual paste-in by admin",
    });
  }

  return Response.json({ ok: true, messageId: msg.id });
}
