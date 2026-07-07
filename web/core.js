// 部件檢索核心比對邏輯 -- 從 legacy/部件檢索.htm 逐一比對翻譯而來，邏輯不變。
//
// 背景見 doc/01~doc/04（尤其 doc/04 第 2、3 節：拆分樹比對法、異體映射）。
// 這裡刻意保留原始變數/函式名稱與控制流程，即使看起來不夠「現代」──
// 這段是全案正確性風險最高的地方，逐字對照比亂猜安全重寫要可靠得多。
// 唯一的實質改動：MakeBlock() 不再回傳 HTML 字串，改回傳一個 plain object，
// 交給 UI 層決定怎麼渲染（避免字串拼接生成 HTML）。

/**
 * @typedef {Object} MatchHit
 * @property {string} char 命中的字元
 * @property {number} code Unicode 碼位（10 進位）
 * @property {number} hit  0=精確命中 >0=模糊命中(值為殘留特徵數) -1=正體未中 -2=正體命中
 * @property {number} block GetBlock() 回傳的區塊編號
 */

/**
 * @param {string[]} dt 拆分表（data/dt.jsonl 逐行載入後的陣列）
 * @param {string[]} rt 展示異體表（data/rt.jsonl）
 * @param {Record<string,string>} vt 單向異體映射表（data/vt.json）
 */
export function createMatcher(dt, rt, vt) {
  let blkFlag = 0;

  function variant(w, v) {
    if (v) {
      const u = vt[w];
      if (u) return u;
    }
    return w;
  }

  // 把使用者輸入的部件序列，拆成陣列；'@' 及 'A'~'J'、'X'、'Y'、'Z' 在這裡
  // 是「只搜某些擴充區」核取方塊的旗標字元，不是漢字資料的一部分。
  function arrayalize(s, v) {
    blkFlag = 0;
    const a = [];
    for (let i = 0; i < s.length; i++) {
      let w = s.charAt(i);
      switch (w) {
        case '@': blkFlag |= 0x0001; break;
        case 'A': blkFlag |= 0x0002; break;
        case 'B': blkFlag |= 0x0004; break;
        case 'C': blkFlag |= 0x0008; break;
        case 'D': blkFlag |= 0x0010; break;
        case 'E': blkFlag |= 0x0020; break;
        case 'F': blkFlag |= 0x0040; break;
        case 'G': blkFlag |= 0x0080; break;
        case 'H': blkFlag |= 0x0100; break;
        case 'I': blkFlag |= 0x0200; break;
        case 'J': blkFlag |= 0x0400; break;
        case 'X': blkFlag |= 0x2000; break;
        case 'Y': blkFlag |= 0x4000; break;
        case 'Z': blkFlag |= 0x8000; break;
        default: {
          const c = w.charCodeAt(0);
          if (c >= 0x2FF0 && c <= 0x2FFB) break; // IDS 結構符號，略過
          if (c >= 0xD800 && c <= 0xDBFF) w += s.charAt(++i);
          a.push(variant(w, v));
        }
      }
    }
    if (blkFlag === 0) blkFlag = 0xFFFF;
    return a;
  }

  // 依碼位範圍判斷屬於哪個 Unicode 區塊；回傳值對應 arrayalize() 的旗標位元。
  function getBlock(c) {
    if (c < 0x3400) return 0;
    if (c <= 0x4DBF) return 2;
    if (c < 0x4E00) return 0;
    if (c <= 0x9FFF) return 1;
    if (c < 0xF900) return 0;
    if (c <= 0xFAD9) return 28;
    if (c < 0x20000) return 0;
    if (c <= 0x2A6DF) return 3;
    if (c < 0x2A700) return 0;
    if (c <= 0x2B73F) return 4;
    if (c <= 0x2B81F) return 5;
    if (c <= 0x2CEAF) return 6;
    if (c <= 0x2EBEF) return 7;
    if (c <= 0x2EE5F) return 10;
    if (c < 0x2F800) return 0;
    if (c <= 0x2FA1F) return 29;
    if (c < 0x30000) return 0;
    if (c <= 0x3134F) return 8;
    if (c <= 0x323AF) return 9;
    if (c <= 0x3347F) return 11;
    if (c < 0xF0200) return 0;
    if (c <= 0x1090EB) return 30;
    return 0;
  }

  // 把 Unicode 碼位換算成 dt/rt 陣列下標；換算不出來時線性掃描保留列 1~48。
  function getIndex(c) {
    let i;
    if (c < 0x3400) i = 0;
    else if (c <= 0x4DBF) i = c + 0x1E31;
    else if (c < 0x4E00) i = 0;
    else if (c <= 0x9FFF) i = c - 0x4DCF;
    else if (c < 0xF900) i = 0;
    else if (c <= 0xFAD9) i = c + 0x95B1;
    else if (c < 0x20000) i = 0;
    else if (c <= 0x2A6DF) i = c - 0x1940F;
    else if (c < 0x2A700) i = 0;
    else if (c <= 0x2EBEF) i = c - 0x1942F;
    else if (c <= 0x2EE5F) i = c - 0x1707F;
    else if (c < 0x2F800) i = 0;
    else if (c <= 0x2FA1F) i = c - 0x16775;
    else if (c < 0x30000) i = 0;
    else if (c <= 0x323AF) i = c - 0x1A83F;
    else if (c <= 0x3347F) i = c - 0x1A5CF;
    else if (c < 0xF0200) i = 0;
    else if (c <= 0x1090EB) i = c - 0xD6F55;
    else i = 0;
    if (i === 0) {
      for (i = 48; i > 0; i--) {
        if (c === dt[i].charCodeAt(0)) break;
      }
    }
    return i;
  }

  // 拆分樹比對演算法本體，見 doc/04 第 3.3 節、doc/02「檢索籃子走進漢字樹林」比喻。
  // a: 尚待滿足的特徵陣列(會被原地修改); s: 目前節點的分支字串;
  // d: 是否跨越 '!'（同字異拆分支）; v: 是否包容異體
  function eliminate(a, s, d, v) {
    const f = a.length === 1 && a[0] === '#';
    if (s === '@') {
      if (f) a.length = 0;
      return 1;
    }
    let n = 0;
    let k = 0;
    const b = a.concat();
    for (let i = 0; i < s.length; i++) {
      const w = s.charAt(i);
      if (w === '!') {
        if (!d) {
          if (f) a.length = 0;
          n = 1;
          break;
        }
      }
      if (w === '@' || w === '!') {
        if (k) {
          if (!a.length || !n) break;
          a.length = 0;
          for (let j = 0; j < b.length; j++) a.push(b[j]);
          n = 0;
        }
        k++;
      } else if (!f && a.length) {
        let j = 0;
        let ch = w;
        let c = ch.charCodeAt(0);
        if (c >= 0xD800 && c <= 0xDBFF) {
          j++;
          ch += s.charAt(++i);
          c = ((c - 0xD800) << 10) + ch.charCodeAt(1) + 0x2400;
        }
        const m = a.indexOf(variant(ch, v));
        if (m < 0) {
          const idx = getIndex(c);
          if (idx) n += eliminate(a, dt[idx].slice(j + 1), d, v);
          else n++;
        } else {
          a.splice(m, 1);
        }
      } else {
        n++;
      }
    }
    return n;
  }

  // filter() 對應原本客製化區裡永遠回傳 false 的預留鉤子（保留字，供未來排除特定字用）。
  function filter(_w, _c, _z) {
    return false;
  }

  function blockFlagFor(z) {
    switch (z) {
      case 1: return 0x0001;
      case 2: return 0x0002;
      case 3: return 0x0004;
      case 4: return 0x0008;
      case 5: return 0x0010;
      case 6: return 0x0020;
      case 7: return 0x0040;
      case 8: return 0x0080;
      case 9: return 0x0100;
      case 10: return 0x0200;
      case 11: return 0x0400;
      case 28:
      case 29: return 0x2000;
      case 30:
      case 31: return 0x4000;
      default: return 0x8000;
    }
  }

  /**
   * 部件檢索：用部件序列 s 查找符合條件的字。
   * @returns {MatchHit[]}
   */
  function getMatch(s, v, d, u, m) {
    const x = arrayalize(s, v).sort();
    const joined = x.join('');
    const out = [];
    const l = dt.length;
    const e = l - 48;
    for (let ii = 1; ii < l; ii++) {
      const i = ii < e ? ii + 48 : ii - l + 49;
      const y = x.concat();
      let j = 0;
      let w = dt[i].charAt(j);
      let c = w.charCodeAt(0);
      if (c >= 0xD800 && c <= 0xDBFF) {
        w += dt[i].charAt(++j);
        c = ((c - 0xD800) << 10) + w.charCodeAt(1) + 0x2400;
      }
      const z = getBlock(c);
      const f = blockFlagFor(z);
      if (!(blkFlag & f)) continue;
      if (u && f & 0x4000) continue;
      if (filter(w, c, z)) continue;
      let n = 0;
      if (variant(w, v) !== joined) {
        n = eliminate(y, dt[i].slice(j + 1), d, v);
        if (y.length) continue;
      }
      if (!n || out.length <= m) {
        out.push({ char: w, code: c, hit: n, block: z });
      }
    }
    return out;
  }

  /** 解構漢字：\字 -> 該字的拆分樹（陣列，每個元素是一種拆法的展開文字）。 */
  function exhaust(s, d, m) {
    let t = '';
    if (s.length) {
      let j = 0;
      let w = s.charAt(j);
      let c = w.charCodeAt(0);
      if (c >= 0xD800 && c <= 0xDBFF) {
        w += s.charAt(++j);
        c = ((c - 0xD800) << 10) + w.charCodeAt(1) + 0x2400;
      }
      const p = dt[getIndex(c)].slice(j + 1);
      let k = 0;
      for (let i = 0; i < p.length; i++) {
        w = p.charAt(i);
        if (w === '!' && !d) break;
        if (w === '@' || w === '!') {
          if (k) t += m < 0 ? '┇' : '‖';
          k++;
        } else {
          c = w.charCodeAt(0);
          if (c >= 0xD800 && c <= 0xDBFF) w += p.charAt(++i);
          t += w;
          if (m) {
            const q = exhaust(w, d, -1);
            if (q.length) t += `(${q})`;
          }
        }
      }
    }
    return t;
  }

  /** @returns {{ char: string, code: number, text: string }[]} */
  function getTree(s, d) {
    const a = [];
    if (s.length) {
      let w = s.charAt(0);
      let c = w.charCodeAt(0);
      if (c >= 0xD800 && c <= 0xDBFF) {
        w += s.charAt(1);
        c = ((c - 0xD800) << 10) + w.charCodeAt(1) + 0x2400;
      }
      let m = 0;
      let n = -1;
      const p = exhaust(w, d, 1);
      do {
        n = p.indexOf('‖', m);
        const t = p.slice(m, n < 0 ? p.length : n);
        a.push({ char: w, code: c, text: t.length ? t : '(不再分解)' });
        m = n + 1;
      } while (n >= 0);
    }
    return a;
  }

  /** 異體檢索：某字所有已知異體（依 rt 表）。 */
  function getVariant(s) {
    let j = 0;
    let w = s.charAt(j);
    let c = w.charCodeAt(0);
    if (c >= 0xD800 && c <= 0xDBFF) {
      w += s.charAt(++j);
      c = ((c - 0xD800) << 10) + w.charCodeAt(1) + 0x2400;
    }
    const i = getIndex(c);
    const out = [];

    function pushVar(r) {
      let rj = 0;
      let rw = r.charAt(rj);
      let rc = rw.charCodeAt(0);
      if (rc >= 0xD800 && rc <= 0xDBFF) {
        rw += r.charAt(++rj);
        rc = ((rc - 0xD800) << 10) + rw.charCodeAt(1) + 0x2400;
      }
      out.push({ char: rw, code: rc, hit: rw === s ? -2 : -1 });
      const l = dt.length;
      const e = l - 48;
      for (let ii = 1; ii < l; ii++) {
        const idx = ii < e ? ii + 48 : ii - l + 49;
        const t = [];
        for (let k = 0; k < rt[idx].length; k++) {
          let tw = rt[idx].charAt(k);
          const tc = tw.charCodeAt(0);
          if (tc >= 0xD800 && tc <= 0xDBFF) tw += rt[idx].charAt(++k);
          t.push(tw);
        }
        if (t.indexOf(r) < 0) continue;
        let dj = 0;
        let dw = dt[idx].charAt(dj);
        let dc = dw.charCodeAt(0);
        if (dc >= 0xD800 && dc <= 0xDBFF) {
          dw += dt[idx].charAt(++dj);
          dc = ((dc - 0xD800) << 10) + dw.charCodeAt(1) + 0x2400;
        }
        out.push({ char: dw, code: dc, hit: dw === s ? 0 : 1 });
      }
    }

    for (let k = 0; k < rt[i].length; k++) {
      let r = rt[i].charAt(k);
      const c2 = r.charCodeAt(0);
      if (c2 >= 0xD800 && c2 <= 0xDBFF) r += rt[i].charAt(++k);
      pushVar(r === '~' ? s : r);
    }
    return out;
  }

  return { arrayalize, getBlock, getIndex, eliminate, getMatch, exhaust, getTree, getVariant, variant };
}
