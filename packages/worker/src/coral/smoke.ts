import { createCoralClient } from "./client.js";

const coral = await createCoralClient();
console.log("Tools:", await coral.listTools());
const result = await coral.callTool("sql", {
  sql: "SELECT schema_name, COUNT(*) AS n FROM coral.tables GROUP BY schema_name",
});
console.log("Result:", JSON.stringify(result, null, 2));
await coral.close();
