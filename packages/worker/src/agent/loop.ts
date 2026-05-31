import {
  GoogleGenAI,
  Type,
  FunctionCallingConfigMode,
} from "@google/genai";
import type { CoralClient } from "../coral/client.js";
import { VerdictSchema } from "../verdict/schema.js";
import type { Verdict } from "../verdict/schema.js";
import { SYSTEM_PROMPT } from "./system_prompt.js";
import pino from "pino";

const log = pino({ name: "agent-loop" });

export type Job = {
  trigger_type: "flag_flip" | "deploy" | "metric_spike" | "manual";
  identifier: string;
  occurred_at: string;
  hint?: string;
};

// Track every SQL the agent runs so we can persist it later
export type QueryRecord = {
  purpose: string;
  sql: string;
  row_count: number;
  result: unknown;
};

/**
 * Runs the full analysis loop: Gemini drives Coral via MCP tools,
 * discovers schema, runs SQL, and returns a typed Verdict.
 */
export async function runAnalysis(
  job: Job,
  coral: CoralClient,
  options?: {
    model?: string;
    onQuery?: (record: QueryRecord) => void;
  }
): Promise<Verdict> {
  const modelName = options?.model ?? process.env.GEMINI_VERDICT_MODEL ?? "gemini-2.5-flash";
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });

  // Discover tools that Coral actually exposes via MCP
  const coralTools = await coral.listTools();
  log.info({ tools: coralTools.map((t) => t.name) }, "coral tools discovered");

  // Define tools for Gemini matching Coral's EXACT MCP schemas
  const tools = [
    {
      functionDeclarations: [
        {
          name: "sql",
          description:
            "Execute a read-only SQL query against the Coral database. Returns rows as JSON.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              sql: {
                type: Type.STRING,
                description: "One read-only SQL statement to execute against the Coral database.",
              },
            },
            required: ["sql"],
          },
        },
        {
          name: "list_catalog",
          description:
            "List database catalog items — tables and table functions currently visible in the Coral database.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              schema: {
                type: Type.STRING,
                description: "Optional exact SQL schema name to list.",
              },
              kind: {
                type: Type.STRING,
                description: "Optional item kind to list: 'table' or 'table_function'. Omit for all.",
              },
              limit: {
                type: Type.INTEGER,
                description: "Maximum catalog items to return (1-200). Defaults to 50.",
              },
            },
          },
        },
        {
          name: "list_columns",
          description:
            "List columns for one database table with optional regex and required-filter narrowing.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              schema: {
                type: Type.STRING,
                description: "Exact SQL schema name (e.g. 'launchdarkly', 'sentry', 'vercel').",
              },
              table: {
                type: Type.STRING,
                description: "Exact table name within the SQL schema.",
              },
              pattern: {
                type: Type.STRING,
                description: "Optional Rust regex matched against column names, descriptions, and data types.",
              },
              required_only: {
                type: Type.BOOLEAN,
                description: "Only return columns that are required filters. Defaults to false.",
              },
            },
            required: ["schema", "table"],
          },
        },
        {
          name: "describe_table",
          description:
            "Describe one database table without returning full column definitions.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              schema: {
                type: Type.STRING,
                description: "Exact SQL schema name.",
              },
              table: {
                type: Type.STRING,
                description: "Exact table name within the SQL schema.",
              },
            },
            required: ["schema", "table"],
          },
        },
        {
          name: "feedback",
          description:
            "Submit feedback when you are blocked. Use when a query fails twice or you are stuck.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              trying_to_do: {
                type: Type.STRING,
                description: "What you were trying to do.",
              },
              tried: {
                type: Type.STRING,
                description: "What you already tried.",
              },
              stuck: {
                type: Type.STRING,
                description: "Where you got blocked.",
              },
            },
            required: ["trying_to_do", "tried", "stuck"],
          },
        },
      ],
    },
  ];

  // Pre-compute epoch timestamps for the agent since LLMs are terrible at date-to-epoch math
  const occurredEpochMs = new Date(job.occurred_at).getTime();
  const windowMs = 24 * 60 * 60 * 1000; // 24 hours
  const fromEpoch = occurredEpochMs - windowMs;
  const toEpoch = occurredEpochMs + windowMs;

  const epochHint = `\nPRE-COMPUTED TIMESTAMPS (use these, do NOT compute your own):
- occurred_at "${job.occurred_at}" = ${occurredEpochMs} epoch ms
- For LaunchDarkly audit_log: use WHERE "from" = '${fromEpoch}' AND "to" = '${toEpoch}'
- For Vercel deployments: use WHERE created_at BETWEEN ${fromEpoch} AND ${toEpoch}`;

  const userMessage = `Job:\n${JSON.stringify(job, null, 2)}\n${epochHint}\n${job.hint ? `\nAdditional context: ${job.hint}` : ""}\n\nAnalyze this incident and return a Verdict JSON.`;

  log.info({ job, model: modelName }, "starting analysis");

  const chat = ai.chats.create({
    model: modelName,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools,
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.AUTO,
        },
      },
    },
  });

  let response = await chat.sendMessage({ message: userMessage });

  const queryRecords: QueryRecord[] = [];
  const MAX_TURNS = 25;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const functionCalls = parts.filter((p: any) => p.functionCall);

    // If no function calls, the model is done — extract the verdict
    if (functionCalls.length === 0) {
      const textParts = parts.filter((p: any) => p.text);
      const fullText = textParts.map((p: any) => p.text).join("");

      if (!fullText.trim()) {
        throw new Error("Agent returned empty response without function calls");
      }

      log.info({ turn }, "agent finished, parsing verdict");

      // Try to extract JSON from the response (handle markdown fences gracefully)
      let jsonStr = fullText.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1]!.trim();
      }

      const parsed = JSON.parse(jsonStr);
      const verdict = VerdictSchema.parse(parsed);

      // Attach the query records to the verdict evidence
      verdict.evidence.queries = queryRecords.map((q) => ({
        purpose: q.purpose,
        sql: q.sql,
        row_count: q.row_count,
      }));

      return verdict;
    }

    // Process function calls
    const functionResponses: any[] = [];

    for (const part of functionCalls) {
      const fc = (part as any).functionCall;
      const toolName = fc.name;
      const toolArgs = fc.args ?? {};

      log.info({ tool: toolName, args: toolArgs }, `agent calling tool (turn ${turn})`);

      try {
        const result = await coral.callTool(toolName, toolArgs);

        // Extract the text content and row count from the MCP response
        const mcpResult = result as any;
        let responseText: string;
        let rowCount = 0;

        if (mcpResult?.content?.[0]?.text) {
          responseText = mcpResult.content[0].text;
          // Try to count rows from the JSON response
          try {
            const parsed = JSON.parse(responseText);
            if (parsed?.rows) {
              rowCount = parsed.rows.length;
            }
          } catch {
            // Not JSON, that's fine
          }
        } else {
          responseText = JSON.stringify(mcpResult);
        }

        // Record SQL queries for evidence
        if (toolName === "sql" && toolArgs.sql) {
          const record: QueryRecord = {
            purpose: `Turn ${turn}: ${toolArgs.sql.substring(0, 80)}...`,
            sql: toolArgs.sql as string,
            row_count: rowCount,
            result: mcpResult?.structuredContent ?? mcpResult,
          };
          queryRecords.push(record);
          options?.onQuery?.(record);
        }

        functionResponses.push({
          name: toolName,
          response: { result: responseText },
        });

        log.info(
          { tool: toolName, rowCount, responseLength: responseText.length },
          "tool call succeeded"
        );
      } catch (err) {
        const errorMsg = `ERROR: ${(err as Error).message}`;
        log.error({ tool: toolName, error: errorMsg }, "tool call failed");

        functionResponses.push({
          name: toolName,
          response: { error: errorMsg },
        });
      }
    }

    // Send function results back to Gemini
    response = await chat.sendMessage({
      message: functionResponses.map((fr) => ({
        functionResponse: fr,
      })),
    });
  }

  throw new Error(`Agent exceeded ${MAX_TURNS} turns without producing a verdict`);
}
