// 倒排索引(快查表)：部件列號 -> 含有該部件的字列號清單(升序)。
//
// 由 dt/vt 在 worker 啟動後「分塊」建立，不下載任何額外資料——索引是 dt 的
// 派生物，與其傳一份預先算好的表(壓縮後仍約 1.5MB，等於再下載一份 dt)，
// 不如載入時就地生成。分塊是為了讓建表期間到達的查詢仍能被即時處理
// (worker 是單執行緒，不切塊會把查詢卡在建表後面)。
//
// 正確性：core.js 的 eliminate() 是用 `a.indexOf(variant(ch, v))` 比對，
// 也就是「字的遞迴部件經異體摺疊後，要落在查詢部件集合裡」。因此把每個字
// 索引到「它遞迴分解出的每個部件 ch」與「ch 的異體代表 vt[ch]」之下(外加
// 自己)，對「包容異體」開/關兩種模式都是候選**超集**：
//   v=1 時查詢已被摺疊成 vt[X]，命中 postings[vt[X]]；
//   v=0 時查詢是原字 X，命中 postings[X]。
// 超集裡多出來的候選會在 eliminate() 精驗時被剔除，所以結果與全表掃描完全
// 一致——索引只負責把 20 萬列縮成少量候選，不參與判定。
//
// 「索引到自己」是必要的：單一部件查詢(例如查「明」)要能命中「明」本身，
// 而「明」並不出現在自己的分解裡。

/** dt 條目開頭那個字佔幾個 UTF-16 code unit(BMP 外的字是 surrogate pair)。 */
function headLen(s) {
  const c = s.charCodeAt(0);
  return c >= 0xd800 && c <= 0xdbff ? 2 : 1;
}

/**
 * 建立索引的分塊器。呼叫 step(budgetMs) 推進，回傳 true 表示已完成；
 * 完成後用 result() 取得 { postFlat, postOff }，list(i) = postFlat.subarray(postOff[i], postOff[i+1])。
 *
 * @param {string[]} dt 拆分表
 * @param {Record<string,string>} vt 單向異體映射表
 * @param {(c:number)=>number} getIndex 碼位 -> 列號(用 core.js 那一份，保證口徑一致)
 */
export function createIndexBuilder(dt, vt, getIndex) {
  const N = dt.length;

  // 每列的「異體代表列號」。vt 是 字->字，這裡先換算成 列號->列號，
  // 建表時才不必反覆做字串查表。
  const foldOf = new Int32Array(N);
  for (let i = 0; i < N; i++) foldOf[i] = i;
  for (const k in vt) {
    const a = getIndex(k.codePointAt(0));
    const b = getIndex(vt[k].codePointAt(0));
    if (a && b) foldOf[a] = b;
  }

  // 遞迴部件集合的備忘錄。存成 Int32Array 而非 JS 陣列，省下大量物件開銷。
  const memo = new Array(N);
  const state = new Uint8Array(N); // 0 未算 1 計算中(環路防護) 2 已完成
  const EMPTY = new Int32Array(0);

  /** 某列的直接部件列號(略過 '@' '!' 分支符號；'╳' 等換不出下標的一律略過)。 */
  function directComps(s, out) {
    out.length = 0;
    for (let i = headLen(s); i < s.length; i++) {
      const w = s.charAt(i);
      if (w === '@' || w === '!') continue;
      let ch = w;
      let c = ch.charCodeAt(0);
      if (c >= 0xd800 && c <= 0xdbff) {
        ch += s.charAt(++i);
        c = ((c - 0xd800) << 10) + ch.charCodeAt(1) + 0x2400;
      }
      const idx = getIndex(c);
      if (idx) out.push(idx);
    }
    return out;
  }

  /** 遞迴展開某列的全部部件(含各層)，回傳升序去重的 Int32Array。 */
  function rec(i) {
    if (state[i] === 2) return memo[i];
    if (state[i] === 1) return EMPTY; // 環路：回傳空集合斷開(拆分資料理論上無環)
    const s = dt[i];
    if (!s) {
      state[i] = 2;
      memo[i] = EMPTY;
      return EMPTY;
    }
    state[i] = 1;
    const set = new Set();
    const direct = directComps(s, []); // 遞迴中不能共用暫存陣列
    for (let k = 0; k < direct.length; k++) {
      const c = direct[k];
      set.add(c);
      if (c !== i) {
        const sub = rec(c);
        for (let z = 0; z < sub.length; z++) set.add(sub[z]);
      }
    }
    const arr = Int32Array.from(set);
    arr.sort();
    memo[i] = arr;
    state[i] = 2;
    return arr;
  }

  /** 某列要被索引到哪些鍵底下：遞迴部件 + 自己，各自再加上異體代表。 */
  function keysOf(i, into) {
    into.clear();
    const base = rec(i);
    for (let z = 0; z < base.length; z++) {
      const c = base[z];
      into.add(c);
      const f = foldOf[c];
      if (f !== c) into.add(f);
    }
    into.add(i);
    const fi = foldOf[i];
    if (fi !== i) into.add(fi);
    return into;
  }

  // ---- 分塊狀態機 ----
  // phase 0: 統計每個鍵有幾筆(順便把 rec 備忘錄建好)
  // phase 1: 前綴和 -> 偏移表
  // phase 2: 回填(rec 已備忘，很快)
  let phase = 0;
  let cursor = 1;
  let counts = new Int32Array(N + 1);
  let postOff = null;
  let postFlat = null;
  let fill = null;
  const keySet = new Set();

  function step(budgetMs) {
    const t0 = Date.now();
    while (Date.now() - t0 < budgetMs) {
      if (phase === 0) {
        if (cursor >= N) {
          phase = 1;
          continue;
        }
        const end = Math.min(N, cursor + 400);
        for (; cursor < end; cursor++) {
          if (!dt[cursor]) continue;
          const ks = keysOf(cursor, keySet);
          for (const k of ks) counts[k]++;
        }
      } else if (phase === 1) {
        postOff = new Int32Array(N + 1);
        let acc = 0;
        for (let i = 0; i < N; i++) {
          postOff[i] = acc;
          acc += counts[i];
        }
        postOff[N] = acc;
        postFlat = new Int32Array(acc);
        fill = postOff.slice(0, N); // 各鍵的寫入游標
        counts = null;
        phase = 2;
        cursor = 1;
      } else if (phase === 2) {
        if (cursor >= N) return true;
        const end = Math.min(N, cursor + 400);
        for (; cursor < end; cursor++) {
          if (!dt[cursor]) continue;
          const ks = keysOf(cursor, keySet);
          for (const k of ks) postFlat[fill[k]++] = cursor;
        }
      }
    }
    return phase === 2 && cursor >= N;
  }

  function result() {
    // cursor 由小到大回填 -> 每條清單天然升序，不需要再排序
    memo.length = 0;
    fill = null;
    return { postFlat, postOff };
  }

  return { step, result };
}
