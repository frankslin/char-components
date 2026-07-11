import { getMoeRefs, findMoeCode } from './data.js';
import { parseKeypad } from './keypad.js';
import { BLOCKS, blockInfo } from './blocks.js';
import { RADICAL_ENTRIES } from './radicals.js';

const LIVE_MAX_RESULTS = 500;
const FULL_MAX_RESULTS = 3000;
const LIVE_DEBOUNCE_MS = 120;
const RENDER_WAVE_SIZE = 240;
const RENDER_WAVE_MAX_WAIT_MS = 1000;

// 比對計算在 worker.js(Web Worker)裡跑，主執行緒不再被同步比對凍住(同字
// 異拆開啟時單次 ~700ms，過去每次即時查詢都卡一下打字)。這裡是 RPC 客戶端：
// 每個請求帶遞增 id，以 Promise 對應回覆。matcher 與 dt 資料只存在 worker
// 側，主執行緒只拿渲染所需的純資料(hits/trees/block)。
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
const rpcPending = new Map();
let rpcSeq = 0;

function rpc(op, args) {
  return new Promise((resolve, reject) => {
    const id = ++rpcSeq;
    rpcPending.set(id, { resolve, reject });
    worker.postMessage({ id, op, ...args });
  });
}

worker.addEventListener('message', (e) => {
  const { id, ok, result, error } = e.data;
  const p = rpcPending.get(id);
  if (!p) return;
  rpcPending.delete(id);
  if (ok) p.resolve(result);
  else p.reject(new Error(error));
});

// worker 腳本本身載入失敗(404/語法錯誤)不會走 message，一律讓在途請求失敗
worker.addEventListener('error', (e) => {
  for (const p of rpcPending.values()) p.reject(new Error(e.message || 'worker 載入失敗'));
  rpcPending.clear();
});

// 外部字典：字詳情面板會把全部連結一次列出(PUA 補充字除外——沒有正式碼位，
// 外部字典查不到)。字統網是 legacy 版預設的 `ref`；其餘 URL 格式都驗證過
// 可直接以字(或碼位)查詢——國學大師的格式出自其官方說明頁(站點有地區
// 連線限制，未能直接實測)。Unihan 是 Unicode 官方資料庫，再罕見的正式
// 編碼字都有記錄，對擴充區生僻字特別有用。
const EXTERNAL_DICTS = [
  { name: '字統網', url: (ch) => `https://zi.tools/zi/${encodeURIComponent(ch)}` },
  { name: '漢典', url: (ch) => `https://www.zdic.net/hans/${encodeURIComponent(ch)}` },
  // moe 旗標：字詳情面板會非同步查教育部字號對照表(見 getMoeRefs)，查到就把
  // 這個「以字搜尋」的泛用連結原地換成一或多個字號直鏈(一字可兼多重身份)
  { name: '教育部異體字字典', moe: true, url: (ch) => `https://dict.variants.moe.edu.tw/search.jsp?QTP=0&WORD=${encodeURIComponent(ch)}` },
  { name: '國學大師', url: (ch) => `https://www.guoxuedashi.net/zidian/so.php?sokeyzi=${encodeURIComponent(ch)}&kz=1` },
  { name: '萌典', url: (ch) => `https://www.moedict.tw/${encodeURIComponent(ch)}` },
  { name: '維基詞典(中)', url: (ch) => `https://zh.wiktionary.org/wiki/${encodeURIComponent(ch)}` },
  { name: 'Wiktionary(英)', url: (ch) => `https://en.wiktionary.org/wiki/${encodeURIComponent(ch)}` },
  { name: 'ウィクショナリー(日)', url: (ch) => `https://ja.wiktionary.org/wiki/${encodeURIComponent(ch)}` },
  { name: 'Unihan', url: (ch) => `https://www.unicode.org/cgi-bin/GetUnihanData.pl?codepoint=U%2B${ch.codePointAt(0).toString(16).toUpperCase()}` },
  { name: '小學堂字形演變', url: (ch) => `https://xiaoxue.iis.sinica.edu.tw/yanbian?char=${encodeURIComponent(ch)}` },
  { name: 'CTEXT', url: (ch) => `https://ctext.org/dictionary.pl?if=zh&char=${encodeURIComponent(ch)}` },
  // GlyphWiki 以小寫十六進制碼位定址(字形維基，收錄大量罕見字形)
  { name: 'GlyphWiki', url: (ch) => `https://glyphwiki.org/wiki/u${ch.codePointAt(0).toString(16)}` },
];

// 「相容表意文字」區都是外觀與基本區重複的相容碼位，一般使用者不該把它們
// 打進文件裡，所以一律不列出。core.js 的旗標語法('@'/'A'..'J'/'X'/'Y'/'Z')
// 仍然有效——真的要查相容區，直接在輸入前打「X」即可，但 UI 上不再提供入口。
const BLOCK_FLAG_CHARS = new Set(BLOCKS.map((b) => b.flag));
const DEFAULT_FLAGS = BLOCKS.filter((b) => b.cls !== 'cmp').map((b) => b.flag).join('');

function hasBlockFlag(s) {
  for (const ch of s) if (BLOCK_FLAG_CHARS.has(ch)) return true;
  return false;
}

const els = {
  input: document.getElementById('input'),
  search: document.getElementById('search'),
  clear: document.getElementById('clear'),
  live: document.getElementById('opt-live'),
  variant: document.getElementById('opt-variant'),
  subdivide: document.getElementById('opt-subdivide'),
  ucodeOnly: document.getElementById('opt-ucodeonly'),
  counter: document.getElementById('counter'),
  suggest: document.getElementById('suggest'),
  output: document.getElementById('output'),
  status: document.getElementById('status'),
  toast: document.getElementById('toast'),
  legend: document.getElementById('legend'),
  tooltip: document.getElementById('tooltip'),
  keypadGrid: document.getElementById('keypad-grid'),
  sidePanel: document.getElementById('side-panel'),
  togglePanel: document.getElementById('toggle-panel'),
  sideTabKeypad: document.getElementById('side-tab-keypad'),
  sideTabDetail: document.getElementById('side-tab-detail'),
  charDetail: document.getElementById('char-detail'),
  panelBody: document.getElementById('panel-body'),
};

// 窄螢幕(手機)判斷：不快取，轉橫屏/縮放視窗時即時反映
function isMobile() {
  return window.matchMedia('(max-width: 60rem)').matches;
}

// 側欄「收起/展開」：跟 setSideView 一樣拉到模組層級，因為點字塊觸發的
// showCharDetail() 也需要在使用者收起面板時自動展開，讓詳情看得到。
function setCollapsed(collapsed) {
  // 手機上抽屜展開時讓輸入框失焦，收掉系統輸入法鍵盤——
  // 部首鍵盤與系統鍵盤互斥，不能同時佔下半屏
  if (!collapsed && isMobile()) els.input.blur();
  els.sidePanel.classList.toggle('collapsed', collapsed);
  document.body.classList.toggle('panel-collapsed', collapsed);
  els.togglePanel.textContent = collapsed ? '展開' : '收起';
}

// 側欄「部件鍵盤／字詳情」頁籤：點字塊會自動切到字詳情(見 showCharDetail)，
// 使用者也能隨時切回鍵盤，詳情內容會保留到下次點其他字為止。
function setSideView(view) {
  els.sidePanel.dataset.view = view;
  els.sideTabKeypad.classList.toggle('active', view === 'keypad');
  els.sideTabDetail.classList.toggle('active', view === 'detail');
  els.sideTabKeypad.setAttribute('aria-selected', String(view === 'keypad'));
  els.sideTabDetail.setAttribute('aria-selected', String(view === 'detail'));
}

// 查詢狀態 ↔ URL query string，讓連結可以直接分享。
// 選項只在偏離預設值時才寫進網址，保持乾淨。
function stateToParams() {
  const p = new URLSearchParams();
  if (els.input.value) p.set('q', els.input.value);
  if (!els.variant.checked) p.set('v', '0');
  if (!els.subdivide.checked) p.set('d', '0');
  if (els.ucodeOnly.checked) p.set('u', '1');
  return p;
}

// 歷史棧策略：把「按查詢/Enter 確認過的查詢」與「由連結開啟/前後退還原的狀態」
// 視為已定案(settled)的歷史紀錄。之後第一次變更(打字、勾選項、切分頁)會先
// pushState 保護這筆定案紀錄，接下來的連續變更(即時查詢的逐鍵更新等)只
// replaceState 原地改寫——這樣打一個詞不會塞進十筆歷史，但「後退」永遠回到
// 上一個定案的查詢，不會被打字過程覆蓋掉。
let urlSettled = true;

function syncUrl(settle = false) {
  const qs = stateToParams().toString();
  const target = qs ? `?${qs}` : '';
  if (location.search !== target) {
    history[urlSettled ? 'pushState' : 'replaceState'](null, '', target || location.pathname);
  }
  urlSettled = settle;
}

function applyStateFromUrl() {
  const p = new URLSearchParams(location.search);
  els.variant.checked = p.get('v') !== '0';
  els.subdivide.checked = p.get('d') !== '0';
  els.ucodeOnly.checked = p.get('u') === '1';
  const q = p.get('q') ?? '';
  els.input.value = q;
  clearTimeout(liveTimer);
  urlSettled = true;
  if (q) {
    doSearch(FULL_MAX_RESULTS, { sync: false });
    // 舊版分享連結的 ?mode=tree(拆字分頁)：拆字已統一併入字詳情面板
    if (p.get('mode') === 'tree') openDetailForChar(q);
  } else {
    els.counter.textContent = '';
    clearOutput();
  }
}

// 「補充」分類(見 blocks.js／doc/04 第 5 節)是作者暫用的私有造字區碼位，
// 不是正式的 Unicode 編碼，所以不顯示 U+ 碼位，避免讓人誤以為那是標準編碼。
function chipTitle(code, info) {
  if (info.cls === 'sup') return `${info.label}（尚未正式編碼，暫用私有碼位）`;
  return `U+${code.toString(16).toUpperCase()} · ${info.label}`;
}

// PUA(私有造字區)碼位必須用全宋體渲染(見 style.css 的 .pua-char)：
// 系統字型在 15/16 輔助平面不會有字形，但個別 BMP PUA 碼位可能撞車。
function isPua(code) {
  return (code >= 0xE000 && code <= 0xF8FF) || code >= 0xF0000;
}

function hitClass(hit) {
  if (hit === -2) return 'hit-regu1';
  if (hit < 0) return 'hit-regu0';
  return hit ? 'hit-fuzzy' : 'hit-exact';
}

// 插入字元到目前游標位置（覆蓋選取範圍）。
// selectionStart/selectionEnd 本來就是以 UTF-16 code unit 計算，
// 跟原版手刻的 surrogate pair 位移邏輯效果相同，不需要另外處理。
// 手機上**刻意不奪取焦點**：部首鍵盤跟系統輸入法鍵盤是互斥的兩種輸入
// 方式，點部首鍵若 focus() 輸入框，系統鍵盤會彈出來跟底部抽屜互相頂。
// 無焦點時游標位置不可靠(iOS 會歸零)，直接附加到字串末尾——連續點
// 部件本來就是順序追加。
function insertAtCursor(el, text) {
  if (isMobile() && document.activeElement !== el) {
    el.value += text;
    return;
  }
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  el.value = el.value.slice(0, start) + text + el.value.slice(end);
  const pos = start + text.length;
  el.focus();
  el.setSelectionRange(pos, pos);
}

// 結果字塊：點擊＝複製到剪貼簿＋打開右側字詳情(拆分樹、外部字典連結
// 都在詳情裡)。曾經做過 hover 浮現的小工具列(複製/查字典)，後來移除——
// 點擊本來就會複製，查字典在詳情面板有更完整的入口，工具列是冗餘。
function buildCharChip(char, code, info, chipClass) {
  const tip = chipTitle(code, info);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = chipClass;
  if (isPua(code)) btn.classList.add('pua-char');
  btn.textContent = char;
  btn.dataset.tip = tip;
  btn.addEventListener('click', () => {
    copyChar(char, tip);
    showCharDetail(char, code, info);
  });
  return btn;
}

// 結果區的清空一律走這裡：遞增 renderToken 讓 renderHits() 還在排程中的
// 後續波次作廢，避免舊查詢的字塊在新狀態(清除、查無碼位、空輸入)之後
// 又冒出來。
let renderToken = 0;

function clearOutput() {
  renderToken++;
  els.output.replaceChildren();
  return renderToken;
}

// 等「目前已觸發的字型下載」告一段落，最多等 maxWait 毫秒。
// unicode-range 的 @font-face 是瀏覽器排版到用得著的字時才發請求，所以先讓
// 瀏覽器畫一幀(rAF + setTimeout，同 doSearch 的招)讓這一波字塊的字型請求
// 發出去，再輪詢 document.fonts.status 直到全部下載完或超時。
function waitFontsSettled(maxWait) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const check = () => {
      if (document.fonts.status === 'loaded' || performance.now() - t0 >= maxWait) resolve();
      else setTimeout(check, 100);
    };
    requestAnimationFrame(() => setTimeout(check, 0));
  });
}

// Chrome 的字型失效重排缺陷 workaround。實測(Chrome/macOS)：文字排版時它
// 需要的 unicode-range 切片還沒下載完的話，Chrome 先用回退鏈裡系統有的字族
// (Songti TC)畫 .notdef 方框佔位；切片到貨後本應重新排版換上真字形，但這個
// 重排並不可靠——方框會永久卡在畫面上，即使 FontFace 狀態已是 loaded。帶
// ?q= 直開時結果只渲染一次、渲染時切片必定還在下載，最容易踩中；手動輸入
// 因為每鍵重建結果區而大多免疫，這就是「分享連結打開前幾個字是方框、手動搜
// 同一批字卻正常」現象的成因。
// 卡住的字**重建文字節點、切換 font-variant 都救不活**——中毒的是 Blink 按
// 「字型描述(字族鏈+字號)」快取的回退解析結果，同一描述下怎麼重排都拿到
// 同一份壞快取，實測只有改字號(換一把快取鍵)能強迫重新解析。所以
// style.css 給所有顯示資料字的 font-size 乘上 --font-nudge 係數，這裡在
// 每批字型下載完成(loadingdone)時換一個新值。兩個細節都是實測出來的：
// (1)增量至少要 0.002——Blink 的字號快取鍵有約 1/64px 的量化，1.0001 這種
// 等級的差異(24px 上 0.0024px)會量化回同一把中毒的鍵；(2)不能在兩個值
// 之間來回翻——每個「字型還在下載時排過版」的值都可能中毒，翻回去就復發，
// 要在一圈值裡單調輪轉、永不回到起始的 1。步長 0.002、十個值一圈，最大偏差
// 2%(1.5rem 字塊差 0.5px)，肉眼與版面無感。
let fontNudgeStep = 0;
function reshapeAfterFontLoad() {
  fontNudgeStep = (fontNudgeStep % 10) + 1;
  document.documentElement.style.setProperty('--font-nudge', String(1 + fontNudgeStep * 0.002));
}
document.fonts.addEventListener('loadingdone', reshapeAfterFontLoad);

// 結果分波渲染：一次把 3000 個字塊放進 DOM，會讓瀏覽器同時對幾百個字型
// 切片(每片約 170KB，總量可達幾十 MB)發請求，全部擠在一起下載——排最前
// 面的精確命中(往往是只有全宋體才有字形的 PUA 補充字/罕見字)反而要跟
// 幾百個切片搶帶寬，看起來就是「前幾個字一直加載不出來」。改成每波
// RENDER_WAVE_SIZE 個字塊(首波約蓋滿第一屏)，等上一波觸發的字型下載完
// (或至多 RENDER_WAVE_MAX_WAIT_MS)再放下一波：結果前面的字永遠優先拿到
// 帶寬，快取全熱時 fonts.status 立即是 loaded，各波幾乎連續、感受不到分批。
function renderHits(hits, truncated) {
  const token = clearOutput();
  let i = 0;
  const appendWave = () => {
    if (token !== renderToken) return;
    const frag = document.createDocumentFragment();
    const end = Math.min(i + RENDER_WAVE_SIZE, hits.length);
    for (; i < end; i++) {
      const h = hits[i];
      const info = blockInfo(h.block);
      frag.appendChild(buildCharChip(h.char, h.code, info, `char-chip ${hitClass(h.hit)} blk-${info.cls}`));
    }
    els.output.appendChild(frag);
    if (i < hits.length) {
      waitFontsSettled(RENDER_WAVE_MAX_WAIT_MS).then(appendWave);
      return;
    }
    if (truncated) {
      const note = document.createElement('div');
      note.className = 'truncated-note';
      note.textContent = `僅顯示前 ${hits.length} 字（精確命中一定會列出）；按「查詢」看完整結果。`;
      els.output.appendChild(note);
    }
  };
  appendWave();
}

// 把 core.js exhaust() 輸出的括號嵌套文字(如「咅(立(亣一┇󰑻(亠丷)一)口)⻏」)
// 解析成節點樹。文法：字元序列，每個字元後面可選跟一組「(子拆分)」；
// 「┇」分隔同一個部件的多種拆法(一字多拆/同字異拆的內層分支)。
// 頂層的「‖」已由 getTree() 先拆成多列，這裡不會遇到。
function parseExpansion(s) {
  let i = 0;
  function parseAlts() {
    const alts = [[]];
    let cur = alts[0];
    while (i < s.length && s[i] !== ')') {
      if (s[i] === '┇') {
        cur = [];
        alts.push(cur);
        i++;
        continue;
      }
      let w = s[i++];
      const c = w.charCodeAt(0);
      if (c >= 0xD800 && c <= 0xDBFF) w += s[i++];
      const node = { char: w, alts: null };
      if (s[i] === '(') {
        i++;
        node.alts = parseAlts();
        if (s[i] === ')') i++;
      }
      cur.push(node);
    }
    return alts;
  }
  return parseAlts();
}

// 渲染成真正的「自上而下」節點樹(org-chart 風格)：巢狀 ul/li + flexbox，
// 連接線用 li 的 ::before/::after(水平軌+垂直落線)與 ul 的 ::before
// (父節點往下的落線)畫出來。同一個部件有多種內層拆法(┇)時，各拆法的
// 子節點群之間插一顆「或」節點做分隔。
function buildTreeNodes(seqAlts) {
  const ul = document.createElement('ul');
  seqAlts.forEach((seq, idx) => {
    if (idx > 0) {
      const sep = document.createElement('li');
      sep.className = 'tree-alt-sep';
      const chip = document.createElement('span');
      chip.className = 'tree-alt-chip';
      chip.textContent = '或';
      sep.appendChild(chip);
      ul.appendChild(sep);
    }
    for (const node of seq) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'tree-node';
      if (isPua(node.char.codePointAt(0))) span.classList.add('pua-char');
      span.textContent = node.char;
      li.appendChild(span);
      if (node.alts) li.appendChild(buildTreeNodes(node.alts));
      ul.appendChild(li);
    }
  });
  return ul;
}

// 一棵完整的拆分樹：根節點是字本身，text 是 getTree() 一列的展開文字。
// 「(不再分解)」是 getTree 的特殊字串，表示這個字是終端部件。
function buildSplitTree(char, text) {
  const box = document.createElement('div');
  box.className = 'split-tree';
  if (text === '(不再分解)') {
    box.classList.add('split-tree-leaf');
    box.textContent = '（終端部件，不再分解）';
    return box;
  }
  const rootUl = document.createElement('ul');
  rootUl.className = 'tree-chart';
  const rootLi = document.createElement('li');
  const rootSpan = document.createElement('span');
  rootSpan.className = 'tree-node tree-root';
  if (isPua(char.codePointAt(0))) rootSpan.classList.add('pua-char');
  rootSpan.textContent = char;
  rootLi.appendChild(rootSpan);
  rootLi.appendChild(buildTreeNodes(parseExpansion(text)));
  rootUl.appendChild(rootLi);
  box.appendChild(rootUl);
  return box;
}

// 由字元直接打開字詳情(「\字」語法、舊版 ?mode=tree 連結用)。
// core.js 的 code 編碼對 BMP 是 charCode、對輔助平面等於真實 code point
// (推導見 doc/04)，所以直接用 codePointAt 即可。
async function openDetailForChar(s) {
  const cp = s.codePointAt(0);
  if (cp === undefined) return;
  const { block } = await rpc('codepoint', { cp });
  showCharDetail(String.fromCodePoint(cp), cp, blockInfo(block));
}

// 字詳情：點一個字後，右側面板**一次列出**全部資訊，不需要再點按鈕展開——
// 大字、碼位/字源、外部字典(放頂部、做醒目)、拆分樹(多種拆法左右並排、
// 容器可橫向捲動)。PUA 補充字沒有正式碼位，外部字典查不到，以一行說明
// 代替連結。拆字功能統一在這個面板呈現，主查詢區不再有拆字分頁。
let lastDetail = null;

// 教育部異體字字典的字號直鏈(dictView 的 ID 出自對照表，直達該字號頁面)
function moeRefLink(ref) {
  const a = document.createElement('a');
  a.className = 'char-detail-link';
  a.href = `https://dict.variants.moe.edu.tw/dictView.jsp?ID=${ref.id}`;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = `教育部異體字字典 ${ref.code}`;
  return a;
}

function showCharDetail(char, code, info) {
  lastDetail = { char, code, info };
  setSideView('detail');
  setCollapsed(false);
  // keypad 跟字詳情共用同一個捲動容器(panel-body)，捲動位置會留在切換前
  // 的地方——如果使用者剛才把鍵盤捲到很下面，新詳情的頂部(關閉鈕/大字)
  // 會被捲出畫面外，看起來像沒反應。每次顯示新詳情都捲回頂部。
  els.panelBody.scrollTop = 0;
  els.charDetail.replaceChildren();

  // 詳情可以直接關掉：桌面回到部件鍵盤(側欄常駐)；手機的側欄是底部
  // 抽屜，✕ 要把抽屜整個收起，不然「關掉詳情卻換成鍵盤繼續佔半屏」
  // 會讓人覺得面板關不掉。
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'char-detail-close';
  close.textContent = '✕';
  close.dataset.tip = '關閉詳情';
  close.addEventListener('click', (e) => {
    e.stopPropagation(); // 別冒泡到側欄的「收起條點擊展開」監聽器，否則又被展開
    setSideView('keypad');
    if (isMobile()) setCollapsed(true);
  });
  els.charDetail.appendChild(close);

  const tip = chipTitle(code, info);
  const big = document.createElement('div');
  big.className = 'char-detail-char';
  if (isPua(code)) big.classList.add('pua-char');
  big.textContent = char;

  const meta = document.createElement('div');
  meta.className = 'char-detail-meta';
  meta.textContent = tip;

  els.charDetail.append(big, meta);

  // 外部字典查詢放最頂部(大字下方)，是詳情面板的主要動作。
  // 教育部異體字字典的字號對照表(見 web/data/README.md 的 moe/ 分片)是按需
  // 非同步載入的：先同步畫出不依賴它的部分，對照查回來後再補/換內容——
  // 補之前用 lastDetail 檢查使用者是否已點開別的字，是就直接丟棄這次結果。
  const detail = lastDetail;
  if (isPua(code)) {
    // PUA 補充字一般外部字典查不到，但其中四萬多字是《教育部異體字字典》
    // 的字頭，有教育部字號就能直鏈官網對應頁面
    const holder = document.createElement('div');
    els.charDetail.appendChild(holder);
    getMoeRefs(char).then((refs) => {
      if (lastDetail !== detail) return;
      const note = document.createElement('p');
      note.className = 'char-detail-note';
      if (refs) {
        // 同一字可兼具多重身份(正字/異體/附字各有字號)，逐一列出
        const links = document.createElement('div');
        links.className = 'char-detail-links';
        for (const ref of refs) links.appendChild(moeRefLink(ref));
        note.textContent = '此字尚未正式編碼，暫用私有造字區(PUA)碼位，一般外部字典查不到；但它是《教育部異體字字典》的字頭，可由字號直達官網：';
        holder.append(note, links);
      } else {
        note.textContent = '此字尚未正式編碼，目前暫用私有造字區(PUA)碼位，外部字典無法以碼位查詢，故不提供連結。';
        holder.appendChild(note);
      }
    });
  } else {
    const links = document.createElement('div');
    links.className = 'char-detail-links';
    let moeAnchor = null;
    for (const dict of EXTERNAL_DICTS) {
      const a = document.createElement('a');
      a.className = 'char-detail-link';
      a.href = dict.url(char);
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = dict.name;
      links.appendChild(a);
      if (dict.moe) moeAnchor = a;
    }
    els.charDetail.appendChild(links);
    // 已編碼字：查到字號就把泛用的「以字搜尋」連結原地換成字號直鏈，
    // 比搜尋更精準(搜尋同形字可能命中多筆或失敗)；查不到就維持原連結
    getMoeRefs(char).then((refs) => {
      if (lastDetail !== detail || !refs) return;
      moeAnchor.replaceWith(...refs.map(moeRefLink));
    });
  }

  // 拆分樹：尊重「同字異拆」選項(對應 AGENTS.md 黃金案例的 \主 行為)——
  // 未勾選只畫第一種拆法，但提示還有幾種；勾選則全部左右並排。
  // 拆分資料在 worker 側，非同步取回；比照上面 moe 對照的模式，回來後用
  // lastDetail 檢查使用者是否已點開別的字，是就直接丟棄這次結果。
  const d = els.subdivide.checked;
  rpc('tree', { char }).then(({ trees: all }) => {
    if (lastDetail !== detail) return;
    const trees = d ? all : all.slice(0, 1);
    if (!trees.length) return;
    const label = document.createElement('div');
    label.className = 'char-detail-label';
    label.textContent = all.length > 1 ? `拆分（${all.length} 種拆法）` : '拆分';
    els.charDetail.appendChild(label);
    const wrap = document.createElement('div');
    wrap.className = 'split-trees';
    for (const t of trees) wrap.appendChild(buildSplitTree(char, t.text));
    els.charDetail.appendChild(wrap);
    if (!d && all.length > 1) {
      const note = document.createElement('p');
      note.className = 'char-detail-note';
      note.textContent = `另有 ${all.length - 1} 種拆法，勾選「同字異拆」可全部顯示。`;
      els.charDetail.appendChild(note);
    }
  });
}

// 即時 tooltip：原生 title 有內建約一秒的顯示延遲且無法調整，改用事件委託
// 的浮層，滑鼠移上去立刻顯示。位置定在字塊上方置中，貼近視窗邊緣時夾回來。
function setupTooltip() {
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest?.('[data-tip]');
    if (!target) {
      els.tooltip.classList.remove('show');
      return;
    }
    els.tooltip.textContent = target.dataset.tip;
    els.tooltip.classList.add('show');
    const r = target.getBoundingClientRect();
    const tr = els.tooltip.getBoundingClientRect();
    const x = Math.min(Math.max(4, r.left + r.width / 2 - tr.width / 2), window.innerWidth - tr.width - 4);
    const y = r.top - tr.height - 6;
    els.tooltip.style.left = `${x}px`;
    els.tooltip.style.top = `${y < 4 ? r.bottom + 6 : y}px`;
  });
}

let toastTimer;
function copyChar(ch, tip) {
  navigator.clipboard?.writeText(ch).catch(() => {});
  els.toast.textContent = tip ? `已複製「${ch}」 · ${tip}` : `已複製「${ch}」`;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1200);
}

// 圖例只做顏色說明，不再是可點的分區篩選——所有區塊一律同時查詢
// (相容區除外，見 DEFAULT_FLAGS 的註解)。
function buildLegend() {
  els.legend.replaceChildren();
  for (const b of BLOCKS) {
    if (b.cls === 'cmp') continue;
    const item = document.createElement('span');
    item.className = `legend-chip blk-${b.cls}`;
    item.dataset.tip = b.desc;
    const dot = document.createElement('span');
    dot.className = 'legend-dot';
    item.append(dot, document.createTextNode(b.label));
    els.legend.appendChild(item);
  }
}

// 所有分類一次全部列出，不切換分頁。每個分類是一條 flex-wrap 的「文字流」：
// 分類名稱做成行內的小標籤，後面直接跟著該分類全部按鍵，讓內容盡量密集地
// 折行往下排，配合較小的按鍵尺寸，一屏能看到的部件數量最大化。
function buildKeypad(categories) {
  els.keypadGrid.replaceChildren();
  const frag = document.createDocumentFragment();
  for (const cat of categories) {
    const section = document.createElement('div');
    section.className = 'keypad-cat';

    const title = document.createElement('span');
    title.className = 'keypad-cat-name';
    title.textContent = cat.name;
    section.appendChild(title);

    for (const ch of cat.rows.flat()) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'keypad-key';
      if (isPua(ch.codePointAt(0))) btn.classList.add('pua-char');
      btn.textContent = ch;
      btn.addEventListener('click', () => {
        insertAtCursor(els.input, ch);
        scheduleLiveSearch();
      });
      section.appendChild(btn);
    }
    frag.appendChild(section);
  }
  els.keypadGrid.appendChild(frag);
}

let composing = false;
let liveTimer;
let searchToken = 0;

function showBusy(el, text) {
  const spin = document.createElement('span');
  spin.className = 'spinner';
  el.replaceChildren(spin, document.createTextNode(text));
}

function doSearch(max, { settle = false, sync = true } = {}) {
  const raw = els.input.value;
  if (sync) syncUrl(settle);
  const token = ++searchToken;
  if (!raw) {
    els.counter.textContent = '';
    clearOutput();
    return;
  }
  // 比對在 worker 執行緒跑(見頂部的 rpc)，主執行緒不會被凍住，spinner
  // 能正常轉；token 用來作廢過期的檢索回覆(使用者又打了字/清除/回退)。
  showBusy(els.counter, '檢索中…');
  runMatch(raw, max, token);
}

// 「檢索碼位」：整個輸入若是碼位寫法——U+4E00 / u+f0200 / 0x4E00 帶前綴，
// 或 4~6 位裸十六進位(如 4E00、F0200)——改走碼位查詢，不做部件比對。
// 裸十六進位不會跟部件查詢衝突：十六進位裡的 ASCII 字母與數字本來就不是
// 部件，這種輸入在部件查詢下只會得到空結果(A~F 還會被當成區塊旗標)。
// 前綴後的「+」也接受空格——手打分享連結 ?q=U+4E00 時「+」會被網址解碼成空格。
function parseCodepointQuery(raw) {
  const s = raw.trim();
  const m = s.match(/^(?:[Uu][+ ]?|[Xx][+ ]|0[Xx])([0-9A-Fa-f]{1,6})$/) || s.match(/^([0-9A-Fa-f]{4,6})$/);
  if (!m) return null;
  const cp = parseInt(m[1], 16);
  return cp <= 0x10FFFF ? cp : null;
}

// 碼位查詢的結果呈現：命中已收錄字(含 PUA 補充字與部件)時列出單一字塊；
// jump=true(按查詢/Enter/分享連結的完整查詢)時直接打開字詳情——即時查詢
// 的逐鍵更新不跳詳情，不然桌面上面板會隨打字亂切、手機上底部抽屜會彈出來
// 跟系統鍵盤互頂(setCollapsed(false) 會讓輸入框失焦)。
// 「已收錄」的判定：getIndex() 能換算出下標，且該 dt 條目的字頭就是這個字。
// 下標 1~10 是 A~J 旗標的保留列，不是真的字，排除；11~48 的保留列是鍵盤
// 部件(⺀、㇀ 之類)，屬於可查詢的合法目標。
async function renderCodepointResult(cp, token, jump) {
  const label = `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
  const { known, block } = await rpc('codepoint', { cp });
  if (token !== searchToken) return;
  if (!known) {
    clearOutput();
    els.counter.textContent = `碼位 ${label} 不在收錄範圍`;
    return;
  }
  const char = String.fromCodePoint(cp);
  const info = blockInfo(block);
  renderHits([{ char, code: cp, hit: 0, block }], false);
  els.counter.textContent = info.cls === 'sup'
    ? `碼位 ${label} → 「${char}」（補充字，暫用私有碼位）`
    : `碼位 ${label} → 「${char}」（${info.label}）`;
  if (jump) showCharDetail(char, cp, info);
}

// 「檢索字號」：整個輸入若是教育部異體字字典字號——A02353(正字)或
// A02353-004(異體/附字，後綴須照官方零埋 3 位)——改走字號反查，不做部件
// 比對。與裸十六進位碼位查詢零衝突：[A-C]開頭加 5 位數字若當十六進位讀
// 必然 > 0x10FFFF，parseCodepointQuery() 會回 null；N 不是十六進位字母。
// 裸正字號列出整個字族(正字＋全部異體/附字)，帶後綴的字號只列該字。
function parseMoeCodeQuery(raw) {
  const m = raw.trim().match(/^([ABCNabcn])(\d{5})((?:-\d{1,3}){0,2})$/);
  return m ? `${m[1].toUpperCase()}${m[2]}${m[3]}` : null;
}

// 字號查詢的結果呈現。反查表是按需非同步載入的，回來後用 token 檢查這次
// 查詢是否已過期(使用者又打了字)。jump 的行為比照碼位查詢：確認查詢才
// 打開字詳情(裸正字號開正字的詳情)，即時查詢的逐鍵更新不跳。
async function renderMoeCodeResult(code, token, jump) {
  const res = await findMoeCode(code);
  if (token !== searchToken) return;
  const isZheng = code.length === 6; // 無後綴 = 正字號
  const found = res && (isZheng ? res.family.length > 0 : res.exact !== null);
  if (!found) {
    clearOutput();
    els.counter.textContent = `字號 ${code} 查無此字`;
    return;
  }
  // 少數字族(24/29920)裡同一個字掛兩個字號(官方同形字)，字塊去重顯示——
  // 點開詳情時正向表本來就會列出該字的全部字號
  const seen = new Set();
  const list = (isZheng ? res.family : [res.exact]).filter(({ char }) => !seen.has(char) && seen.add(char));
  const cps = list.map(({ char }) => char.codePointAt(0));
  const { blocks } = await rpc('blocks', { cps });
  if (token !== searchToken) return;
  renderHits(list.map(({ char }, idx) => ({ char, code: cps[idx], hit: 0, block: blocks[idx] })), false);
  const zhengChar = list[0].char;
  els.counter.textContent = isZheng
    ? `字號 ${code} → 「${zhengChar}」字族共 ${list.length} 字`
    : `字號 ${code} → 「${res.exact.char}」`;
  // 裸正字號跳正字的詳情、帶後綴跳該字——兩種情況都是 list[0]
  if (jump) showCharDetail(zhengChar, cps[0], blockInfo(blocks[0]));
}

async function runMatch(raw, max, token) {
  const cp = parseCodepointQuery(raw);
  if (cp !== null) {
    renderCodepointResult(cp, token, max >= FULL_MAX_RESULTS);
    return;
  }
  const moeCode = parseMoeCodeQuery(raw);
  if (moeCode !== null) {
    renderMoeCodeResult(moeCode, token, max >= FULL_MAX_RESULTS);
    return;
  }
  const d = els.subdivide.checked;
  const v = els.variant.checked;
  const u = els.ucodeOnly.checked;
  const query = hasBlockFlag(raw) ? raw : DEFAULT_FLAGS + raw;
  // elapsed 由 worker 量測，只含純比對時間，與原本主執行緒同步計算的口徑一致
  const { hits, elapsed } = await rpc('match', { query, v, d, u, max });
  if (token !== searchToken) return;
  // 精確命中排到最前面(如「木木」的「林」)；其餘維持拆分表原順序。
  // 這是 UI 層的顯示排序，不動 core.js 的比對結果本身。
  const ordered = [...hits.filter((h) => h.hit === 0), ...hits.filter((h) => h.hit !== 0)];
  const truncated = ordered.length > max;
  const shown = truncated ? ordered.filter((h, i) => h.hit === 0 || i < max) : ordered;
  renderHits(shown, truncated);
  const secs = (elapsed / 1000).toFixed(3);
  // core.js getMatch() 沿用 legacy 的 `out.length <= m` 哨兵設計：模糊命中
  // 最多收到 m+1 條，多出的一條只用來偵測「超過上限」。所以截斷時不能把
  // hits.length 當總數顯示(那只是被截斷的列表長度，恆為 501 之類)，要照
  // legacy 顯示「超過 m 字」。
  els.counter.textContent = truncated
    ? `「${raw}」超過 ${max} 字（${secs} 秒）`
    : `「${raw}」總計 ${hits.length} 字（${secs} 秒）`;
}

function runSearch() {
  clearTimeout(liveTimer); // 取消排程中的即時查詢，避免完整結果出來後又被蓋掉
  doSearch(FULL_MAX_RESULTS, { settle: true });
}

function scheduleLiveSearch() {
  if (!els.live.checked || composing) return;
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => doSearch(LIVE_MAX_RESULTS), LIVE_DEBOUNCE_MS);
}

// 部首名稱自動完成：輸入尾端若是某個名稱的開頭(「三」「三點」⊂「三點水」)，
// 在輸入框下方浮出候選清單，點擊或按 Tab 完成(↑↓ 選擇、Esc 關閉)。
// 名稱總共就百來個，1 個字就開始提示；但「木」「三」這類字本身就是
// 合法部件，所以尾端只匹配到 1 個字時，把「直接用這個字」放在第一位
// 當預設項——Tab 只會關掉候選繼續用原字，不會被劫持成轉換。
let suggestItems = [];
let suggestActive = 0;

function updateSuggestions() {
  const v = els.input.value;
  const found = [];
  for (const [name, ch] of RADICAL_ENTRIES) {
    // 找輸入尾端與名稱開頭的最長重疊(不含整個名稱——完整名稱已被自動轉換)
    for (let k = Math.min(name.length - 1, v.length); k >= 1; k--) {
      if (name.startsWith(v.slice(v.length - k))) {
        found.push({ name, ch, k });
        break;
      }
    }
  }
  found.sort((a, b) => b.k - a.k || a.name.localeCompare(b.name));
  // 同一部件常有多個名稱命中(簡繁拼寫、別名)，同一個目標部件只留一項
  const seen = new Set();
  suggestItems = found.filter((it) => !seen.has(it.ch) && seen.add(it.ch)).slice(0, 6);
  // 尾端只匹配到 1 個字：該字本身可能就是要找的部件，字面選項排第一；
  // 目標部件跟原字相同的名稱項(「木字旁」→木)沒有資訊量，一併濾掉
  if (suggestItems.length && suggestItems[0].k === 1) {
    const tail = v.slice(-1);
    suggestItems = suggestItems.filter((it) => it.ch !== tail);
    suggestItems.unshift({ name: `直接用「${tail}」`, ch: tail, k: 1, literal: true });
    suggestItems = suggestItems.slice(0, 7);
  }
  renderSuggestions();
}

function renderSuggestions() {
  suggestActive = 0;
  if (!suggestItems.length) {
    els.suggest.hidden = true;
    els.suggest.replaceChildren();
    return;
  }
  els.suggest.replaceChildren();
  suggestItems.forEach((it, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'suggest-item' + (idx === 0 ? ' active' : '');
    const name = document.createElement('span');
    name.textContent = it.name;
    const chSpan = document.createElement('span');
    chSpan.className = 'suggest-char';
    if (isPua(it.ch.codePointAt(0))) chSpan.classList.add('pua-char');
    chSpan.textContent = it.ch;
    btn.append(name, chSpan);
    // mousedown 會把焦點從輸入框搶走，preventDefault 保住焦點再處理點擊
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', () => acceptSuggestion(idx));
    els.suggest.appendChild(btn);
  });
  const hint = document.createElement('div');
  hint.className = 'suggest-hint';
  hint.textContent = 'Tab 完成 · ↑↓ 選擇 · Esc 關閉';
  els.suggest.appendChild(hint);
  els.suggest.hidden = false;
}

function highlightSuggestion(idx) {
  suggestActive = (idx + suggestItems.length) % suggestItems.length;
  els.suggest.querySelectorAll('.suggest-item').forEach((el, i) => {
    el.classList.toggle('active', i === suggestActive);
  });
}

function acceptSuggestion(idx) {
  const it = suggestItems[idx];
  if (!it) return;
  if (it.literal) {
    // 字面選項：輸入本來就是這個字，收起候選即可
    hideSuggestions();
    return;
  }
  const v = els.input.value;
  els.input.value = v.slice(0, v.length - it.k) + it.ch;
  hideSuggestions();
  scheduleLiveSearch();
}

function hideSuggestions() {
  suggestItems = [];
  els.suggest.hidden = true;
  els.suggest.replaceChildren();
}

// 偏旁口語名稱自動轉換：偵測輸入裡的「三點水」「豎心旁」等名稱(見
// radicals.js)，替換成對應部件並以 toast 回饋。IME 組字中不執行——
// 名稱通常在 compositionend 整詞上屏後才完整出現。
function convertRadicalNames() {
  let v = els.input.value;
  const done = [];
  for (const [name, ch] of RADICAL_ENTRIES) {
    if (v.includes(name)) {
      v = v.replaceAll(name, ch);
      done.push(`${name}→${ch}`);
    }
  }
  if (!done.length) return;
  els.input.value = v;
  els.toast.textContent = `已轉換 ${done.join('、')}`;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1600);
}

function clearInput() {
  searchToken++; // 作廢排程中的檢索，避免清除後結果又冒出來
  hideSuggestions();
  els.input.value = '';
  els.counter.textContent = '';
  clearOutput();
  els.input.focus();
  syncUrl(false);
}

async function main() {
  buildLegend();
  setupTooltip();
  showBusy(els.status, '資料載入中（約 4MB，第一次開啟需要一點時間）…');
  try {
    // 資料載入與 matcher 建立都在 worker 側(見 worker.js)，這裡只拿
    // 鍵盤佈局(kt)與載入耗時回來
    const { kt, ms } = await rpc('init');
    buildKeypad(parseKeypad(kt));
    els.status.textContent = `資料載入完成（${ms} ms）`;
  } catch (err) {
    els.status.textContent = `資料載入失敗：${err.message}`;
    return;
  }

  els.search.addEventListener('click', runSearch);
  // 選項變更立即反映到網址(replace)並重跑即時查詢；
  // 「同字異拆」同時刷新開著的字詳情(拆分樹的數量跟著這個選項變)
  for (const el of [els.variant, els.subdivide, els.ucodeOnly]) {
    el.addEventListener('change', () => {
      syncUrl(false);
      scheduleLiveSearch();
      if (el === els.subdivide && lastDetail && els.sidePanel.dataset.view === 'detail') {
        showCharDetail(lastDetail.char, lastDetail.code, lastDetail.info);
      }
    });
  }
  window.addEventListener('popstate', applyStateFromUrl);
  // 「\字」語法已移除——查到字後直接點字塊就能看拆分詳情，語法冗餘；
  // 舊版 ?mode=tree 分享連結仍由 applyStateFromUrl() 相容處理。
  els.input.addEventListener('input', () => {
    if (!composing) {
      convertRadicalNames();
      updateSuggestions();
    }
    scheduleLiveSearch();
  });
  // 使用者把焦點放回輸入框：桌面自動切回部件鍵盤(字詳情要看時再點字塊)；
  // 手機上系統輸入法鍵盤即將彈出，底部抽屜自動收起讓位，
  // 避免兩個「鍵盤」同時佔滿下半屏。
  els.input.addEventListener('focus', () => {
    if (isMobile()) setCollapsed(true);
    else setSideView('keypad');
  });
  els.input.addEventListener('compositionstart', () => { composing = true; });
  els.input.addEventListener('compositionend', () => {
    composing = false;
    convertRadicalNames();
    updateSuggestions();
    scheduleLiveSearch();
  });
  els.input.addEventListener('blur', () => hideSuggestions());
  els.input.addEventListener('keydown', (e) => {
    // 自動完成候選開著時，Tab/↑↓/Esc 先給候選清單用
    if (suggestItems.length) {
      if (e.key === 'Tab') {
        e.preventDefault();
        acceptSuggestion(suggestActive);
        return;
      }
      if (e.key === 'ArrowDown') { e.preventDefault(); highlightSuggestion(suggestActive + 1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); highlightSuggestion(suggestActive - 1); return; }
      if (e.key === 'Escape') { hideSuggestions(); return; }
    }
    if (e.key === 'Enter') {
      hideSuggestions();
      clearTimeout(liveTimer);
      runSearch();
    }
    if (e.key === 'Escape') clearInput();
  });
  els.clear.addEventListener('click', clearInput);
  els.sideTabKeypad.addEventListener('click', () => setSideView('keypad'));
  els.sideTabDetail.addEventListener('click', () => setSideView('detail'));
  // 展開時只有「收起」小按鈕會觸發收合(面板本體是鍵盤,不能整塊都是開關)；
  // 收起後剩下的小條整塊都可以點擊展開。
  els.togglePanel.addEventListener('click', (e) => {
    e.stopPropagation();
    setCollapsed(!els.sidePanel.classList.contains('collapsed'));
  });
  els.sidePanel.addEventListener('click', () => {
    if (els.sidePanel.classList.contains('collapsed')) setCollapsed(false);
  });
  // 手機(窄螢幕)上鍵盤是底部抽屜，預設收起，要用時再點開
  if (window.matchMedia('(max-width: 60rem)').matches) setCollapsed(true);
  // 先 focus 再還原 URL 狀態——focus 會把右側切回鍵盤，
  // 順序反了會蓋掉舊版 ?mode=tree 連結剛打開的字詳情
  els.input.focus();
  // 開啟分享連結時，還原 ?q=…&v/d/u 狀態並直接執行查詢
  applyStateFromUrl();
}

main();
