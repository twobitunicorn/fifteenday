import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-between px-6 py-16">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          ORS 192 · Oregon
        </p>
        <h1 className="text-4xl font-medium tracking-tight">fifteenday</h1>
      </header>

      <section className="space-y-6 py-12 text-lg leading-relaxed">
        <p>
          Public records belong to all of us. Almost nobody uses them. In Oregon,
          you can ask any public body for records and they have to answer within
          fifteen business days, or tell you why they won&apos;t.
        </p>
        <p>
          Writing the request is the hard part — wrong custodian, wrong scope,
          surprise fee quote, you give up. We do the writing. You bring the
          question.
        </p>
      </section>

      <div className="space-y-4">
        <Link
          href="/new"
          className="inline-flex h-11 items-center rounded-md bg-foreground px-6 text-sm font-medium text-background hover:opacity-90"
        >
          Start a request
        </Link>
        <p className="text-sm text-muted-foreground">
          Or browse the{" "}
          <Link href="/library" className="underline underline-offset-4">
            library of past requests
          </Link>
          .
        </p>
      </div>

      <footer className="pt-12 text-xs text-muted-foreground">
        Not a law firm. Not affiliated with any Oregon agency. Requests sent
        through fifteenday are public by default once a response arrives and is
        human-reviewed.
      </footer>
    </main>
  );
}
