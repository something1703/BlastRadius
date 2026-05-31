import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type CoralClient = {
  listTools: () => Promise<{ name: string; description?: string }[]>;
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  close: () => Promise<void>;
};

export async function createCoralClient(): Promise<CoralClient> {
  const isWindows = process.platform === "win32";
  const coralCmd = isWindows 
    ? "c:\\BlastRadius\\coral-bin\\coral.exe" 
    : "coral";

  const transport = new StdioClientTransport({
    command: coralCmd,
    args: ["mcp-stdio", "--enable-feedback"],
    // Coral inherits env from the parent process. The source credentials
    // were set up via `coral source add` in Phase 1 and live in the config.
  });

  const client = new Client(
    { name: "blast-radius-worker", version: "0.1.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  return {
    listTools: async () => {
      const res = await client.listTools();
      return res.tools.map((t) => ({ name: t.name, ...(t.description !== undefined ? { description: t.description } : {}) }));
    },
    callTool: async (name, args) => {
      const res = await client.callTool({ name, arguments: args });
      return res;
    },
    close: async () => {
      await client.close();
    },
  };
}
