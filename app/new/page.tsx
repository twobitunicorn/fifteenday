import { NewRequestWizard } from "./wizard";

export default function NewRequestPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-10 space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          New request · ORS 192
        </p>
        <h1 className="text-3xl font-medium tracking-tight">
          Tell us what you&apos;re trying to find out.
        </h1>
        <p className="text-sm text-muted-foreground">
          We&apos;ll turn your question into a properly-scoped public records
          request and route it to the right custodian. You review the draft
          before anything is sent.
        </p>
      </header>
      <NewRequestWizard />
    </main>
  );
}
