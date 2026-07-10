// 讀取 web/data/ 目錄下抽離出來的 dt/rt/vt，供 core.js 使用。
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

// 教育部異體字字典對照表(moe-pua.jsonl)：PUA 補充字 → [字號, 官網ID, ...]。
// 只有字詳情面板用得到，而且檔案有 1MB+，所以不跟 loadData() 一起載，
// 第一次查 PUA 字詳情時才 fetch，之後共用同一個 promise(含失敗——載入失敗
// 就當作沒有對照資料，不重試不報錯，詳情面板退回「無連結」說明)。
let moePuaPromise = null;

export function loadMoePua(baseUrl = './data/') {
  if (!moePuaPromise) {
    moePuaPromise = fetchLines(`${baseUrl}moe-pua.jsonl`)
      .then((rows) => {
        // 每行 [字, 字號1, ID1, 字號2, ID2, ...]，攤平存成 Map
        const map = new Map();
        for (const row of rows) {
          const refs = [];
          for (let i = 1; i + 1 < row.length; i += 2) refs.push({ code: row[i], id: row[i + 1] });
          map.set(row[0], refs);
        }
        return map;
      })
      .catch(() => new Map());
  }
  return moePuaPromise;
}

/**
 * @param {string} baseUrl data/ 目錄的相對或絕對路徑（含結尾斜線）
 * @returns {Promise<{dt: string[], rt: string[], vt: Record<string,string>, kt: string[]}>}
 */
export async function loadData(baseUrl = './data/') {
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
