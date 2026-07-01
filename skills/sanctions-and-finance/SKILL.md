---
name: sanctions-and-finance
description: Map companies, sanctions records, beneficial ownership leads, aliases, financial nodes, procurement networks, politically exposed persons, crypto addresses, and linked entities in an OSINT investigation.
---

# Sanctions And Finance

Use structured sources for names, aliases, dates, entity links, addresses, programs, and identifiers. Treat sanctions narratives as attributed claims unless independently corroborated.

## Workflow

1. Query OpenSanctions and other companies/finance providers.
2. Normalize aliases and identifiers.
3. Separate person, company, vessel, aircraft, bank, government body, and legal instrument nodes.
4. Register each sanctions or registry record as evidence.
5. Build edges for owns, controls, directs, sanctioned_with, address_match, officer_of, and alias_of.
6. Export graph for review.

## MCP Calls

- `osint_opensanctions_search`
- `osint_search_tool_catalog`
- `osint_provider_task`
- `osint_register_evidence`
- `osint_export_graph`

