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


# 全宋體「無字形」的碼位：dt 的算術區塊被補齊到區塊邊界時多納入的未指派碼位
# （各擴充區尾端 padding、相容區未指派格）＋ PUA 補充字塊開頭的保留槽。這些列在
# legacy 裡都是 `字@╳`（無拆分、也沒被任何字當部件引用），字型畫不出來，卻會被
# getMatch() 當結果丟出（例如搜 U+3347A 會回 6 個一模一樣的空框——3347A 本身＋5 個
# 重複佔位列）。抹成空字串後，core.js 的 `if (!dt[i]) continue;` 會跳過它們，非字元
# 就不再被搜出。範圍由 deps/fonts 的全宋體 cmap 與 dt 逐碼位比對得出（版本綁定，字型
# 或資料改版時以下列一行重算：
#   python3 -c "from fontTools.ttLib import TTFont;import glob,json;cov=set().union(*(set(TTFont(p).getBestCmap()) for p in glob.glob('deps/fonts/FSung-*.ttf')));dt=[json.loads(l) for l in open('web/data/dt.jsonl')];print(sorted({ord(dt[i][0]) for i in range(49,len(dt)) if dt[i] and ord(dt[i][0]) not in cov}))"
NONCHAR_RANGES = [
    (0xFA6E, 0xFA6F),    # 相容表意 區塊內未指派
    (0x2B81E, 0x2B81F),  # Ext-D 尾 padding
    (0x2CEAE, 0x2CEAF),  # Ext-E 尾 padding
    (0x2EBE1, 0x2EBEF),  # Ext-F 尾 padding
    (0x2EE5E, 0x2EE5F),  # Ext-I 尾 padding
    (0x2FA1E, 0x2FA1F),  # 相容補充 尾 padding
    (0x3134B, 0x3134F),  # Ext-G 尾 padding
    (0x3347A, 0x3347A),  # Ext-J 尾（此碼位在 legacy 佔了 6 列：本尊＋5 個重複佔位）
    (0xF0200, 0xF021F),  # PUA 補充字塊開頭的保留槽（補充字實際從更後面才開始）
]


def blank_noncharacter_rows(dt, rt):
    """把「全宋體無字形」的佔位列抹成空字串，讓 core.js 不再把非字元搜成空框。

    只動 i>=49（保留列 0..48 另有語意）、且內嵌碼位落在 NONCHAR_RANGES 的列；
    這些列一律是 `字@╳`（無拆分、未被當部件），抹除不影響任何真字。`rt` 同列同抹。
    冪等：已是空字串就不重複處理。詳見本目錄 README。
    """
    def is_nonchar(c):
        return any(lo <= c <= hi for lo, hi in NONCHAR_RANGES)
    n = 0
    for i in range(49, len(dt)):
        e = dt[i]
        if e and is_nonchar(ord(e[0])):
            dt[i] = ""
            rt[i] = ""
            n += 1
    return n


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
    blanked = blank_noncharacter_rows(dt, rt)
    if blanked:
        print(f"blanked {blanked} non-character placeholder rows (see README)", file=sys.stderr)

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
