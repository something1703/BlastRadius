import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const schema = readFileSync(path.resolve(__dirname, "../../supabase/schema.sql"), "utf-8");

  // Use the Supabase Management API (pg-meta) to execute raw SQL
  const resp = await fetch(`${url}/pg/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
      "apikey": key,
    },
    body: JSON.stringify({ query: schema }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error(`❌ Failed (${resp.status}): ${text}`);
    console.log("\n📋 Please run the schema manually:");
    console.log("   https://supabase.com/dashboard/project/rihcklhzhxljbpdxqwoy/sql/new");
    console.log("   Paste the contents of supabase/schema.sql\n");
    process.exit(1);
  }

  const result = await resp.json();
  console.log("✅ Schema applied successfully!");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
