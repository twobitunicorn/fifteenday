import { Webhook } from "svix";
import { z } from "zod";
import { matchRequest, persistInbound, type InboundEmail } from "@/lib/inbound";

export const runtime = "nodejs";

const InboundPayload = z.object({
  type: z.string().optional(),
  data: z.object({
    id: z.string().optional(),
    from: z.union([
      z.object({ name: z.string().optional(), address: z.string() }),
      z.string(),
    ]),
    to: z.array(
      z.union([
        z.object({ name: z.string().optional(), address: z.string() }),
        z.string(),
      ]),
    ),
    subject: z.string(),
    text: z.string().optional(),
    html: z.string().optional(),
    headers: z
      .array(z.object({ name: z.string(), value: z.string() }))
      .optional()
      .default([]),
    attachments: z
      .array(
        z.object({
          filename: z.string(),
          contentType: z.string(),
          content: z.string(),
        }),
      )
      .optional(),
  }),
});

function normalizeAddress(
  raw:
    | string
    | { name?: string; address: string },
): { name?: string; address: string } {
  if (typeof raw === "string") {
    const m = raw.match(/^(?:"?([^"<]+?)"?\s*)?<?([^<>]+)>?$/);
    return { name: m?.[1]?.trim(), address: (m?.[2] ?? raw).trim() };
  }
  return raw;
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const bodyText = await req.text();

  if (secret) {
    try {
      const wh = new Webhook(secret);
      wh.verify(bodyText, Object.fromEntries(req.headers));
    } catch (e) {
      console.error("Webhook signature verification failed", e);
      return new Response("Invalid signature", { status: 401 });
    }
  } else {
    console.warn(
      "RESEND_WEBHOOK_SECRET is not set; accepting inbound webhook without verification. " +
        "Set the secret before exposing this endpoint to the public internet.",
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(bodyText);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const parsed = InboundPayload.safeParse(json);
  if (!parsed.success) {
    console.error("Inbound payload shape unexpected", parsed.error.flatten());
    return new Response("Invalid payload", { status: 400 });
  }

  const data = parsed.data.data;

  const email: InboundEmail = {
    from: normalizeAddress(data.from),
    to: data.to.map(normalizeAddress),
    subject: data.subject,
    text: data.text,
    html: data.html,
    headers: data.headers,
    attachments: data.attachments?.map((a) => ({
      filename: a.filename,
      contentType: a.contentType,
      contentBase64: a.content,
    })),
    resendId: data.id,
  };

  const match = await matchRequest(email);
  if (match.kind === "orphan") {
    console.warn("Orphan inbound email:", match.reason, {
      from: email.from.address,
      to: email.to.map((t) => t.address),
      subject: email.subject,
    });
    return Response.json(
      { ok: true, orphan: true, reason: match.reason },
      { status: 200 },
    );
  }

  const result = await persistInbound(email, match);
  return Response.json({
    ok: true,
    requestId: match.request.id,
    matchedVia: match.via,
    messageId: result.messageId,
    attachmentIds: result.attachmentIds,
  });
}
