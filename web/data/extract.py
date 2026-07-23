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

# 本檔案位於 web/data/，repo 根目錄是上上層
ROOT = Path(__file__).resolve().parent.parent.parent
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


def align_pua_rows(dt, rt):
    """修正全宋體補充字塊 U+F7121–F712F 這 15 列在 legacy 裡的錯序。

    legacy 把「糹殿」(U+F7121) 的條目排在該視窗的最後一列(算術位置 U+F712F),
    其餘 14 字各往後移一格,使純算術的 `getIndex()`(id = 碼位 - 0xD6F55)查這 15
    個補充字時取到「隔壁列」,拆分樹/字詳情會顯示成後一個碼位的字。這裡按內嵌碼位
    升序把這段重排,讓「列序 == 內嵌碼位 == 全宋體字形」三者一致;`rt` 逐行對齊,
    套用相同排列。char↔拆分 的綁定本身不變,只更正列序。詳見本目錄 README。

    冪等:若已對齊(或上游日後在來源就修好),直接跳過不動。
    """
    PUA_OFF = 0xD6F55
    lo, hi = 0xF7121 - PUA_OFF, 0xF712F - PUA_OFF  # -> 0-indexed 列 131532..131546
    win = list(range(lo, hi + 1))
    if all(ord(dt[i][0]) == i + PUA_OFF for i in win):
        return False
    order = sorted(win, key=lambda i: ord(dt[i][0]))
    dt_win = [dt[i] for i in order]
    rt_win = [rt[i] for i in order]
    for pos, dv, rv in zip(win, dt_win, rt_win):
        dt[pos], rt[pos] = dv, rv
    return True


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

    if align_pua_rows(dt, rt):
        print("aligned PUA rows U+F7121-F712F (see README)", file=sys.stderr)

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
