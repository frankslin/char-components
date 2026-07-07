#!/usr/bin/env python3
"""Slice deps/fonts/FSung-*.ttf into 256-codepoint WOFF2 chunks + CSS.

Follows the jigmo-webfonts / free-fonts woff2-slicing convention:
  - chunk size 0x100 codepoints
  - one @font-face per chunk, unicode-range scoped
  - filenames: WFGFSung-<weight>-<chunk_start:06x>.woff2

Source files (deps/fonts/):
  FSung-2, FSung-m, FSung-3, FSung-F, FSung-X, FSung-1
FSung-p is intentionally excluded: its cmap is an exact duplicate of
FSung-m (see doc/04, section 5) and it is not referenced by the
original 部件檢索.htm CSS font-family stack.

Priority order below mirrors the original CSS font-family fallback
order (font-family: ... FSung-2, FSung-m, FSung-3, FSung-F, FSung-X,
FSung-1 ...), used only to break ties for the handful of shared ASCII
codepoints every shard happens to carry.
"""
import io
import logging
import sys
from collections import defaultdict
from pathlib import Path

from fontTools import subset as ft_subset
from fontTools.ttLib import TTFont

logging.getLogger("fontTools").setLevel(logging.ERROR)

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "deps" / "fonts"
OUT_DIR = Path(__file__).resolve().parent / "wfg-fsung"
FONTS_DIR = OUT_DIR / "fonts"
CSS_PATH = OUT_DIR / "wfg-fsung.css"

PRIORITY = ["FSung-2", "FSung-m", "FSung-3", "FSung-F", "FSung-X", "FSung-1"]
CHUNK_SIZE = 0x100
WEIGHT = 400
PREFIX = "WFGFSung"
FAMILY = "WFG FSung"


def load_cmaps():
    cmaps = {}
    blobs = {}
    for name in PRIORITY:
        path = SRC_DIR / f"{name}.ttf"
        data = path.read_bytes()
        blobs[name] = data
        tt = TTFont(io.BytesIO(data), lazy=True, fontNumber=0)
        cmaps[name] = set(tt.getBestCmap().keys())
        print(f"  loaded {name}: {len(cmaps[name])} codepoints", file=sys.stderr)
    return cmaps, blobs


def assign_chunks(cmaps):
    """Return {(chunk_start, owner_font): set(codepoints)}."""
    per_chunk = defaultdict(lambda: defaultdict(set))
    for font in PRIORITY:
        for cp in cmaps[font]:
            chunk_start = (cp // CHUNK_SIZE) * CHUNK_SIZE
            per_chunk[chunk_start][font].add(cp)

    assignment = {}
    unresolved = []
    for chunk_start, owners in per_chunk.items():
        if len(owners) == 1:
            (font, cps), = owners.items()
            assignment[(chunk_start, font)] = cps
            continue
        union = set()
        for cps in owners.values():
            union |= cps
        superset_owner = next(
            (font for font, cps in owners.items() if cps == union), None
        )
        if superset_owner:
            assignment[(chunk_start, superset_owner)] = union
        else:
            unresolved.append((chunk_start, {f: len(c) for f, c in owners.items()}))

    if unresolved:
        print("WARNING: chunks needing a real cross-source merge (unhandled):", file=sys.stderr)
        for chunk_start, sizes in unresolved:
            print(f"  chunk {chunk_start:#08x}: {sizes}", file=sys.stderr)
        raise SystemExit(
            "Refusing to silently drop codepoints; extend the script to merge these chunks."
        )
    return assignment


def subset_chunk(blob, codepoints):
    font = TTFont(io.BytesIO(blob))
    options = ft_subset.Options()
    options.flavor = "woff2"
    options.layout_features = []
    options.name_IDs = [1, 2, 4, 6]
    options.drop_tables += ["DSIG", "GDEF", "GPOS", "GSUB"]
    options.desubroutinize = False
    subsetter = ft_subset.Subsetter(options=options)
    subsetter.populate(unicodes=sorted(codepoints))
    subsetter.subset(font)
    buf = io.BytesIO()
    font.save(buf)
    return buf.getvalue()


def main():
    FONTS_DIR.mkdir(parents=True, exist_ok=True)
    print("Loading source fonts...", file=sys.stderr)
    cmaps, blobs = load_cmaps()

    print("Assigning chunks...", file=sys.stderr)
    assignment = assign_chunks(cmaps)
    print(f"  {len(assignment)} chunks total", file=sys.stderr)

    css_rules = []
    items = sorted(assignment.items(), key=lambda kv: kv[0][0])
    for i, ((chunk_start, font), cps) in enumerate(items, 1):
        filename = f"{PREFIX}-{WEIGHT}-{chunk_start:06x}.woff2"
        out_path = FONTS_DIR / filename
        data = subset_chunk(blobs[font], cps)
        out_path.write_bytes(data)

        lo = chunk_start
        hi = chunk_start + CHUNK_SIZE - 1
        css_rules.append(
            "@font-face {\n"
            f"  font-family: '{FAMILY}';\n"
            "  font-style: normal;\n"
            f"  font-weight: {WEIGHT};\n"
            "  font-display: swap;\n"
            f"  src: url('fonts/{filename}') format('woff2');\n"
            f"  unicode-range: U+{lo:04X}-{hi:04X};\n"
            "}"
        )
        if i % 50 == 0 or i == len(items):
            print(f"  {i}/{len(items)} chunks built ({filename}, {len(data)} bytes)", file=sys.stderr)

    header = (
        "/* WFG FSung Webfonts\n"
        " * Source: 全宋體 by WFG, https://fgwang.blogspot.com/2025/09/unicode-17.html\n"
        " * Non-commercial use only -- see LICENSE.\n"
        " * Generated CSS; do not edit manually.\n"
        f" * Chunk size: {CHUNK_SIZE} codepoints.\n"
        " */\n\n"
    )
    CSS_PATH.write_text(header + "\n\n".join(css_rules) + "\n", encoding="utf-8")
    print(f"Wrote {CSS_PATH} ({len(css_rules)} rules)", file=sys.stderr)


if __name__ == "__main__":
    main()
