// 解析 data/kt.json（部件鍵盤分類資料），格式沿用 legacy/部件檢索.htm 的 `kt` 定義：
// 每筆是 "<圖示>,<分類名稱>:<字1>,<字2>,..."，冒號前是圖示+分類名稱（用逗號分隔
// 折行），冒號後每個逗號分隔的字串是鍵盤上「一列」，列中每個字元各自是一顆按鍵。
// 見 legacy/部件檢索.htm 的 Init() 函式（cathdr/catbtn 組裝邏輯）。

function splitChars(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    let w = s.charAt(i);
    const c = w.charCodeAt(0);
    if (c >= 0xD800 && c <= 0xDBFF) w += s.charAt(++i);
    out.push(w);
  }
  return out;
}

/**
 * @param {string[]} kt data/kt.json 內容
 * @returns {{ icon: string, name: string, rows: string[][] }[]}
 */
export function parseKeypad(kt) {
  return kt.map((entry) => {
    const colon = entry.indexOf(':');
    const head = entry.slice(0, colon);
    const body = entry.slice(colon + 1);
    const headParts = head.split(',');
    const icon = headParts[0];
    const name = headParts.slice(1).join('');
    const rows = body.split(',').map(splitChars);
    return { icon, name, rows };
  });
}

/**
 * 解析 data/bt.json（部首依筆畫排列，見 data/README.md）。
 *
 * `kangxi`：每筆是 "<畫數>:<部首1>,<部首2>,..."，逗號分隔的每個字串是「一個
 * 部首」，其中第一個字元是正形、其餘是附形（如 "人亻"、"水氵氺"）——注意這裡
 * 跟 kt.json 不同，一個逗號區段不是一列按鍵，而是同一個部首的一組寫法。部首
 * 編號（康熙 1~214）不存在資料裡，由陣列順序推算。
 *
 * `simplified`：每筆是 "<畫數>:<簡化形><對應部首編號>,..."（如 "3:马187"）。
 * 簡化形歸在**自己的畫數**底下（马 在 3 畫，不是跟著馬 掛在 10 畫），因為使用
 * 者是照著眼前的字形數筆畫來找的；編號寫在資料裡而不是靠順序，因為它們跟康熙
 * 順序無關。
 *
 * @param {{kangxi: string[], simplified: string[]}} bt data/bt.json 內容
 * @returns {{ strokes: number,
 *             radicals: { no: number, forms: string[] }[],
 *             simplified: { no: number, form: string, trad: string }[] }[]}
 */
export function parseRadicalPad(bt) {
  const groups = new Map();
  const group = (strokes) => {
    if (!groups.has(strokes)) groups.set(strokes, { strokes, radicals: [], simplified: [] });
    return groups.get(strokes);
  };
  const tradOf = new Map(); // 部首編號 → 正形，給簡化形的說明文字用

  let no = 0;
  for (const entry of bt.kangxi) {
    const colon = entry.indexOf(':');
    const g = group(Number(entry.slice(0, colon)));
    for (const token of entry.slice(colon + 1).split(',')) {
      const forms = splitChars(token);
      tradOf.set(++no, forms[0]);
      g.radicals.push({ no, forms });
    }
  }
  for (const entry of bt.simplified || []) {
    const colon = entry.indexOf(':');
    const g = group(Number(entry.slice(0, colon)));
    for (const token of entry.slice(colon + 1).split(',')) {
      const n = Number(token.match(/\d+$/)[0]);
      g.simplified.push({ no: n, form: token.replace(/\d+$/, ''), trad: tradOf.get(n) });
    }
  }
  return [...groups.values()].sort((a, b) => a.strokes - b.strokes);
}
