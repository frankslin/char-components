// 比對計算的 Web Worker 側。core.js 的 getMatch() 是同步計算，「同字異拆」
// 開啟時單次可達數百毫秒，放在主執行緒會讓打字、勾選項全程卡頓(即時查詢
// 每次 debounce 到期就凍一下)；core.js 本來就是純函式、無 DOM 依賴
// (AGENTS.md 約束 2 的分層)，整個搬進 worker 不需要改動任何演算法。
// dt/rt/vt 資料與 matcher 只存在 worker 側，主執行緒(app.js)透過訊息 RPC
// 取得渲染所需的純資料；kt/bt(兩種鍵盤佈局)在 init 時一次交給主執行緒。
import { loadData } from './data.js';
import { createMatcher } from './core.js';
import { createIndexBuilder } from './qindex.js';

let matcher;
let dt; // 碼位查詢的「已收錄」判定需要直接驗證 dt 字頭
let indexMs = null; // 索引建好花了多久(null = 還沒好)

// 啟動後在背景「分塊」建倒排索引(見 qindex.js)。worker 是單執行緒，一口氣
// 建完會把建表期間到達的查詢全卡在後面，所以每塊只做 12ms 就用 setTimeout(0)
// 讓出事件迴圈——待處理的 match 訊息會先被派送，走原本的全表掃描回答。
// 建好之後 getMatch() 自動改走候選路徑，兩者結果一致(索引只縮小候選)。
function startIndexBuild(data) {
  const builder = createIndexBuilder(data.dt, data.vt, matcher.getIndex);
  const t0 = performance.now();
  const pump = () => {
    if (builder.step(12)) {
      matcher.setIndex(builder.result());
      indexMs = Math.round(performance.now() - t0);
      return;
    }
    setTimeout(pump, 0);
  };
  setTimeout(pump, 0);
}

const boot = (async () => {
  const t0 = performance.now();
  const data = await loadData('./data/');
  matcher = createMatcher(data.dt, data.rt, data.vt);
  dt = data.dt;
  startIndexBuild(data);
  return { kt: data.kt, bt: data.bt, ms: Math.round(performance.now() - t0) };
})();
boot.catch(() => {}); // 錯誤在各請求的 await boot 處回報，這裡只防未處理拒絕警告

const ops = {
  init: (_, bootResult) => bootResult,
  // 部件比對。elapsed 在這裡量，只含純計算時間(不含訊息往返)，
  // 與原本主執行緒同步計算時計數列顯示的秒數口徑一致。
  match({ query, v, d, u, max }) {
    const t0 = performance.now();
    const hits = matcher.getMatch(query, v, d, u, max);
    return { hits, elapsed: performance.now() - t0, indexed: indexMs !== null };
  },
  // 索引狀態(除錯/測試用)
  status: () => ({ indexMs }),
  // 碼位查詢：getIndex() 能換算出下標、該 dt 條目字頭就是這個字才算已收錄
  // (下標 1~10 是 A~J 旗標保留列，排除；11~48 的鍵盤部件是合法目標)。
  codepoint({ cp }) {
    const i = matcher.getIndex(cp);
    const known = i > 10 && dt[i] !== undefined && dt[i].codePointAt(0) === cp;
    return { known, block: matcher.getBlock(cp) };
  },
  // 字詳情的拆分樹：一律回傳全部拆法，「同字異拆」未勾選時由 UI 端裁切
  tree({ char }) {
    return { trees: matcher.getTree(char, true) };
  },
  // 一批碼位的字源分類(字號查詢的字族列表用)
  blocks({ cps }) {
    return { blocks: cps.map((cp) => matcher.getBlock(cp)) };
  },
};

onmessage = async (e) => {
  const { id, op } = e.data;
  try {
    const bootResult = await boot;
    postMessage({ id, ok: true, result: ops[op](e.data, bootResult) });
  } catch (err) {
    postMessage({ id, ok: false, error: err.message });
  }
};
