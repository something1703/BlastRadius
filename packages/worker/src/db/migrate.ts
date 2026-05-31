import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

async function main() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    console.error("❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
    process.exit(1);
  }

  const schema = readFileSync(
    path.resolve(__dirname, "../../../../supabase/schema.sql"),
    "utf-8"
  );

  console.log("🏗️  Running Supabase schema migration...");
  console.log(`   URL: ${url}`);
  console.log(`   SQL length: ${schema.length} bytes\n`);

  const resp = await fetch(`${url}/pg/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
    body: JSON.stringify({ query: schema }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error(`❌ Failed (${resp.status}): ${text}`);
    console.log("\n📋 Please run the schema manually:");
    console.log(
      `   ${url.replace(".supabase.co", ".supabase.co")}/project/rihcklhzhxljbpdxqwoy/sql/new`
    );
    console.log("   Paste the contents of supabase/schema.sql\n");
    process.exit(1);
  }

  const result = await resp.json();
  console.log("✅ Schema applied successfully!");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
