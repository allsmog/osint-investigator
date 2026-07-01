# OSINT Investigator

OSINT Investigator is a target-agnostic open-source intelligence plugin and MCP server for reproducible investigations. It helps researchers collect sources, preserve evidence, track claims, map entities, compare contradictions, and export lightweight relationship graphs.

Keywords: OSINT, open-source intelligence, MCP, Model Context Protocol, investigation workflow, evidence ledger, source verification, archiving, geolocation, social media analysis, sanctions research, entity extraction, network analysis, intelligence analysis.

## Features

- MCP server with tools for source discovery, archiving, DNS/HTTP checks, entity extraction, evidence registration, claim comparison, and graph export.
- Configurable provider catalog covering archiving, social media, image/video verification, geolocation, maps, websites, companies, finance, people, transport, conflict, environment, and data analysis.
- API-key readiness checks that show which providers are configured without exposing secrets.
- Optional public toolkit index support through neutral `OSINT_TOOLKIT_*` environment variables.
- Reproducible evidence ledger stored as local JSONL.
- Investigation skills for triage, preservation, proof-of-life checks, visual verification, social tracing, geolocation, sanctions/finance mapping, contradiction review, and report writing.
- Subagent briefs for source hunting, archive verification, social media analysis, visual forensics, geolocation, sanctions/finance analysis, contradiction review, and report editing.

## MCP Tools

The MCP server exposes:

- `osint_list_tool_catalog`
- `osint_search_tool_catalog`
- `osint_api_key_status`
- `osint_public_toolkit_index`
- `osint_public_toolkit_search`
- `osint_public_toolkit_tool`
- `osint_provider_task`
- `osint_wayback_lookup`
- `osint_archive_url`
- `osint_urlscan_search`
- `osint_opensanctions_search`
- `osint_dns_lookup`
- `osint_http_probe`
- `osint_extract_entities`
- `osint_register_evidence`
- `osint_compare_claims`
- `osint_export_graph`

## Installation

Install MCP dependencies:

```bash
cd mcp
npm install
```

The plugin manifest is at `.codex-plugin/plugin.json`, and the MCP server config is at `.mcp.json`.

## Testing

Run the MCP syntax check and local smoke test:

```bash
cd mcp
npm test
```

The smoke test starts the MCP server in a temporary evidence directory and checks tool discovery, catalog routing, API-key status, public toolkit fallback behavior, entity extraction, evidence registration, claim comparison, and graph export.

## Configuration

Evidence is stored under:

```bash
~/.osint-investigator/evidence.jsonl
~/.osint-investigator/claims.jsonl
```

Provider API keys are optional. Use `assets/config/api_keys.example.env` as the reference for supported variables.

Optional public toolkit index variables:

```bash
OSINT_TOOLKIT_SUMMARY_URL=
OSINT_TOOLKIT_RAW_BASE=
OSINT_TOOLKIT_REPO_BASE=
OSINT_TOOLKIT_PAGE_BASE=
```

## Example Workflows

Start an evidence ledger:

1. Convert the question into testable claims.
2. Search the provider catalog.
3. Archive sources before relying on them.
4. Register evidence with original URL, archive URL, source date, collection date, entities, and claim links.
5. Compare support and contradiction rows.
6. Export an entity graph for review.

Run local summaries:

```bash
python3 scripts/catalog_summary.py
python3 scripts/validate_evidence.py ~/.osint-investigator/evidence.jsonl
python3 scripts/export_graph.py ~/.osint-investigator/evidence.jsonl graph.json
```

## Project Structure

```text
.codex-plugin/      Plugin manifest
mcp/                MCP server, package metadata, and provider registry
skills/             Investigation workflow skills
subagents/          Specialist analyst briefs
assets/             Schemas, templates, source sets, and config examples
scripts/            Local validation and graph export utilities
```

## Intended Use

This project is designed for lawful, ethical, open-source research. Treat search results and social media posts as leads until the underlying source is verified. Preserve source context, record uncertainty, and separate direct evidence from analytical inference.
