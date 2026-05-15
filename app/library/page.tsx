import Link from "next/link";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { custodians, requests } from "@/drizzle/schema";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q } = await searchParams;
  const term = q?.trim();

  const filters = [eq(requests.published, true)];
  if (term) {
    const like = `%${term.replace(/[\\%_]/g, "\\$&")}%`;
    filters.push(
      or(
        sql`${requests.intent}->>'topic' ILIKE ${like}`,
        sql`${requests.finalText} ILIKE ${like}`,
        sql`${custodians.agency} ILIKE ${like}`,
      )!,
    );
  }

  const rows = await db
    .select({
      id: requests.id,
      status: requests.status,
      sentAt: requests.sentAt,
      publishedAt: requests.publishedAt,
      intent: requests.intent,
      custodianAgency: custodians.agency,
      custodianJurisdiction: custodians.jurisdiction,
    })
    .from(requests)
    .innerJoin(custodians, eq(requests.custodianId, custodians.id))
    .where(and(...filters))
    .orderBy(desc(requests.publishedAt))
    .limit(50);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Library
        </p>
        <h1 className="text-3xl font-medium tracking-tight">
          Past requests, in public.
        </h1>
        <p className="text-sm text-muted-foreground">
          Every published request and its replies. Responses with attachments are
          posted only after human review.
        </p>
      </header>

      <form className="mb-8">
        <input
          type="search"
          name="q"
          defaultValue={term ?? ""}
          placeholder="Search topic, draft, or agency…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {term
            ? `No published requests match "${term}".`
            : "No published requests yet. Be the first."}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const topic =
              (r.intent as { topic?: string }).topic ?? "Untitled request";
            return (
              <li key={r.id}>
                <Link
                  href={`/r/${r.id}`}
                  className="block rounded-md border border-border p-4 transition hover:border-foreground/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-medium leading-snug">{topic}</h2>
                    <Badge variant="secondary">{r.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.custodianAgency} · {r.custodianJurisdiction}
                    {r.sentAt
                      ? ` · sent ${new Date(r.sentAt).toLocaleDateString()}`
                      : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
