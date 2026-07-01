#!/usr/bin/env python3
import json
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate_evidence.py <evidence.jsonl>", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    errors = 0
    for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError as exc:
            print(f"{path}:{i}: invalid json: {exc}")
            errors += 1
            continue
        if not row.get("summary"):
            print(f"{path}:{i}: missing summary")
            errors += 1
    print(f"checked {path}, errors={errors}")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
