import type { Custodian } from "@/drizzle/schema";
import type { RequestIntentT } from "@/lib/intent/schema";

export const DRAFT_SYSTEM_PROMPT = `You write Oregon public records requests under ORS 192.311–192.478.

Rules:
- Address the named records custodian by title and agency.
- State a clear, narrow scope of records, with a date range and concrete record types.
- Cite ORS 192.314(1) when stating the right of access.
- Specify the preferred format (electronic or paper).
- If — and only if — a public_interest_rationale is provided in the input, include a fee-waiver paragraph that quotes ORS 192.324(5) and provides the specific rationale. If no rationale is provided, omit the fee-waiver paragraph entirely.
- Keep the body to under 400 words. Records officers triage; brevity helps.
- End with the requester's name and reply-to email.
- Do NOT invent specific record names, project titles, or facts the user did not provide.
- Do NOT use the phrase "any and all". It is overbroad and signals an inexperienced requester.
- Plain English. No legalese beyond the statute citation.

Output ONLY the request body. No subject line. No prefatory commentary. No closing remarks like "Let me know if you need anything else" — the user will review before sending.`;

const fewShot = `# Example 1 — narrow scope, no fee waiver

Dear Public Records Custodian, Portland Bureau of Transportation,

Under ORS 192.314(1), I request copies of the following records:

Records sought: invoices, purchase orders, and contracts related to traffic-calming installations on Southeast Division Street between SE 60th Avenue and SE 82nd Avenue, dated January 1, 2024 through December 31, 2024.

Format: Please provide electronic copies (PDF preferred), delivered to the reply-to email below.

Exclusions to keep scope tight: I am not requesting drafts, internal email correspondence, or attachments to invoices.

I understand ORS 192.324 allows the agency to charge for the actual cost of locating and copying records and to issue a written fee estimate before fulfilling the request. If the estimated fee will exceed $25, please contact me with the estimate before proceeding.

Thank you for your assistance.

Sincerely,
Jane Smith
jane.smith@example.com

# Example 2 — with fee waiver under ORS 192.324(5)

Dear Public Records Custodian, Multnomah County Sheriff's Office,

Under ORS 192.314(1), I request copies of the following records:

Records sought: monthly use-of-force incident reports filed by the Multnomah County Sheriff's Office, for the period January 1, 2024 through June 30, 2025.

Format: Please provide electronic copies (PDF preferred).

Fee waiver: Under ORS 192.324(5), I request a waiver or reduction of fees because furnishing these records is in the public interest. These records will be analyzed and published as part of a public dashboard tracking county law-enforcement use-of-force incidents, accessible at no cost to readers. The aggregated reporting will inform ongoing public discussion of county policing practices and is not for commercial use.

Thank you for your assistance.

Sincerely,
Alex Rivera
alex.rivera@example.com
`;

export function buildDraftPrompt(
  intent: RequestIntentT,
  custodian: Custodian,
  requesterName: string,
  replyEmail: string,
  feeWaiverRequested: boolean,
): string {
  return [
    fewShot,
    "# Now draft this request",
    "Custodian:",
    `  Name: ${custodian.name}`,
    `  Agency: ${custodian.agency}`,
    `  Jurisdiction: ${custodian.jurisdiction}`,
    "",
    "Intent:",
    `  Topic: ${intent.topic}`,
    `  Record types: ${intent.recordTypes.join(", ")}`,
    `  Date range: ${intent.dateRangeStart} to ${intent.dateRangeEnd}`,
    `  Geography: ${intent.geographyHint}`,
    intent.agencyHint ? `  Agency hint from user: ${intent.agencyHint}` : "",
    intent.searchTerms?.length
      ? `  Search terms: ${intent.searchTerms.join(", ")}`
      : "",
    `  Format preference: ${intent.formatPreference}`,
    intent.exclusions?.length
      ? `  Exclusions: ${intent.exclusions.join(", ")}`
      : "",
    feeWaiverRequested && intent.publicInterestRationale
      ? `  Public interest rationale (include fee-waiver paragraph): ${intent.publicInterestRationale}`
      : "  Fee waiver: do not include the fee-waiver paragraph.",
    "",
    "Requester:",
    `  Name: ${requesterName}`,
    `  Reply-to: ${replyEmail}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const ROUTER_SYSTEM_PROMPT = `You match an Oregon public records request to the most likely records custodian from a provided directory.

Rules:
- You must select an id from the provided directory. Do not invent custodians.
- If multiple are plausible, return the top 3 ranked by likelihood.
- Provide a one-sentence reason per choice referencing what in the intent matched the custodian.
- If none fit (e.g. the request is about a federal or out-of-state agency), return an empty array and explain why in the "note" field.

Output JSON only.`;
