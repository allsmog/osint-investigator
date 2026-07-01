---
name: contradiction-review
description: Review conflicting OSINT claims, separate evidence from inference, identify source circularity, compare support and contradiction rows, and produce confidence judgments with caveats.
---

# Contradiction Review

The goal is not to force consensus. The goal is to state what is known, probable, disputed, and unverified.

## Workflow

1. Pick one claim at a time.
2. Call `osint_compare_claims`.
3. Group evidence by original source, not by repost count.
4. Identify circular sourcing and snippet-only claims.
5. Grade the claim as supported, probable, unresolved, contradicted, or false.
6. State what evidence would change the assessment.

## MCP Calls

- `osint_compare_claims`
- `osint_register_evidence`
- `osint_export_graph`

