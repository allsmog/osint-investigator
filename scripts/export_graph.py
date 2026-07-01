#!/usr/bin/env python3
import csv
import json
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 4:
        print("usage: export_graph.py <evidence.jsonl> <nodes.csv> <edges.csv>", file=sys.stderr)
        return 2
    evidence_path, nodes_path, edges_path = map(Path, sys.argv[1:])
    nodes = {}
    edges = {}
    for line in evidence_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        ents = row.get("entities") or []
        for ent in ents:
            nodes.setdefault(ent, set()).add(row.get("evidence_id", ""))
        for i, source in enumerate(ents):
            for target in ents[i + 1:]:
                key = tuple(sorted((source, target)))
                edges.setdefault(key, set()).add(row.get("evidence_id", ""))
    with nodes_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "evidence"])
        for node, ev in sorted(nodes.items()):
            writer.writerow([node, ";".join(sorted(ev))])
    with edges_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["source", "target", "evidence"])
        for (source, target), ev in sorted(edges.items()):
            writer.writerow([source, target, ";".join(sorted(ev))])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
