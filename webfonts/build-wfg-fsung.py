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
import shutil
import sys
from collections import defaultdict
from multiprocessing import Pool, cpu_count
from pathlib import Path

from fontTools import subset as ft_subset
from fontTools.ttLib import TTFont

logging.getLogger("fontTools").setLevel(logging.ERROR)

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "deps" / "fonts"
OUT_DIR = Path(__file__).resolve().parent / "wfg-fsung"
FONTS_DIR = OUT_DIR / "fonts"
# web/ 需要能不依賴任何外部服務獨立部署，字型不能只放在這裡(這份是給
# wfg-fsung-webfonts npm 套件用的)，所以额外 vendor 一份到 web/webfonts/
# 底下，供 web/style.css 用相對路徑載入。兩份必須是同一次 build 的產物，
# 不可分別手動更新到不同版本，見 main() 結尾的 sync_vendor_copy()。
VENDOR_DIR = ROOT / "web" / "webfonts" / "wfg-fsung"
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
    # options.flavor 只是 Subsetter 的設定欄位，唯有 ft_subset 自己的 CLI 路徑
    # (save_font()) 會把它套到 TTFont 上；這裡是直接呼叫 font.save()，所以必須
    # 自己指定 flavor，否則存出來的是「副檔名叫 .woff2 的裸 TTF」——瀏覽器靠
    # magic bytes 嗅探仍能顯示，不會報錯，但體積會是真 woff2 的兩倍多。
    font.flavor = "woff2"
    buf = io.BytesIO()
    font.save(buf)
    data = buf.getvalue()
    if data[:4] != b"wOF2":
        raise SystemExit(
            f"Expected WOFF2 output, got magic {data[:4]!r} -- font.flavor was not applied."
        )
    return data


_WORKER_BLOBS = {}


def _worker_init():
    """每個 worker 各讀一份來源 TTF(合計約 200MB)，避免逐個分片重複 I/O。"""
    for name in PRIORITY:
        _WORKER_BLOBS[name] = (SRC_DIR / f"{name}.ttf").read_bytes()


def _build_one(task):
    chunk_start, font, cps = task
    filename = f"{PREFIX}-{WEIGHT}-{chunk_start:06x}.woff2"
    data = subset_chunk(_WORKER_BLOBS[font], cps)
    (FONTS_DIR / filename).write_bytes(data)
    return filename, len(data)


def main():
    FONTS_DIR.mkdir(parents=True, exist_ok=True)
    print("Loading source fonts...", file=sys.stderr)
    cmaps, blobs = load_cmaps()

    print("Assigning chunks...", file=sys.stderr)
    assignment = assign_chunks(cmaps)
    print(f"  {len(assignment)} chunks total", file=sys.stderr)

    items = sorted(assignment.items(), key=lambda kv: kv[0][0])
    tasks = [(chunk_start, font, sorted(cps)) for (chunk_start, font), cps in items]
    del blobs  # 每個 worker 自己重讀一份，別靠 fork 繼承(macOS 預設是 spawn)

    css_rules = []
    total_bytes = 0
    with Pool(processes=max(1, cpu_count() - 2), initializer=_worker_init) as pool:
        for i, (filename, size) in enumerate(pool.imap(_build_one, tasks), 1):
            total_bytes += size
            if i % 50 == 0 or i == len(tasks):
                print(f"  {i}/{len(tasks)} chunks built ({filename}, {size} bytes)", file=sys.stderr)

    for (chunk_start, font), cps in items:
        filename = f"{PREFIX}-{WEIGHT}-{chunk_start:06x}.woff2"
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
    print(f"  {total_bytes / 1e6:.1f} MB of woff2 written", file=sys.stderr)

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

    sync_vendor_copy()


def sync_vendor_copy():
    """把生成結果連同 LICENSE 複製一份到 web/webfonts/wfg-fsung/。"""
    vendor_fonts = VENDOR_DIR / "fonts"
    if vendor_fonts.exists():
        shutil.rmtree(vendor_fonts)
    shutil.copytree(FONTS_DIR, vendor_fonts)
    shutil.copy2(CSS_PATH, VENDOR_DIR / "wfg-fsung.css")
    shutil.copy2(OUT_DIR / "LICENSE", VENDOR_DIR / "LICENSE")
    print(f"Synced vendored copy to {VENDOR_DIR}", file=sys.stderr)


if __name__ == "__main__":
    main()
