---
name: social-media-tracing
description: Trace social-media and messaging-platform rumors, first appearances, repost networks, account provenance, and source cascades. Use for Telegram, X, YouTube, TikTok, Instagram, Facebook, or other social claims in OSINT work.
---

# Social Media Tracing

Treat social media as lead generation unless the original post, account provenance, and media can be verified.

## Workflow

1. Identify the earliest visible post, not the loudest repost.
2. Capture post URL, account URL, timestamp, text, media, edit status, and thread context.
3. Use catalog providers for Telegram, X, YouTube, and other platforms.
4. Record whether claims cite another source or are original.
5. Collapse repost chains into one source path.
6. Register original posts and strongest corroboration separately.

## MCP Calls

- `osint_search_tool_catalog`
- `osint_provider_task`
- `osint_archive_url`
- `osint_register_evidence`
- `osint_compare_claims`

