---
name: visual-verification
description: Verify OSINT images or videos for recency, reuse, manipulation, source provenance, metadata, keyframes, and geolocation readiness. Use for alleged proof-of-life media, conflict footage, official meeting images, incident videos, or disputed screenshots.
---

# Visual Verification

Do not analyze a visual claim without preserving the original media or best available source page.

## Workflow

1. Archive the source page and media.
2. Create tasks for InVID/WeVerify, reverse-image search, metadata tools, and forensic tools.
3. Extract visible claims: people, location clues, weather, shadows, signs, uniforms, vehicles, logos, text.
4. Test whether media is old, edited, staged, or miscaptioned.
5. If location clues exist, hand off to the geolocation workflow.
6. Register each verification result as evidence.

## MCP Calls

- `osint_provider_task`
- `osint_archive_url`
- `osint_extract_entities`
- `osint_register_evidence`

