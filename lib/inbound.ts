import { eq, sql } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import {
  attachments,
  custodians,
  messages,
  requests,
  statusEvents,
  type Request as RequestRow,
} from "@/drizzle/schema";

export type InboundAddress = { name?: string; address: string };
export type InboundHeader = { name: string; value: string };
export type InboundAttachment = {
  filename: string;
  contentType: string;
  contentBase64: string;
};

export type InboundEmail = {
  from: InboundAddress;
  to: InboundAddress[];
  subject: string;
  text?: string;
  html?: string;
  headers: InboundHeader[];
  attachments?: InboundAttachment[];
  resendId?: string;
};

export type MatchResult =
  | { kind: "matched"; request: RequestRow; via: string }
  | { kind: "orphan"; reason: string };

function header(headers: InboundHeader[], name: string): string | undefined {
  const h = headers.find(
    (x) => x.name.toLowerCase() === name.toLowerCase(),
  );
  return h?.value;
}

function parseAliasFromAddresses(
  addresses: InboundAddress[],
  inboundDomain: string,
): string | null {
  for (const a of addresses) {
    const m = a.address
      .toLowerCase()
      .match(new RegExp(`^req-([a-z0-9]+)@${inboundDomain.toLowerCase()}$`));
    if (m) return m[1] ?? null;
  }
  return null;
}

export async function matchRequest(email: InboundEmail): Promise<MatchResult> {
  const inboundDomain = process.env.INBOUND_DOMAIN;

  if (inboundDomain) {
    const alias = parseAliasFromAddresses(email.to, inboundDomain);
    if (alias) {
      const [r] = await db
        .select()
        .from(requests)
        .where(eq(requests.replyAlias, alias))
        .limit(1);
      if (r) return { kind: "matched", request: r, via: "reply_alias" };
    }
  }

  const inReplyTo = header(email.headers, "In-Reply-To");
  if (inReplyTo) {
    const [m] = await db
      .select({ request: requests })
      .from(messages)
      .innerJoin(requests, eq(messages.requestId, requests.id))
      .where(eq(messages.messageIdHeader, inReplyTo))
      .limit(1);
    if (m) return { kind: "matched", request: m.request, via: "in_reply_to" };
  }

  const fromDomain = email.from.address.split("@")[1]?.toLowerCase();
  if (fromDomain) {
    const candidates = await db
      .select({ request: requests, custodian: custodians })
      .from(requests)
      .innerJoin(custodians, eq(requests.custodianId, custodians.id))
      .where(sql`lower(split_part(${custodians.email}, '@', 2)) = ${fromDomain}`)
      .orderBy(sql`${requests.createdAt} desc`)
      .limit(1);
    if (candidates[0]) {
      return {
        kind: "matched",
        request: candidates[0].request,
        via: "sender_domain",
      };
    }
  }

  return {
    kind: "orphan",
    reason: "No alias, no matching In-Reply-To, no matching custodian domain",
  };
}

const STATUS_HEURISTICS: Array<{
  pattern: RegExp;
  status: "acknowledged" | "fee_quoted" | "denied" | "fulfilled";
}> = [
  { pattern: /(denied|deny|exempt|withhold|cannot disclose)/i, status: "denied" },
  { pattern: /(fee|estimate|cost to fulfill|charge|deposit)/i, status: "fee_quoted" },
  { pattern: /(acknowledg)/i, status: "acknowledged" },
];

export function pickStatus(
  subject: string,
  body: string,
): "acknowledged" | "fee_quoted" | "denied" | "fulfilled" | null {
  const haystack = `${subject}\n${body}`;
  for (const h of STATUS_HEURISTICS) {
    if (h.pattern.test(haystack)) return h.status;
  }
  return null;
}

export async function persistInbound(
  email: InboundEmail,
  match: Extract<MatchResult, { kind: "matched" }>,
): Promise<{ messageId: string; attachmentIds: string[] }> {
  const [msg] = await db
    .insert(messages)
    .values({
      requestId: match.request.id,
      direction: "inbound",
      fromEmail: email.from.address.toLowerCase(),
      toEmail: email.to[0]?.address.toLowerCase() ?? "",
      subject: email.subject,
      bodyText: email.text ?? null,
      bodyHtml: email.html ?? null,
      messageIdHeader: header(email.headers, "Message-Id") ?? null,
      inReplyToHeader: header(email.headers, "In-Reply-To") ?? null,
      raw: { headers: email.headers, matchedVia: match.via },
      resendId: email.resendId ?? null,
    })
    .returning();
  if (!msg) throw new Error("Failed to insert inbound message");

  const attachmentIds: string[] = [];
  if (email.attachments && process.env.BLOB_READ_WRITE_TOKEN) {
    for (const att of email.attachments) {
      const blob = await put(
        `responses/${match.request.id}/${att.filename}`,
        Buffer.from(att.contentBase64, "base64"),
        { access: "public", contentType: att.contentType, addRandomSuffix: true },
      );
      const [row] = await db
        .insert(attachments)
        .values({
          messageId: msg.id,
          blobUrl: blob.url,
          filename: att.filename,
          contentType: att.contentType,
          bytes: Buffer.byteLength(att.contentBase64, "base64"),
        })
        .returning();
      if (row) attachmentIds.push(row.id);
    }
  }

  const nextStatus = pickStatus(email.subject, email.text ?? email.html ?? "");
  if (nextStatus && nextStatus !== match.request.status) {
    await db
      .update(requests)
      .set({ status: nextStatus })
      .where(eq(requests.id, match.request.id));
    await db.insert(statusEvents).values({
      requestId: match.request.id,
      oldStatus: match.request.status,
      newStatus: nextStatus,
      reason: `Inbound heuristic on subject/body`,
    });
  }

  return { messageId: msg.id, attachmentIds };
}
