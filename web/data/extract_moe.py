#!/usr/bin/env python3
"""從 WFG《教育部異體字索引字典》mdx 抽出 字頭 → 教育部字號對照，產生 moe/ 分片。

資料來源：WFG 發布的《教育部異體字索引字典》離線字典
  https://fgwang.blogspot.com/2021/12/blog-post_29.html
下載 zip 解出其中唯一的 .mdx 檔後，在本目錄執行：

  pip install readmdict python-lzo
  python3 extract_moe.py 教育部異體字索引字典.mdx

輸出三種檔案，前端(web/data.js)查表時按需各載一片：
  moe/<片首碼位六位十六進制>.jsonl —— 正向：字 → 字號(每 4096 碼位一片)
  moe/code-<字母><千位兩位數>.jsonl —— 反向：字號 → 字(按字號千位分片，
    如 code-a02.jsonl 收 A02000~A02999 的全部身份，含 -NNN 後綴的異體/附字；
    反向片不存官網 ID——開字詳情時會再查正向表)
  moe/index.json —— {"chars": [片首...], "codes": [片名...]}，現存分片
    列表，讓前端不用以 404 試探。僅產出非空片。

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
import os
import re
import sys
from collections import defaultdict

from readmdict import MDX

TOKEN = re.compile(r'`(\d+)`')

SHARD_SHIFT = 12  # 每片 4096 碼位，與 web/data.js 的 moeShardKey() 必須一致


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
    shards = defaultdict(dict)  # 片首碼位 -> {字: [(字號, ID)]}
    by_code = {}  # 字號 -> 字
    total = 0
    for k, v in mdx.items():
        key = k.decode('utf-8')
        if len(list(key)) != 1:  # 只要單一字元的字頭（含 surrogate pair）
            continue
        recs = parse_records(v.decode('utf-8'))
        if recs:
            shards[(ord(key) >> SHARD_SHIFT) << SHARD_SHIFT][key] = recs
            total += 1
            for code, _ in recs:
                if code in by_code:
                    print(f'警告: 字號 {code} 重複({by_code[code]} / {key})', file=sys.stderr)
                by_code[code] = key

    os.makedirs('moe', exist_ok=True)
    starts = []
    for start in sorted(shards):
        starts.append(f'{start:06x}')
        with open(f'moe/{start:06x}.jsonl', 'w', encoding='utf-8') as f:
            chars = shards[start]
            for ch in sorted(chars, key=ord):  # 按碼位排序，diff 穩定
                row = [ch]
                for code, id_ in chars[ch]:
                    row += [code, id_]
                f.write(json.dumps(row, ensure_ascii=False, separators=(',', ':')) + '\n')

    code_shards = defaultdict(list)  # 片名(a02) -> [(字號, 字)]
    for code, ch in by_code.items():
        code_shards[f'{code[0].lower()}{int(code[1:6]) // 1000:02d}'].append((code, ch))
    code_names = []
    for name in sorted(code_shards):
        code_names.append(name)
        with open(f'moe/code-{name}.jsonl', 'w', encoding='utf-8') as f:
            for code, ch in sorted(code_shards[name]):  # 按字號排序，diff 穩定
                f.write(json.dumps([code, ch], ensure_ascii=False, separators=(',', ':')) + '\n')

    with open('moe/index.json', 'w', encoding='utf-8') as f:
        json.dump({'chars': starts, 'codes': code_names}, f)
    print(f'字頭 {total} 筆、字號 {len(by_code)} 筆 → moe/ 正向 {len(starts)} 片、反向 {len(code_names)} 片',
          file=sys.stderr)


if __name__ == '__main__':
    main()
