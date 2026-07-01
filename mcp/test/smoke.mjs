import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mcpRoot = path.resolve(testDir, "..");
const pluginRoot = path.resolve(mcpRoot, "..");
const serverPath = path.join(mcpRoot, "src/index.js");
const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "osint-investigator-smoke-"));

const env = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== undefined)
);
env.OSINT_INVESTIGATOR_HOME = tempHome;
env.OSINT_TOOLKIT_SUMMARY_URL = "";
env.OSINT_TOOLKIT_RAW_BASE = "";
env.OSINT_TOOLKIT_REPO_BASE = "";
env.OSINT_TOOLKIT_PAGE_BASE = "";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  cwd: pluginRoot,
  env
});

const client = new Client({ name: "osint-investigator-smoke", version: "0.0.1" });

function parseToolResult(result) {
  assert.equal(result.content?.[0]?.type, "text");
  return JSON.parse(result.content[0].text);
}

async function callTool(name, args = {}) {
  return parseToolResult(await client.callTool({ name, arguments: args }));
}

try {
  await client.connect(transport);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name).sort();
  assert.equal(toolNames.length, 17);
  for (const expected of [
    "osint_api_key_status",
    "osint_compare_claims",
    "osint_export_graph",
    "osint_list_tool_catalog",
    "osint_public_toolkit_search",
    "osint_register_evidence"
  ]) {
    assert.ok(toolNames.includes(expected), `missing MCP tool: ${expected}`);
  }

  const catalog = await callTool("osint_list_tool_catalog", { category: "websites" });
  assert.ok(catalog.categories.length >= 10);
  assert.equal(catalog.providers.length, 7);
  assert.ok(catalog.providers.some((provider) => provider.id === "urlscan"));

  const search = await callTool("osint_search_tool_catalog", { query: "opensanctions" });
  assert.ok(search.count >= 1);

  const apiStatus = await callTool("osint_api_key_status", { category: "websites" });
  assert.equal(apiStatus.provider_count, 4);
  assert.ok(apiStatus.providers.every((provider) => provider.env.every((item) => typeof item.configured === "boolean")));
  assert.ok(apiStatus.providers.every((provider) => provider.env.every((item) => !("value" in item))));

  const publicToolkit = await callTool("osint_public_toolkit_search", { query: "archive" });
  assert.match(publicToolkit.error, /OSINT_TOOLKIT_SUMMARY_URL/);

  const entityExtraction = await callTool("osint_extract_entities", {
    text: "Alice Example met Example Research Group on 2026-01-02. See https://example.org/report."
  });
  assert.ok(entityExtraction.urls.includes("https://example.org/report."));
  assert.ok(entityExtraction.dates.includes("2026-01-02"));

  await callTool("osint_register_evidence", {
    evidence_id: "EV-SMOKE-001",
    source_name: "Smoke Source One",
    source_tier: "primary",
    original_url: "https://example.org/source-one",
    archive_url: "https://web.archive.org/web/example",
    source_date: "2026-01-02",
    summary: "Smoke-test evidence supporting a claim.",
    entities: ["Alice Example", "Example Research Group"],
    claims_supported: ["CL-SMOKE-001"],
    reliability: "A",
    credibility: 4
  });

  await callTool("osint_register_evidence", {
    evidence_id: "EV-SMOKE-002",
    source_name: "Smoke Source Two",
    source_tier: "independent",
    original_url: "https://example.org/source-two",
    source_date: "2026-01-03",
    summary: "Smoke-test evidence contradicting a claim.",
    entities: ["Alice Example", "Contradictory Source"],
    claims_contradicted: ["CL-SMOKE-001"],
    reliability: "B",
    credibility: 3
  });

  const comparison = await callTool("osint_compare_claims", { claim_id: "CL-SMOKE-001" });
  assert.equal(comparison.evidence_count, 2);
  assert.equal(comparison.supports.length, 1);
  assert.equal(comparison.contradicts.length, 1);

  const graph = await callTool("osint_export_graph", { format: "json" });
  assert.equal(graph.nodes.length, 3);
  assert.equal(graph.edges.length, 2);

  const graphCsv = await callTool("osint_export_graph", { format: "csv" });
  assert.match(graphCsv.nodes_csv, /^id,evidence/);
  assert.match(graphCsv.edges_csv, /^source,target,evidence/);

  const providerTask = await callTool("osint_provider_task", {
    provider_id: "archive_today",
    objective: "Capture a page that cannot be saved automatically.",
    inputs: { url: "https://example.org" }
  });
  assert.equal(providerTask.status, "manual_or_external_workflow_required");
} finally {
  await client.close();
  await fs.rm(tempHome, { recursive: true, force: true });
}

console.log("MCP smoke test passed");
