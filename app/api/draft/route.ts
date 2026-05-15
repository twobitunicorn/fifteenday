import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { custodians } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { RequestIntent } from "@/lib/intent/schema";
import { DRAFT_SYSTEM_PROMPT, buildDraftPrompt } from "@/lib/ors192/prompts";

export const runtime = "nodejs";

const RequestBody = z.object({
  intent: RequestIntent,
  custodianId: z.string().uuid(),
  requesterName: z.string().min(1).max(200),
  requesterEmail: z.string().email(),
  feeWaiverRequested: z.boolean(),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = RequestBody.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    intent,
    custodianId,
    requesterName,
    requesterEmail,
    feeWaiverRequested,
  } = parsed.data;

  const [custodian] = await db
    .select()
    .from(custodians)
    .where(eq(custodians.id, custodianId))
    .limit(1);

  if (!custodian) {
    return Response.json({ error: "Custodian not found" }, { status: 404 });
  }

  if (feeWaiverRequested && !intent.publicInterestRationale) {
    return Response.json(
      {
        error:
          "Fee waiver requested but no publicInterestRationale provided. Under ORS 192.324(5) the rationale is required.",
      },
      { status: 400 },
    );
  }

  const prompt = buildDraftPrompt(
    intent,
    custodian,
    requesterName,
    requesterEmail,
    feeWaiverRequested,
  );

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: DRAFT_SYSTEM_PROMPT,
    prompt,
  });

  return result.toTextStreamResponse();
}
