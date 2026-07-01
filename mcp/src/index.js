#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import dns from "node:dns/promises";

const pluginRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const catalogPath = path.join(pluginRoot, "mcp", "registry", "osint-toolkit-catalog.json");
const homeDir = process.env.OSINT_INVESTIGATOR_HOME?.replace("${HOME}", os.homedir()) || path.join(os.homedir(), ".osint-investigator");
const evidencePath = path.join(homeDir, "evidence.jsonl");
const claimsPath = path.join(homeDir, "claims.jsonl");
const publicToolkitSummaryUrl = process.env.OSINT_TOOLKIT_SUMMARY_URL || "";
const publicToolkitRawBase = process.env.OSINT_TOOLKIT_RAW_BASE || "";
const publicToolkitRepoBase = process.env.OSINT_TOOLKIT_REPO_BASE || "";
const publicToolkitPageBase = process.env.OSINT_TOOLKIT_PAGE_BASE || "";

async function readCatalog() {
  const raw = await fs.readFile(catalogPath, "utf8");
  return JSON.parse(raw);
}

async function ensureHome() {
  await fs.mkdir(homeDir, { recursive: true });
}

function text(content) {
  return { content: [{ type: "text", text: typeof content === "string" ? content : JSON.stringify(content, null, 2) }] };
}

function allProviders(catalog) {
  return catalog.categories.flatMap((category) => category.providers.map((provider) => ({ category: category.id, categoryName: category.name, ...provider })));
}

function configuredEnv(name) {
  const value = process.env[name];
  if (!value || value === `\${${name}}`) return null;
  return value;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const body = await res.text();
  let json = null;
  try {
    json = JSON.parse(body);
  } catch {
    json = { raw: body.slice(0, 4000) };
  }
  return { ok: res.ok, status: res.status, url: res.url, headers: Object.fromEntries(res.headers.entries()), body: json };
}

async function fetchText(url, options = {}) {
  const res = await fetch(url, options);
  const body = await res.text();
  return { ok: res.ok, status: res.status, url: res.url, headers: Object.fromEntries(res.headers.entries()), body };
}

async function appendJsonl(file, item) {
  await ensureHome();
  await fs.appendFile(file, `${JSON.stringify(item)}\n`, "utf8");
}

async function readJsonl(file) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return raw.split(/\n+/).filter(Boolean).map((line) => JSON.parse(line));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

function normalizeEvidence(input) {
  const now = new Date().toISOString();
  const evidenceId = input.evidence_id || `EV-${Date.now().toString(36).toUpperCase()}`;
  return {
    evidence_id: evidenceId,
    collected_at: input.collected_at || now,
    source_name: input.source_name || null,
    source_tier: input.source_tier || null,
    original_url: input.original_url || null,
    archive_url: input.archive_url || null,
    source_date: input.source_date || null,
    language: input.language || null,
    summary: input.summary || "",
    entities: input.entities || [],
    claims_supported: input.claims_supported || [],
    claims_contradicted: input.claims_contradicted || [],
    reliability: input.reliability || null,
    credibility: input.credibility || null,
    notes: input.notes || null
  };
}

function extractEntitiesHeuristic(textValue) {
  const textInput = String(textValue || "");
  const urls = [...textInput.matchAll(/https?:\/\/[^\s)]+/g)].map((m) => m[0]);
  const dates = [...textInput.matchAll(/\b(?:19|20)\d{2}-\d{2}-\d{2}\b|\b(?:19|20)\d{2}\b/g)].map((m) => m[0]);
  const capitalized = [...textInput.matchAll(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4}\b/g)]
    .map((m) => m[0])
    .filter((v) => !["The United", "New York", "Associated Press"].includes(v));
  const orgHints = [...textInput.matchAll(/\b[A-Z][A-Za-z&.\- ]+(?:Council|Ministry|Foundation|Force|Corps|Bank|Company|Agency|Committee|Office|Party|University|Group|Network)\b/g)].map((m) => m[0]);
  return {
    urls: [...new Set(urls)],
    dates: [...new Set(dates)],
    people_or_titles: [...new Set(capitalized)].slice(0, 100),
    organizations: [...new Set(orgHints)].slice(0, 100)
  };
}

function joinUrl(base, value) {
  if (!base || !value) return null;
  return `${base.replace(/\/$/, "")}/${value.replace(/^\//, "")}`;
}

function parsePublicToolkitSummary(markdown) {
  return String(markdown || "")
    .split("\n")
    .flatMap((line) => {
      const match = line.match(/\* \[([^\]]+)\]\((tools\/([^/)]+)\/README\.md)\)/);
      if (!match) return [];
      const [, title, relativePath, slug] = match;
      return [{
        title,
        slug,
        path: relativePath,
        raw_url: joinUrl(publicToolkitRawBase, relativePath),
        repo_url: joinUrl(publicToolkitRepoBase, relativePath),
        page_url: joinUrl(publicToolkitPageBase, slug)
      }];
    });
}

function parsePublicToolkitToolMarkdown(markdown, slug) {
  const body = String(markdown || "");
  const title = body.match(/^#\s+(.+)$/m)?.[1] || slug;
  const urlSection = body.match(/## URL\s+([\s\S]*?)(?:\n##\s|\n#\s|$)/);
  const urlText = urlSection?.[1]?.trim() || "";
  const embeddedUrl = urlText.match(/\{% embed url="([^"]+)"/)?.[1];
  const markdownUrl = urlText.match(/\[[^\]]+\]\(([^)]+)\)/)?.[1];
  const plainUrl = urlText.match(/https?:\/\/\S+/)?.[0]?.replace(/[)>.,]+$/, "");
  const toolUrl = embeddedUrl || markdownUrl || plainUrl || null;
  const cost = body.includes("[x] Partially Free")
    ? "Partially Free"
    : body.includes("[x] Free")
      ? "Free"
      : body.includes("[x] Paid")
        ? "Paid"
        : null;
  return {
    title,
    slug,
    url: toolUrl,
    cost,
    summary: body.replace(/^---[\s\S]*?---\s*/, "").slice(0, 3000)
  };
}

const tools = [
  {
    name: "osint_list_tool_catalog",
    description: "List target-agnostic OSINT provider categories and providers modeled from a reproducible open-source investigation toolkit catalog.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Optional category id such as archiving, social_media, geolocation, companies_finance." },
        runnableOnly: { type: "boolean", description: "If true, return only direct/api/local providers." }
      }
    }
  },
  {
    name: "osint_search_tool_catalog",
    description: "Search the OSINT provider catalog by keyword, category, mode, auth, or env var.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: { query: { type: "string" } }
    }
  },
  {
    name: "osint_api_key_status",
    description: "Report which API-key-backed providers have their expected environment variables configured, without exposing secret values.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Optional category id such as social_media, websites, transport, or companies_finance." }
      }
    }
  },
  {
    name: "osint_public_toolkit_index",
    description: "Fetch a configured public OSINT toolkit index and return all tool entries or a filtered subset.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Optional case-insensitive filter over title, slug, and path." },
        limit: { type: "number", default: 200 }
      }
    }
  },
  {
    name: "osint_public_toolkit_search",
    description: "Search a configured public OSINT toolkit. Set deep=true to inspect matched README pages for URL/cost metadata.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string" },
        limit: { type: "number", default: 25 },
        deep: { type: "boolean", default: false }
      }
    }
  },
  {
    name: "osint_public_toolkit_tool",
    description: "Fetch one configured public OSINT toolkit page by slug and parse URL, cost, and page summary.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: {
        slug: { type: "string", description: "Tool slug such as auto-archiver, openstreetmap-search-tool, invid, shodan, or opensanctions." },
        includeContent: { type: "boolean", default: true }
      }
    }
  },
  {
    name: "osint_provider_task",
    description: "Create a structured manual task for a provider that requires browser, account, desktop app, or external workflow access.",
    inputSchema: {
      type: "object",
      required: ["provider_id", "objective"],
      properties: {
        provider_id: { type: "string" },
        objective: { type: "string" },
        inputs: { type: "object" }
      }
    }
  },
  {
    name: "osint_wayback_lookup",
    description: "Query the Wayback CDX API for archived captures of a URL.",
    inputSchema: {
      type: "object",
      required: ["url"],
      properties: {
        url: { type: "string" },
        limit: { type: "number", default: 5 }
      }
    }
  },
  {
    name: "osint_archive_url",
    description: "Attempt to submit a URL to Wayback Save Page Now and return save status or a manual fallback task.",
    inputSchema: {
      type: "object",
      required: ["url"],
      properties: { url: { type: "string" } }
    }
  },
  {
    name: "osint_urlscan_search",
    description: "Search URLScan for passive scans by query, domain, URL, IP, or page title. Uses URLSCAN_API_KEY if set.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string" },
        size: { type: "number", default: 10 }
      }
    }
  },
  {
    name: "osint_opensanctions_search",
    description: "Search OpenSanctions entities. Uses OPENSANCTIONS_API_KEY if set, otherwise attempts public search.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string" },
        limit: { type: "number", default: 10 }
      }
    }
  },
  {
    name: "osint_dns_lookup",
    description: "Resolve DNS records for a hostname using local resolver.",
    inputSchema: {
      type: "object",
      required: ["hostname"],
      properties: {
        hostname: { type: "string" },
        recordTypes: { type: "array", items: { type: "string" }, default: ["A", "AAAA", "MX", "TXT", "NS", "CNAME"] }
      }
    }
  },
  {
    name: "osint_http_probe",
    description: "Fetch headers and basic status for a URL without crawling.",
    inputSchema: {
      type: "object",
      required: ["url"],
      properties: { url: { type: "string" } }
    }
  },
  {
    name: "osint_extract_entities",
    description: "Run lightweight entity extraction over supplied text. This is heuristic and should be reviewed by the agent.",
    inputSchema: {
      type: "object",
      required: ["text"],
      properties: { text: { type: "string" } }
    }
  },
  {
    name: "osint_register_evidence",
    description: "Append an evidence object to the local JSONL evidence ledger.",
    inputSchema: {
      type: "object",
      properties: {
        evidence_id: { type: "string" },
        source_name: { type: "string" },
        source_tier: { type: "string" },
        original_url: { type: "string" },
        archive_url: { type: "string" },
        source_date: { type: "string" },
        language: { type: "string" },
        summary: { type: "string" },
        entities: { type: "array", items: { type: "string" } },
        claims_supported: { type: "array", items: { type: "string" } },
        claims_contradicted: { type: "array", items: { type: "string" } },
        reliability: { type: "string" },
        credibility: { type: "number" },
        notes: { type: "string" }
      }
    }
  },
  {
    name: "osint_compare_claims",
    description: "Compare evidence ledger rows supporting and contradicting a claim id.",
    inputSchema: {
      type: "object",
      required: ["claim_id"],
      properties: { claim_id: { type: "string" } }
    }
  },
  {
    name: "osint_export_graph",
    description: "Export a simple entity co-mention graph from the local evidence ledger.",
    inputSchema: {
      type: "object",
      properties: { format: { type: "string", enum: ["json", "csv"], default: "json" } }
    }
  }
];

const server = new Server({ name: "osint-investigator", version: "0.1.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments || {};
  const catalog = await readCatalog();

  switch (request.params.name) {
    case "osint_list_tool_catalog": {
      let providers = allProviders(catalog);
      if (args.category) providers = providers.filter((p) => p.category === args.category);
      if (args.runnableOnly) providers = providers.filter((p) => ["direct", "api", "local"].includes(p.mode));
      return text({ categories: catalog.categories.map((c) => ({ id: c.id, name: c.name, providerCount: c.providers.length })), providers });
    }
    case "osint_search_tool_catalog": {
      const q = String(args.query || "").toLowerCase();
      const providers = allProviders(catalog).filter((p) => JSON.stringify(p).toLowerCase().includes(q));
      return text({ query: args.query, count: providers.length, providers });
    }
    case "osint_api_key_status": {
      let providers = allProviders(catalog).filter((provider) => Array.isArray(provider.env) && provider.env.length > 0);
      if (args.category) providers = providers.filter((provider) => provider.category === args.category);
      const rows = providers.map((provider) => {
        const env = provider.env.map((name) => ({ name, configured: Boolean(configuredEnv(name)) }));
        return {
          provider_id: provider.id,
          provider_name: provider.name,
          category: provider.category,
          mode: provider.mode,
          auth: provider.auth,
          env,
          ready: env.every((item) => item.configured)
        };
      });
      return text({
        category: args.category || null,
        provider_count: rows.length,
        ready_count: rows.filter((row) => row.ready).length,
        providers: rows
      });
    }
    case "osint_public_toolkit_index": {
      if (!publicToolkitSummaryUrl) {
        return text({
          error: "OSINT_TOOLKIT_SUMMARY_URL is not configured.",
          expected_env: ["OSINT_TOOLKIT_SUMMARY_URL", "OSINT_TOOLKIT_RAW_BASE", "OSINT_TOOLKIT_REPO_BASE", "OSINT_TOOLKIT_PAGE_BASE"]
        });
      }
      const limit = Number(args.limit || 200);
      const result = await fetchText(publicToolkitSummaryUrl);
      let entries = parsePublicToolkitSummary(result.body);
      if (args.query) {
        const q = String(args.query).toLowerCase();
        entries = entries.filter((entry) => JSON.stringify(entry).toLowerCase().includes(q));
      }
      return text({
        source: "configured public toolkit summary",
        source_url: publicToolkitSummaryUrl,
        status: result.status,
        total: entries.length,
        entries: entries.slice(0, limit)
      });
    }
    case "osint_public_toolkit_search": {
      if (!publicToolkitSummaryUrl) {
        return text({
          error: "OSINT_TOOLKIT_SUMMARY_URL is not configured.",
          expected_env: ["OSINT_TOOLKIT_SUMMARY_URL", "OSINT_TOOLKIT_RAW_BASE", "OSINT_TOOLKIT_REPO_BASE", "OSINT_TOOLKIT_PAGE_BASE"]
        });
      }
      const limit = Number(args.limit || 25);
      const q = String(args.query || "").toLowerCase();
      const summary = await fetchText(publicToolkitSummaryUrl);
      const indexEntries = parsePublicToolkitSummary(summary.body);
      let matches = indexEntries.filter((entry) => JSON.stringify(entry).toLowerCase().includes(q));
      if (args.deep) {
        if (!publicToolkitRawBase) {
          return text({
            error: "Deep search requires OSINT_TOOLKIT_RAW_BASE.",
            expected_env: ["OSINT_TOOLKIT_RAW_BASE"]
          });
        }
        const deepMatches = [];
        for (const entry of indexEntries) {
          if (deepMatches.length >= limit) break;
          const page = await fetchText(entry.raw_url);
          const parsed = parsePublicToolkitToolMarkdown(page.body, entry.slug);
          const searchable = JSON.stringify({ ...entry, ...parsed }).toLowerCase();
          if (searchable.includes(q)) deepMatches.push({ ...entry, ...parsed, status: page.status });
        }
        matches = deepMatches;
      }
      return text({
        query: args.query,
        source_url: publicToolkitSummaryUrl,
        deep: Boolean(args.deep),
        total: matches.length,
        entries: matches.slice(0, limit)
      });
    }
    case "osint_public_toolkit_tool": {
      if (!publicToolkitRawBase) {
        return text({
          error: "OSINT_TOOLKIT_RAW_BASE is not configured.",
          expected_env: ["OSINT_TOOLKIT_RAW_BASE"]
        });
      }
      const slug = String(args.slug || "").trim();
      const relativePath = `tools/${slug}/README.md`;
      const rawUrl = joinUrl(publicToolkitRawBase, relativePath);
      const result = await fetchText(rawUrl);
      const parsed = parsePublicToolkitToolMarkdown(result.body, slug);
      if (args.includeContent === false) delete parsed.summary;
      return text({
        ...parsed,
        raw_url: rawUrl,
        repo_url: joinUrl(publicToolkitRepoBase, relativePath),
        page_url: joinUrl(publicToolkitPageBase, slug),
        status: result.status
      });
    }
    case "osint_provider_task": {
      const provider = allProviders(catalog).find((p) => p.id === args.provider_id);
      if (!provider) return text({ error: `Unknown provider_id: ${args.provider_id}` });
      return text({
        provider,
        objective: args.objective,
        inputs: args.inputs || {},
        status: "manual_or_external_workflow_required",
        checklist: [
          "Open the provider in a controlled browser/session.",
          "Record query terms, filters, account/API key used, and timestamp.",
          "Archive or screenshot result pages where policy allows.",
          "Register each useful result as evidence with original and archive URLs.",
          "Do not treat provider snippets as final evidence without source-level verification."
        ]
      });
    }
    case "osint_wayback_lookup": {
      const limit = Number(args.limit || 5);
      const endpoint = new URL("https://web.archive.org/cdx");
      endpoint.searchParams.set("url", args.url);
      endpoint.searchParams.set("output", "json");
      endpoint.searchParams.set("fl", "timestamp,original,statuscode,mimetype,digest");
      endpoint.searchParams.set("filter", "statuscode:200");
      endpoint.searchParams.set("collapse", "digest");
      endpoint.searchParams.set("limit", String(limit));
      const result = await fetchJson(endpoint.toString());
      const rows = Array.isArray(result.body) ? result.body : [];
      const captures = rows.slice(1).map((row) => ({
        timestamp: row[0],
        original: row[1],
        statuscode: row[2],
        mimetype: row[3],
        digest: row[4],
        archive_url: `https://web.archive.org/web/${row[0]}/${row[1]}`
      }));
      return text({ url: args.url, captures, raw_status: result.status });
    }
    case "osint_archive_url": {
      const saveUrl = `https://web.archive.org/save/${args.url}`;
      const res = await fetch(saveUrl, { method: "GET", redirect: "manual" });
      return text({
        original_url: args.url,
        status: res.status,
        location: res.headers.get("location"),
        content_location: res.headers.get("content-location"),
        fallback: "If no archive URL is returned, use archive.today/Hunchly/Auto Archiver and register the capture manually."
      });
    }
    case "osint_urlscan_search": {
      const endpoint = new URL("https://urlscan.io/api/v1/search/");
      endpoint.searchParams.set("q", args.query);
      endpoint.searchParams.set("size", String(args.size || 10));
      const headers = {};
      const apiKey = configuredEnv("URLSCAN_API_KEY");
      if (apiKey) headers["API-Key"] = apiKey;
      const result = await fetchJson(endpoint.toString(), { headers });
      return text(result.body);
    }
    case "osint_opensanctions_search": {
      const endpoint = new URL("https://api.opensanctions.org/search/default");
      endpoint.searchParams.set("q", args.query);
      endpoint.searchParams.set("limit", String(args.limit || 10));
      const headers = {};
      const apiKey = configuredEnv("OPENSANCTIONS_API_KEY");
      if (apiKey) headers.Authorization = `ApiKey ${apiKey}`;
      const result = await fetchJson(endpoint.toString(), { headers });
      return text(result.body);
    }
    case "osint_dns_lookup": {
      const recordTypes = args.recordTypes || ["A", "AAAA", "MX", "TXT", "NS", "CNAME"];
      const records = {};
      for (const type of recordTypes) {
        try {
          records[type] = await dns.resolve(args.hostname, type);
        } catch (err) {
          records[type] = { error: err.code || err.message };
        }
      }
      return text({ hostname: args.hostname, records });
    }
    case "osint_http_probe": {
      const res = await fetch(args.url, { method: "HEAD", redirect: "follow" });
      return text({ url: args.url, final_url: res.url, status: res.status, headers: Object.fromEntries(res.headers.entries()) });
    }
    case "osint_extract_entities": {
      return text(extractEntitiesHeuristic(args.text));
    }
    case "osint_register_evidence": {
      const evidence = normalizeEvidence(args);
      await appendJsonl(evidencePath, evidence);
      return text({ stored_at: evidencePath, evidence });
    }
    case "osint_compare_claims": {
      const rows = await readJsonl(evidencePath);
      const supports = rows.filter((row) => (row.claims_supported || []).includes(args.claim_id));
      const contradicts = rows.filter((row) => (row.claims_contradicted || []).includes(args.claim_id));
      return text({ claim_id: args.claim_id, supports, contradicts, evidence_count: rows.length });
    }
    case "osint_export_graph": {
      const rows = await readJsonl(evidencePath);
      const nodes = new Map();
      const edges = new Map();
      for (const row of rows) {
        for (const ent of row.entities || []) nodes.set(ent, { id: ent, evidence: [...new Set([...(nodes.get(ent)?.evidence || []), row.evidence_id])] });
        const ents = row.entities || [];
        for (let i = 0; i < ents.length; i += 1) {
          for (let j = i + 1; j < ents.length; j += 1) {
            const key = [ents[i], ents[j]].sort().join("::");
            const prev = edges.get(key) || { source: ents[i], target: ents[j], evidence: [] };
            prev.evidence = [...new Set([...prev.evidence, row.evidence_id])];
            edges.set(key, prev);
          }
        }
      }
      const graph = { nodes: [...nodes.values()], edges: [...edges.values()] };
      if (args.format === "csv") {
        const nodeCsv = ["id,evidence", ...graph.nodes.map((n) => `${JSON.stringify(n.id)},${JSON.stringify(n.evidence.join(";"))}`)].join("\n");
        const edgeCsv = ["source,target,evidence", ...graph.edges.map((e) => `${JSON.stringify(e.source)},${JSON.stringify(e.target)},${JSON.stringify(e.evidence.join(";"))}`)].join("\n");
        return text({ nodes_csv: nodeCsv, edges_csv: edgeCsv });
      }
      return text(graph);
    }
    default:
      return text({ error: `Unknown tool: ${request.params.name}` });
  }
});

await server.connect(new StdioServerTransport());
