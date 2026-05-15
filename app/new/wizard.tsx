"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { RequestIntentT } from "@/lib/intent/schema";
import type { Custodian } from "@/drizzle/schema";

type CustodianPick = {
  custodianId: string;
  reason: string;
  custodian: Custodian;
};

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const FEE_WAIVER_STATUTE = `ORS 192.324(5): "The custodian of a public record may furnish copies without charge or at a substantially reduced fee if the custodian determines that the waiver or reduction of fees is in the public interest because making the record available primarily benefits the general public."`;

export function NewRequestWizard() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userInput, setUserInput] = useState("");
  const [intent, setIntent] = useState<Partial<RequestIntentT>>({
    formatPreference: "electronic",
  });

  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");

  const [feeWaiverRequested, setFeeWaiverRequested] = useState(false);
  const [rationale, setRationale] = useState("");

  const [picks, setPicks] = useState<CustodianPick[]>([]);
  const [routerNote, setRouterNote] = useState<string | null>(null);
  const [chosenCustodianId, setChosenCustodianId] = useState<string | null>(
    null,
  );

  const [draft, setDraft] = useState("");
  const [sendResult, setSendResult] = useState<{
    requestId: string;
    custodianAgency: string;
    custodianEmail: string;
  } | null>(null);

  const router = useRouter();

  async function extractIntent() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message ?? `Extract failed (${res.status})`);
      }
      const data = await res.json();
      setIntent((prev) => ({ ...prev, ...data.intent }));
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function routeCustodian() {
    setError(null);
    setLoading(true);
    try {
      const fullIntent = buildFullIntent();
      if (!fullIntent) return;
      const res = await fetch("/api/route-custodian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: fullIntent }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message ?? `Routing failed (${res.status})`);
      }
      const data = await res.json();
      setPicks(data.picks ?? []);
      setRouterNote(data.note ?? null);
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function generateDraft(custodianId: string) {
    setError(null);
    setLoading(true);
    setDraft("");
    setChosenCustodianId(custodianId);
    try {
      const fullIntent = buildFullIntent();
      if (!fullIntent) return;
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: fullIntent,
          custodianId,
          requesterName,
          requesterEmail,
          feeWaiverRequested,
        }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message ?? `Draft failed (${res.status})`);
      }
      setStep(6);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setDraft(acc);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function sendRequest() {
    setError(null);
    setLoading(true);
    try {
      const fullIntent = buildFullIntent();
      if (!fullIntent || !chosenCustodianId) return;
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: fullIntent,
          custodianId: chosenCustodianId,
          requesterName,
          requesterEmail,
          feeWaiverRequested,
          draftText: draft,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message ?? `Send failed (${res.status})`);
      }
      const data = await res.json();
      setSendResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function buildFullIntent(): RequestIntentT | null {
    const required: (keyof RequestIntentT)[] = [
      "topic",
      "recordTypes",
      "dateRangeStart",
      "dateRangeEnd",
      "geographyHint",
      "formatPreference",
    ];
    for (const key of required) {
      if (intent[key] === undefined || intent[key] === null) {
        setError(`Missing field: ${key}`);
        return null;
      }
    }
    return {
      ...(intent as RequestIntentT),
      publicInterestRationale: feeWaiverRequested
        ? rationale.trim() || undefined
        : undefined,
    };
  }

  if (sendResult) {
    return (
      <section className="space-y-6">
        <h2 className="text-2xl font-medium">Sent.</h2>
        <p className="text-sm">
          Your request was sent to{" "}
          <span className="font-medium">{sendResult.custodianAgency}</span> (
          {sendResult.custodianEmail}). Replies will be threaded back through{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            {sendResult.requestId.slice(0, 8)}…
          </code>{" "}
          and appear in your library once human-reviewed.
        </p>
        <p className="text-sm text-muted-foreground">
          Oregon law requires the agency to acknowledge or respond within fifteen
          business days under ORS 192.329.
        </p>
        <Button onClick={() => router.push(`/r/${sendResult.requestId}`)}>
          View request
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <StepIndicator step={step} />

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Label htmlFor="userInput">Your question</Label>
          <Textarea
            id="userInput"
            rows={6}
            placeholder="e.g. How much did PBOT spend on traffic-calming projects in southeast Portland in 2024? I want to see invoices and contracts."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Plain English. Name the agency if you know it; we&apos;ll guess if
            you don&apos;t.
          </p>
          <Button
            onClick={extractIntent}
            disabled={loading || userInput.trim().length < 10}
          >
            {loading ? "Reading…" : "Continue"}
          </Button>
        </div>
      )}

      {step === 2 && (
        <RefineIntent
          intent={intent}
          setIntent={setIntent}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-medium">Who&apos;s asking?</h2>
          <p className="text-sm text-muted-foreground">
            The agency will reply to this email. Your name appears on the
            request.
          </p>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Your email</Label>
              <Input
                id="email"
                type="email"
                value={requesterEmail}
                onChange={(e) => setRequesterEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              onClick={() => setStep(4)}
              disabled={
                requesterName.trim().length < 1 ||
                !/.+@.+\..+/.test(requesterEmail)
              }
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-medium">Fee waiver?</h2>
          <p className="text-sm text-muted-foreground">
            Oregon allows custodians to waive or reduce fees when releasing
            records is in the public interest. This is not a tool for personal
            curiosity — agencies push back when waivers are claimed without
            cause.
          </p>
          <blockquote className="border-l-2 pl-4 text-sm italic text-muted-foreground">
            {FEE_WAIVER_STATUTE}
          </blockquote>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={feeWaiverRequested}
              onCheckedChange={(c) => setFeeWaiverRequested(c === true)}
              className="mt-0.5"
            />
            <span>
              Request a fee waiver under ORS 192.324(5). I will provide a
              specific public-interest rationale below.
            </span>
          </label>
          {feeWaiverRequested && (
            <div className="grid gap-1.5">
              <Label htmlFor="rationale">Public-interest rationale</Label>
              <Textarea
                id="rationale"
                rows={4}
                placeholder="e.g. The records will be analyzed and published as a public dashboard at example.org so other Portland residents can see how transportation dollars are spent."
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Specific. Reference what you&apos;ll publish or how the public
                will benefit.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button
              onClick={routeCustodian}
              disabled={
                loading ||
                (feeWaiverRequested && rationale.trim().length < 30)
              }
            >
              {loading ? "Routing…" : "Find the right custodian"}
            </Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <h2 className="text-xl font-medium">Where to send</h2>
          {routerNote && (
            <p className="rounded-md border border-amber-400/40 bg-amber-50 px-3 py-2 text-sm">
              {routerNote}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Pick a custodian. We rank by best match for your question.
          </p>
          <div className="space-y-2">
            {picks.map((p) => (
              <button
                key={p.custodianId}
                type="button"
                onClick={() => generateDraft(p.custodianId)}
                disabled={loading}
                className="w-full rounded-md border border-border p-4 text-left transition hover:border-foreground/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{p.custodian.agency}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.custodian.jurisdiction} · {p.custodian.email}
                    </div>
                  </div>
                  <Badge variant="secondary">{p.custodian.source}</Badge>
                </div>
                <p className="mt-2 text-sm">{p.reason}</p>
              </button>
            ))}
            {picks.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">
                No custodians available. Run <code>pnpm db:seed</code> and try
                again.
              </p>
            )}
          </div>
          <Button variant="ghost" onClick={() => setStep(4)}>
            Back
          </Button>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-4">
          <h2 className="text-xl font-medium">Review the draft</h2>
          <p className="text-sm text-muted-foreground">
            Edit anything before sending. Once sent, the request goes to the
            agency and is tracked here.
          </p>
          <Textarea
            rows={20}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(5)}>
              Back
            </Button>
            <Button
              onClick={sendRequest}
              disabled={loading || draft.trim().length < 100}
            >
              {loading ? "Sending…" : "Send to custodian"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const labels = [
    "Question",
    "Refine",
    "Identity",
    "Fee waiver",
    "Custodian",
    "Send",
  ];
  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const active = step === n;
        const done = step > n;
        return (
          <li
            key={label}
            className={
              active
                ? "font-medium text-foreground"
                : done
                  ? "text-foreground/60"
                  : ""
            }
          >
            {n}. {label}
          </li>
        );
      })}
    </ol>
  );
}

function RefineIntent({
  intent,
  setIntent,
  onBack,
  onNext,
}: {
  intent: Partial<RequestIntentT>;
  setIntent: React.Dispatch<React.SetStateAction<Partial<RequestIntentT>>>;
  onBack: () => void;
  onNext: () => void;
}) {
  const setField = <K extends keyof RequestIntentT>(
    key: K,
    value: RequestIntentT[K],
  ) => setIntent((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium">Does this look right?</h2>
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="topic">Topic</Label>
          <Textarea
            id="topic"
            rows={2}
            value={intent.topic ?? ""}
            onChange={(e) => setField("topic", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="recordTypes">Record types (comma-separated)</Label>
          <Input
            id="recordTypes"
            value={(intent.recordTypes ?? []).join(", ")}
            onChange={(e) =>
              setField(
                "recordTypes",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="dateStart">From</Label>
            <Input
              id="dateStart"
              type="date"
              value={intent.dateRangeStart ?? ""}
              onChange={(e) => setField("dateRangeStart", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dateEnd">To</Label>
            <Input
              id="dateEnd"
              type="date"
              value={intent.dateRangeEnd ?? ""}
              onChange={(e) => setField("dateRangeEnd", e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="geo">Geography</Label>
          <Input
            id="geo"
            value={intent.geographyHint ?? ""}
            onChange={(e) => setField("geographyHint", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="agency">Agency (if you named one)</Label>
          <Input
            id="agency"
            value={intent.agencyHint ?? ""}
            onChange={(e) => setField("agencyHint", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="terms">Search terms (optional, comma-separated)</Label>
          <Input
            id="terms"
            value={(intent.searchTerms ?? []).join(", ")}
            onChange={(e) =>
              setField(
                "searchTerms",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="excl">Exclusions (optional, comma-separated)</Label>
          <Input
            id="excl"
            value={(intent.exclusions ?? []).join(", ")}
            onChange={(e) =>
              setField(
                "exclusions",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={
            !intent.topic ||
            !(intent.recordTypes ?? []).length ||
            !intent.dateRangeStart ||
            !intent.dateRangeEnd ||
            !intent.geographyHint
          }
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
