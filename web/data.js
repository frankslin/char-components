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

// 教育部異體字字典對照表(moe/ 分片)：正向「字 → 字號」與反向「字號 → 字」。
// 全表數 MB 但單次查詢只需其中一片，所以分片存放、查哪片才載哪片：正向按
// 4096 碼位一片(52 片、中位數 47KB)，反向按字號千位一片(32 片)；index.json
// 是現存分片列表({chars, codes})，查表前先比對，不存在的片連 fetch 都不發
// (避免 404 試探)。載入失敗一律當作沒有對照資料，不重試不報錯，呼叫端退回
// 原本的呈現。分片粒度必須與 web/data/extract_moe.py 一致。
const MOE_SHARD_SHIFT = 12;
let moeIndexPromise = null;
const moeShardPromises = new Map();

function moeIndex(baseUrl) {
  if (!moeIndexPromise) {
    moeIndexPromise = fetch(`${baseUrl}moe/index.json`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((idx) => ({ chars: new Set(idx.chars || []), codes: new Set(idx.codes || []) }))
      .catch(() => ({ chars: new Set(), codes: new Set() }));
  }
  return moeIndexPromise;
}

// rows: 反向片每行 [字號, 字]；正向片每行 [字, 字號1, ID1, 字號2, ID2, ...]。
// 兩者第一欄都是唯一鍵，統一存成 Map(鍵 → 整行)。
function moeShard(name, baseUrl) {
  if (!moeShardPromises.has(name)) {
    moeShardPromises.set(name, fetchLines(`${baseUrl}moe/${name}.jsonl`)
      .then((rows) => new Map(rows.map((row) => [row[0], row])))
      .catch(() => new Map()));
  }
  return moeShardPromises.get(name);
}

/**
 * 查一個字的教育部異體字字典字號。
 * @returns {Promise<{code: string, id: number}[]|null>} 無對照(或載入失敗)回 null
 */
export async function getMoeRefs(char, baseUrl = './data/') {
  const index = await moeIndex(baseUrl);
  const cp = char.codePointAt(0);
  const start = ((cp >> MOE_SHARD_SHIFT) << MOE_SHARD_SHIFT).toString(16).padStart(6, '0');
  if (!index.chars.has(start)) return null;
  const shard = await moeShard(start, baseUrl);
  const row = shard.get(char);
  if (!row) return null;
  const refs = [];
  for (let i = 1; i + 1 < row.length; i += 2) refs.push({ code: row[i], id: row[i + 1] });
  return refs;
}

/**
 * 以教育部字號反查字。code 須是正規化過的字號(大寫，如 A02353 或 A02353-004)。
 * 回傳 {exact, family}：exact 是字號的精確命中(查無為 null)；family 是該正字
 * 底下的整個字族(正字＋全部異體/附字，字號昇冪，裸正字號查詢時用來列全族)。
 * @returns {Promise<{exact: {code: string, char: string}|null,
 *                    family: {code: string, char: string}[]}|null>} 分片不存在回 null
 */
export async function findMoeCode(code, baseUrl = './data/') {
  const index = await moeIndex(baseUrl);
  // index.json 的 codes 列表存的是不含「code-」前綴的片名(a02)，檔名才帶前綴
  const name = `${code[0].toLowerCase()}${String(Math.floor(Number(code.slice(1, 6)) / 1000)).padStart(2, '0')}`;
  if (!index.codes.has(name)) return null;
  const shard = await moeShard(`code-${name}`, baseUrl);
  const zheng = code.slice(0, 6); // 字族以正字號歸戶
  const family = [];
  for (const [c, row] of shard) {
    if (c === zheng || c.startsWith(`${zheng}-`)) family.push({ code: c, char: row[1] });
  }
  family.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
  const hit = shard.get(code);
  return { exact: hit ? { code, char: hit[1] } : null, family };
}

/**
 * @param {string} baseUrl data/ 目錄的相對或絕對路徑（含結尾斜線）
 * @returns {Promise<{dt: string[], rt: string[], vt: Record<string,string>,
 *                    kt: string[], bt: string[]}>}
 */
export async function loadData(baseUrl = './data/') {
  const [dt, rt, vt, kt, bt] = await Promise.all([
    fetchLines(`${baseUrl}dt.jsonl`),
    fetchLines(`${baseUrl}rt.jsonl`),
    fetchJson(`${baseUrl}vt.json`),
    fetchJson(`${baseUrl}kt.json`),
    fetchJson(`${baseUrl}bt.json`),
  ]);
  if (dt.length !== rt.length) {
    throw new Error(`dt(${dt.length}) 與 rt(${rt.length}) 筆數不一致，資料可能損毀`);
  }
  return { dt, rt, vt, kt, bt };
}
