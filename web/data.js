// 讀取 data/ 目錄下抽離出來的 dt/rt/vt，供 core.js 使用。
// 純 fetch + JSON.parse，不需要任何建置工具；部署後用 http(s) 開啟即可運作
// （用 file:// 直接雙擊開啟會被瀏覽器的 fetch 同源限制擋下，這是刻意的取捨——
// 見 web/README.md）。

async function fetchLines(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`無法載入 ${url}: HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.split('\n');
  const out = [];
  for (const line of lines) {
    if (!line) continue;
    out.push(JSON.parse(line));
  }
  return out;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`無法載入 ${url}: HTTP ${res.status}`);
  return res.json();
}

/**
 * @param {string} baseUrl data/ 目錄的相對或絕對路徑（含結尾斜線）
 * @returns {Promise<{dt: string[], rt: string[], vt: Record<string,string>, kt: string[]}>}
 */
export async function loadData(baseUrl = '../data/') {
  const [dt, rt, vt, kt] = await Promise.all([
    fetchLines(`${baseUrl}dt.jsonl`),
    fetchLines(`${baseUrl}rt.jsonl`),
    fetchJson(`${baseUrl}vt.json`),
    fetchJson(`${baseUrl}kt.json`),
  ]);
  if (dt.length !== rt.length) {
    throw new Error(`dt(${dt.length}) 與 rt(${rt.length}) 筆數不一致，資料可能損毀`);
  }
  return { dt, rt, vt, kt };
}
