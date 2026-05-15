import { z } from "zod";

export const RequestIntent = z.object({
  topic: z
    .string()
    .min(10)
    .describe(
      "Plain-English description of what the requester wants to know. One or two sentences. No legal jargon.",
    ),
  recordTypes: z
    .array(z.string())
    .min(1)
    .describe(
      "Concrete record types the request will ask for. Examples: 'emails', 'invoices', 'contracts', 'meeting minutes', 'calendar entries', 'incident reports'.",
    ),
  dateRangeStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("Start of the date range, ISO yyyy-mm-dd."),
  dateRangeEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("End of the date range, ISO yyyy-mm-dd."),
  geographyHint: z
    .string()
    .describe(
      "Geographic scope. Examples: 'City of Portland', 'Multnomah County', 'Oregon statewide', 'Specific neighborhood: St. Johns'.",
    ),
  agencyHint: z
    .string()
    .optional()
    .describe(
      "Optional. If the requester already named a specific agency or office, capture it here verbatim.",
    ),
  searchTerms: z
    .array(z.string())
    .optional()
    .describe(
      "Optional. Specific names, keywords, or project titles to search within records. Keep the list short and concrete; vague terms are worse than none.",
    ),
  formatPreference: z
    .enum(["electronic", "paper", "either"])
    .describe(
      "Preferred delivery format. Default 'electronic' unless the requester says otherwise.",
    ),
  exclusions: z
    .array(z.string())
    .optional()
    .describe(
      "Optional. Categories the requester wants excluded to keep scope tight. Examples: 'drafts', 'internal-only emails', 'attachments'.",
    ),
  publicInterestRationale: z
    .string()
    .optional()
    .describe(
      "Optional. If the requester wants to request a fee waiver under ORS 192.324(5), the justification for why disclosure is in the public interest. Must be specific — 'I'm curious' does not qualify. Should reference what will be published or how the public will benefit.",
    ),
});

export type RequestIntentT = z.infer<typeof RequestIntent>;

export const initialIntent = (): Partial<RequestIntentT> => ({
  formatPreference: "electronic",
});
