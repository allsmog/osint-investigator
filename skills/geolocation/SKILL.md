---
name: geolocation
description: Geolocate or assess geolocation readiness for images, videos, facilities, routes, conflict footage, proof-of-life scenes, transport sightings, or environmental observations using maps, OSM, Search Grid, satellite imagery, shadows, and visual clues.
---

# Geolocation

Only geolocate when there is a concrete visual target or facility to test.

## Workflow

1. Extract visible clues from the media or source.
2. Build a candidate-location list.
3. Use OSM Search, Overpass, Search Grid, Google Earth, Sentinel/EO Browser, Mapillary, and SunCalc tasks as needed.
4. Separate visual match, temporal match, and source claim.
5. Record excluded candidates when they materially improve confidence.
6. Register final location assessment with confidence and caveats.

## MCP Calls

- `osint_search_tool_catalog`
- `osint_provider_task`
- `osint_extract_entities`
- `osint_register_evidence`

