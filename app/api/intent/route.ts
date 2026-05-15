import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import { RequestIntent } from "@/lib/intent/schema";

export const runtime = "nodejs";

const ExtractSchema = RequestIntent.pick({
  topic: true,
  recordTypes: true,
  dateRangeStart: true,
  dateRangeEnd: true,
  geographyHint: true,
  agencyHint: true,
  searchTerms: true,
  exclusions: true,
  formatPreference: true,
});

const RequestBody = z.object({
  userInput: z.string().min(1).max(4000),
  today: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const EXTRACT_SYSTEM = `You are helping a person write an Oregon public records request under ORS 192.

Given their free-form description of what they want to know, extract the structured fields. Rules:

- topic: a one-or-two sentence plain-English summary of the question.
- recordTypes: concrete record types only (e.g. "emails", "invoices", "incident reports", "meeting minutes"). Never "any and all records".
- dateRangeStart / dateRangeEnd: ISO yyyy-mm-dd. If the user said "last year", interpret using the provided today's date. If the user gave no date hint, use the past 12 months ending today.
- geographyHint: the geographic scope (e.g. "City of Portland", "Multnomah County", "Oregon statewide"). Infer from agency names or place names.
- agencyHint: ONLY set this if the user explicitly named an agency or office. Otherwise leave blank.
- searchTerms: optional. Only include terms the user explicitly mentioned. Do not invent.
- exclusions: optional. Only include exclusions the user mentioned (e.g. "I don't need drafts" → exclusions: ["drafts"]).
- formatPreference: default "electronic" unless the user said paper or either.

If something is genuinely unknowable from the input, make a conservative inference rather than leaving it blank. The user will review and edit before submitting.`;

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = RequestBody.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const today =
    parsed.data.today ?? new Date().toISOString().slice(0, 10);

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: ExtractSchema,
    schemaName: "PublicRecordsRequestExtraction",
    schemaDescription:
      "Structured fields extracted from a citizen's free-form description of an Oregon public records request.",
    system: EXTRACT_SYSTEM,
    prompt: `Today's date is ${today}.\n\nUser said:\n"""\n${parsed.data.userInput}\n"""\n\nExtract the fields.`,
  });

  return Response.json({ intent: object });
}
