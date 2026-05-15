import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { db } from "@/lib/db";
import { custodians } from "@/drizzle/schema";
import { CUSTODIAN_SEEDS } from "@/lib/custodians/seed";
import { sql } from "drizzle-orm";

async function main() {
  console.log(`Seeding ${CUSTODIAN_SEEDS.length} custodians (delete + insert)...`);

  await db.delete(custodians);

  for (const seed of CUSTODIAN_SEEDS) {
    await db.insert(custodians).values({
      name: seed.name,
      agency: seed.agency,
      jurisdiction: seed.jurisdiction,
      email: seed.email,
      publicRecordsUrl: seed.publicRecordsUrl,
      notes: seed.notes,
      source: seed.source,
    });
  }

  const count = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(custodians);
  console.log(`custodians table now has ${count[0]?.n ?? 0} rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
