#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const FLEET_API_BASE = "https://fleet-vector-api.casey-digennaro.workers.dev";

async function fleetFetch(path: string, options?: RequestInit): Promise<unknown> {
  const url = `${FLEET_API_BASE}${path}`;
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Error(`fleet-vector-api ${res.status}: ${text}`);
  }
  return res.json();
}

const server = new McpServer({
  name: "fleet-mcp-server",
  version: "1.0.0",
});

// ── fleet_search ──────────────────────────────────────────────────────
server.tool(
  "fleet_search",
  "Semantic search across SuperInstance crates. Returns matching crates with names, descriptions, and relevance scores.",
  { query: z.string().describe("Natural language search query"), topK: z.number().optional().describe("Number of results to return (default: 5)") },
  async ({ query, topK }) => {
    const body: Record<string, unknown> = { query };
    if (topK !== undefined) body.topK = topK;
    const data = await fleetFetch("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  },
);

// ── fleet_recommend ───────────────────────────────────────────────────
server.tool(
  "fleet_recommend",
  "Get crate recommendations based on a known crate name. Returns related crates the agent might also need.",
  { crate_name: z.string().describe("Name of a crate to get recommendations for"), topK: z.number().optional().describe("Number of recommendations (default: 5)") },
  async ({ crate_name, topK }) => {
    const body: Record<string, unknown> = { crate_name };
    if (topK !== undefined) body.topK = topK;
    const data = await fleetFetch("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  },
);

// ── fleet_similar ─────────────────────────────────────────────────────
server.tool(
  "fleet_similar",
  "Find crates similar to a given crate by name. Uses vector similarity over crate descriptions.",
  { name: z.string().describe("Exact crate name to find similar crates for") },
  async ({ name }) => {
    const data = await fleetFetch(`/similar?name=${encodeURIComponent(name)}`);
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  },
);

// ── fleet_stats ───────────────────────────────────────────────────────
server.tool(
  "fleet_stats",
  "Get fleet-vector-api index statistics: vector count, embedding dimensions, and last update time.",
  {},
  async () => {
    const data = await fleetFetch("/stats");
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  },
);

// ── Start ─────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // MCP server is now listening on stdin/stdout
}

main().catch((err) => {
  console.error("fleet-mcp-server fatal:", err);
  process.exit(1);
});
