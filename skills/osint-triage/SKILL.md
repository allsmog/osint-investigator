---
name: osint-triage
description: Start or continue a target-agnostic OSINT investigation by defining claims, source tiers, evidence requirements, archive needs, and collection priorities. Use when the user asks to investigate a person, organization, event, conflict, location, company, network, or disputed claim using open sources.
---

# OSINT Triage

Use the OSINT Investigator MCP tools as the evidence backbone.

## Workflow

1. Convert the user question into testable claims.
2. Create a source plan with primary, official, independent, social, and analytical sources.
3. Call `osint_public_toolkit_search` for a configured public toolkit, then `osint_list_tool_catalog` for providers this MCP can route or run.
4. Select providers by evidence need, access model, API-key availability, and reproducibility.
5. Archive or queue every source before relying on it.
6. Register evidence with `osint_register_evidence`.
7. Keep findings separate from hypotheses.
8. Export graph/timeline only after claims have evidence rows.

## Evidence Rules

- Treat snippets and search results as leads, not evidence.
- Treat written statements as publication evidence, not proof that a person personally acted.
- Record original URL, archive URL, source date, collection date, language, entities, and claims affected.
- Mark source reliability separately from claim confidence.

## MCP Calls

- `osint_search_tool_catalog`
- `osint_api_key_status`
- `osint_public_toolkit_index`
- `osint_public_toolkit_search`
- `osint_public_toolkit_tool`
- `osint_wayback_lookup`
- `osint_archive_url`
- `osint_register_evidence`
- `osint_extract_entities`
- `osint_compare_claims`
- `osint_export_graph`
