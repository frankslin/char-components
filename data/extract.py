#!/usr/bin/env python3
"""Extract dt/rt/vt from 部件檢索.htm into standalone data files.

Phase 1 of the refactor plan (see AGENTS.md / doc/05-重構計畫.md): pull the
three data tables out of the single-line minified <script> so they can be
git-diffed sensibly, without touching the core algorithm or UI yet.

Usage:
    python3 data/extract.py

Regenerates:
    data/dt.jsonl   -- one JSON string per line; line N (0-indexed) == dt[N]
    data/rt.jsonl   -- one JSON string per line; line N (0-indexed) == rt[N]
    data/vt.json    -- single JSON object, insertion order preserved
    data/kt.json    -- single JSON array, insertion order preserved (component keypad categories)

See data/README.md for what these tables mean and known caveats.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTM_PATH = ROOT / "legacy" / "部件檢索.htm"
OUT_DIR = Path(__file__).resolve().parent


def extract_literal(text, var_name):
    marker = f"var {var_name}="
    i = text.find(marker)
    if i < 0:
        raise SystemExit(f"could not find `{marker}` in {HTM_PATH}")
    start = i + len(marker)
    decoder = json.JSONDecoder()
    value, end = decoder.raw_decode(text, start)
    tail = text[end:end + 1]
    if tail != ";":
        raise SystemExit(
            f"unexpected character after {var_name} literal: {tail!r} "
            "(expected ';' -- the source format may have changed)"
        )
    return value


def main():
    html = HTM_PATH.read_text(encoding="utf-8-sig")
    marker = "客製化修改區結束"
    idx = html.find(marker)
    if idx < 0:
        raise SystemExit(f"could not find marker {marker!r} in {HTM_PATH}")
    script_start = html.find("<script", idx)
    script_end = html.find("</script>", script_start)
    core_script = html[script_start:script_end]

    dt = extract_literal(core_script, "dt")
    rt = extract_literal(core_script, "rt")
    vt = extract_literal(core_script, "vt")
    # kt (component keypad categories) lives in the UI/customization region,
    # not the core script blob above -- search the whole file for it.
    kt = extract_literal(html, "kt")

    if len(dt) != len(rt):
        raise SystemExit(f"dt ({len(dt)}) and rt ({len(rt)}) length mismatch")

    dt_path = OUT_DIR / "dt.jsonl"
    with dt_path.open("w", encoding="utf-8") as f:
        for entry in dt:
            f.write(json.dumps(entry, ensure_ascii=False))
            f.write("\n")

    rt_path = OUT_DIR / "rt.jsonl"
    with rt_path.open("w", encoding="utf-8") as f:
        for entry in rt:
            f.write(json.dumps(entry, ensure_ascii=False))
            f.write("\n")

    vt_path = OUT_DIR / "vt.json"
    vt_path.write_text(
        json.dumps(vt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    kt_path = OUT_DIR / "kt.json"
    kt_path.write_text(
        json.dumps(kt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"dt: {len(dt)} entries -> {dt_path}", file=sys.stderr)
    print(f"rt: {len(rt)} entries -> {rt_path}", file=sys.stderr)
    print(f"vt: {len(vt)} entries -> {vt_path}", file=sys.stderr)
    print(f"kt: {len(kt)} entries -> {kt_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
