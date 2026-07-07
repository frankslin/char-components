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
