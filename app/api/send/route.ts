import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  custodians,
  messages,
  requesters,
  requests,
  statusEvents,
} from "@/drizzle/schema";
import { RequestIntent } from "@/lib/intent/schema";
import { sendRequestEmail } from "@/lib/email";
import { replyAliasFor, shortId } from "@/lib/ids";

export const runtime = "nodejs";

const RequestBody = z.object({
  intent: RequestIntent,
  custodianId: z.string().uuid(),
  requesterName: z.string().min(1).max(200),
  requesterEmail: z.string().email(),
  feeWaiverRequested: z.boolean(),
  draftText: z.string().min(50).max(20_000),
});

function makeSubject(topic: string): string {
  const trimmed = topic.length > 80 ? `${topic.slice(0, 77)}...` : topic;
  return `Public Records Request under ORS 192.314 — ${trimmed}`;
}

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = RequestBody.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    intent,
    custodianId,
    requesterName,
    requesterEmail,
    feeWaiverRequested,
    draftText,
  } = parsed.data;

  const fromEmail = process.env.OUTBOUND_FROM_EMAIL;
  if (!fromEmail) {
    return Response.json(
      { error: "OUTBOUND_FROM_EMAIL is not set on the server" },
      { status: 500 },
    );
  }

  const [custodian] = await db
    .select()
    .from(custodians)
    .where(eq(custodians.id, custodianId))
    .limit(1);
  if (!custodian) {
    return Response.json({ error: "Custodian not found" }, { status: 404 });
  }

  const [requester] = await db
    .insert(requesters)
    .values({ email: requesterEmail.toLowerCase(), name: requesterName })
    .onConflictDoUpdate({
      target: requesters.email,
      set: { name: requesterName },
    })
    .returning();
  if (!requester) {
    return Response.json({ error: "Failed to upsert requester" }, { status: 500 });
  }

  const alias = shortId();
  const replyTo = replyAliasFor(alias);

  const [created] = await db
    .insert(requests)
    .values({
      requesterId: requester.id,
      custodianId: custodian.id,
      intent,
      draftText,
      finalText: draftText,
      status: "draft",
      replyAlias: alias,
      feeWaiverRequested,
      publicInterestRationale: intent.publicInterestRationale ?? null,
    })
    .returning();
  if (!created) {
    return Response.json({ error: "Failed to insert request" }, { status: 500 });
  }

  const subject = makeSubject(intent.topic);

  const sendResult = await sendRequestEmail({
    to: custodian.email,
    from: fromEmail,
    replyTo,
    subject,
    text: draftText,
    headers: {
      "X-Fifteenday-Request-Id": created.id,
    },
  });

  await db.insert(messages).values({
    requestId: created.id,
    direction: "outbound",
    fromEmail,
    toEmail: custodian.email,
    subject,
    bodyText: draftText,
    messageIdHeader: sendResult.messageIdHeader,
    resendId: sendResult.resendId,
  });

  await db
    .update(requests)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(requests.id, created.id));

  await db.insert(statusEvents).values({
    requestId: created.id,
    oldStatus: "draft",
    newStatus: "sent",
    reason: `Sent via Resend to ${custodian.email}`,
  });

  return Response.json({
    requestId: created.id,
    replyTo,
    custodianEmail: custodian.email,
    custodianAgency: custodian.agency,
  });
}
