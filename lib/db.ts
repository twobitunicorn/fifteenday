import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/drizzle/schema";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const sqlClient = neon(url);

export const db = drizzle({ client: sqlClient, schema, casing: "snake_case" });

export { schema };
