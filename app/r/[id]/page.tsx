import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attachments,
  custodians,
  messages,
  requesters,
  requests,
} from "@/drizzle/schema";
import { isAdminFromCookie } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { PublishToggle } from "./publish-toggle";
import { AttachmentReview } from "./attachment-review";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const admin = await isAdminFromCookie();

  const [row] = await db
    .select({
      request: requests,
      custodian: custodians,
      requester: requesters,
    })
    .from(requests)
    .innerJoin(custodians, eq(requests.custodianId, custodians.id))
    .innerJoin(requesters, eq(requests.requesterId, requesters.id))
    .where(eq(requests.id, id))
    .limit(1);

  if (!row) notFound();
  if (!row.request.published && !admin) notFound();

  const messageRows = await db
    .select()
    .from(messages)
    .where(eq(messages.requestId, id))
    .orderBy(asc(messages.receivedAt));

  const attachmentRows = await db
    .select()
    .from(attachments)
    .where(
      admin
        ? eq(attachments.messageId, attachments.messageId)
        : and(eq(attachments.reviewStatus, "approved"))!,
    );
  const visibleAttachments = attachmentRows.filter((a) =>
    messageRows.some((m) => m.id === a.messageId),
  );

  const intent = row.request.intent as {
    topic?: string;
    recordTypes?: string[];
    dateRangeStart?: string;
    dateRangeEnd?: string;
    geographyHint?: string;
    publicInterestRationale?: string;
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Request · {row.request.status}
      </p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">
        {intent.topic ?? "Untitled request"}
      </h1>

      <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Field label="Custodian">{row.custodian.agency}</Field>
        <Field label="Jurisdiction">{row.custodian.jurisdiction}</Field>
        <Field label="Filed by">{row.requester.name}</Field>
        <Field label="Sent">
          {row.request.sentAt
            ? new Date(row.request.sentAt).toLocaleString()
            : "—"}
        </Field>
        {intent.dateRangeStart && intent.dateRangeEnd && (
          <Field label="Records date range">
            {intent.dateRangeStart} → {intent.dateRangeEnd}
          </Field>
        )}
        {intent.recordTypes && (
          <Field label="Record types">{intent.recordTypes.join(", ")}</Field>
        )}
        {row.request.feeWaiverRequested && (
          <Field label="Fee waiver">Requested under ORS 192.324(5)</Field>
        )}
      </dl>

      {admin && (
        <section className="mt-8 rounded-md border border-amber-400/40 bg-amber-50/40 p-4">
          <h2 className="text-sm font-medium">Admin controls</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Only you see this. Publish makes the request and approved
            attachments visible to anyone.
          </p>
          <div className="mt-3">
            <PublishToggle
              requestId={row.request.id}
              published={row.request.published}
            />
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Draft
        </h2>
        <pre className="mt-3 whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed">
          {row.request.finalText ?? row.request.draftText}
        </pre>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Thread
        </h2>
        {messageRows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {messageRows.map((m) => (
              <li
                key={m.id}
                className="rounded-md border border-border p-4 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-medium">
                    {m.direction === "outbound" ? "Sent" : "Received"}{" "}
                    <Badge variant="secondary">{m.direction}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(m.receivedAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {m.direction === "outbound" ? "To " : "From "}
                  {m.direction === "outbound" ? m.toEmail : m.fromEmail} ·{" "}
                  {m.subject}
                </p>
                <pre className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                  {m.bodyText ?? "(no text body)"}
                </pre>
                {visibleAttachments
                  .filter((a) => a.messageId === m.id)
                  .map((a) => (
                    <div
                      key={a.id}
                      className="mt-3 flex items-center justify-between rounded-sm border border-border/60 bg-background p-2 text-xs"
                    >
                      <div>
                        <a
                          href={a.blobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          {a.filename}
                        </a>{" "}
                        <span className="text-muted-foreground">
                          ({a.contentType}, {Math.round(a.bytes / 1024)} KB)
                        </span>
                      </div>
                      {admin ? (
                        <AttachmentReview
                          attachmentId={a.id}
                          reviewStatus={a.reviewStatus}
                        />
                      ) : (
                        <Badge variant="secondary">{a.reviewStatus}</Badge>
                      )}
                    </div>
                  ))}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
