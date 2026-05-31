import { createCoralClient } from "./client.js";

const coral = await createCoralClient();

// Get the FULL tool schemas from Coral
const tools = await coral.listTools();
console.log(JSON.stringify(tools, null, 2));

await coral.close();
