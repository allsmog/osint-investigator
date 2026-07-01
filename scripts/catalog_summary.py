#!/usr/bin/env python3
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "mcp" / "registry" / "osint-toolkit-catalog.json"


def main() -> int:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    for category in catalog["categories"]:
        providers = category["providers"]
        direct = [p for p in providers if p.get("mode") in {"direct", "api", "local"}]
        print(f"{category['id']}: {len(providers)} providers ({len(direct)} direct/api/local)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
