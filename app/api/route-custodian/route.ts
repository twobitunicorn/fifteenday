import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { custodians } from "@/drizzle/schema";
import { RequestIntent } from "@/lib/intent/schema";
import { ROUTER_SYSTEM_PROMPT } from "@/lib/ors192/prompts";

export const runtime = "nodejs";

const RequestBody = z.object({
  intent: RequestIntent,
});

const RouterOutput = z.object({
  picks: z
    .array(
      z.object({
        custodianId: z.string().uuid(),
        reason: z.string().min(10),
      }),
    )
    .max(3),
  note: z.string().optional(),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = RequestBody.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const directory = await db.select().from(custodians);
  if (directory.length === 0) {
    return Response.json(
      {
        picks: [],
        note: "Custodian directory is empty. Run `pnpm db:seed`.",
      },
      { status: 200 },
    );
  }

  const directoryForLLM = directory.map((c) => ({
    id: c.id,
    name: c.name,
    agency: c.agency,
    jurisdiction: c.jurisdiction,
    notes: c.notes ?? "",
  }));

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: RouterOutput,
    schemaName: "CustodianRouting",
    system: ROUTER_SYSTEM_PROMPT,
    prompt: [
      `Intent:\n${JSON.stringify(parsed.data.intent, null, 2)}`,
      "",
      `Directory:\n${JSON.stringify(directoryForLLM, null, 2)}`,
    ].join("\n"),
  });

  const idsInDirectory = new Set(directory.map((c) => c.id));
  const validPicks = object.picks.filter((p) =>
    idsInDirectory.has(p.custodianId),
  );
  const enriched = validPicks.map((p) => {
    const c = directory.find((d) => d.id === p.custodianId)!;
    return {
      custodianId: p.custodianId,
      reason: p.reason,
      custodian: c,
    };
  });

  return Response.json({ picks: enriched, note: object.note });
}
