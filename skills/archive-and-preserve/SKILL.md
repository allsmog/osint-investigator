---
name: archive-and-preserve
description: Preserve web, social, image, video, and document evidence in an OSINT investigation. Use when URLs, posts, pages, media, or search results need archiving, hashing, screenshots, Wayback/archive.today/Hunchly/Auto Archiver handling, or an audit trail.
---

# Archive And Preserve

Prioritize reproducibility. Archive before analysis where possible.

## Workflow

1. Check existing captures with `osint_wayback_lookup`.
2. Attempt capture with `osint_archive_url`.
3. If no archive URL is returned, create a manual provider task for archive.today, Hunchly, or Auto Archiver with `osint_provider_task`.
4. Register the capture as evidence.
5. Flag pages that block archives or require browser capture.

## Capture Standards

- Record original URL and final redirected URL.
- Record archive URL or manual-capture path.
- Record timestamp and source date separately.
- For video/image evidence, preserve original media when legal and safe.
- For social media, capture post URL, account URL, timestamp, media attachments, and surrounding thread/context.

## MCP Calls

- `osint_wayback_lookup`
- `osint_archive_url`
- `osint_provider_task`
- `osint_http_probe`
- `osint_register_evidence`
