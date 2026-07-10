#!/usr/bin/env python3
"""從 WFG《教育部異體字索引字典》mdx 抽出 PUA 字頭 → 教育部字號對照，產生 moe-pua.jsonl。

資料來源：WFG 發布的《教育部異體字索引字典》離線字典
  https://fgwang.blogspot.com/2021/12/blog-post_29.html
下載 zip 解出其中唯一的 .mdx 檔後執行：

  pip install readmdict python-lzo
  python3 extract_moe.py 教育部異體字索引字典.mdx

mdx 詞條值是 MDict 的 compact StyleSheet 格式：`NN` 樣式碼與文字交錯。
一個詞條（字頭）可含多筆記錄——同一字可兼為正字/異體/附字多重身份，
記錄以樣式碼 `44` 分隔。每筆記錄開頭附近依序有：
  `26` 類別（正/異/附，只取第一次出現）
  `55` 官網頁面 ID（dictView.jsp?ID=<此值>，出處見 mdx StyleSheet 樣式 55 的模板）
  `56` 教育部字號（如 A00414-002；正字無連字號；附字多為三段式）
記錄後半的 `90`/`91`/`93` 是同組全部異體的展示清單，與本對照無關，
且同樣的樣式碼在後半會重複出現，故每欄只取記錄內第一次出現的值。
"""
import json
import re
import sys

from readmdict import MDX

TOKEN = re.compile(r'`(\d+)`')

PUA = lambda cp: (0xE000 <= cp <= 0xF8FF) or cp >= 0xF0000  # noqa: E731 與 web/app.js 的 isPua() 同義


def parse_records(value):
    """回傳 [(字號, 官網ID)]，每筆是該字頭的一個身份。"""
    parts = TOKEN.split(value)  # parts[0] 是開頭空字串，其後 [樣式碼, 文字, ...] 交錯
    pairs = list(zip(parts[1::2], parts[2::2]))
    records, cur = [], None
    for code, text in pairs:
        if code == '44':  # 記錄分隔
            if cur:
                records.append(cur)
            cur = None
            continue
        if cur is None:
            cur = {}
        if code in ('55', '56') and code not in cur:
            cur[code] = text
    if cur:
        records.append(cur)
    return [(r['56'], int(r['55'])) for r in records if '55' in r and '56' in r]


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    mdx = MDX(sys.argv[1])
    out = {}
    for k, v in mdx.items():
        key = k.decode('utf-8')
        if len(list(key)) != 1:  # 只要單一字元的字頭（含 surrogate pair）
            continue
        if not PUA(ord(key)):
            continue
        recs = parse_records(v.decode('utf-8'))
        if recs:
            out[key] = recs

    with open('moe-pua.jsonl', 'w', encoding='utf-8') as f:
        for ch in sorted(out, key=ord):  # 按碼位排序，diff 穩定
            row = [ch]
            for code, id_ in out[ch]:
                row += [code, id_]
            f.write(json.dumps(row, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'PUA 字頭 {len(out)} 筆 → moe-pua.jsonl', file=sys.stderr)


if __name__ == '__main__':
    main()
