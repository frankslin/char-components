import { loadData } from './data.js';
import { createMatcher } from './core.js';
import { parseKeypad } from './keypad.js';
import { BLOCKS, blockInfo } from './blocks.js';

const LIVE_MAX_RESULTS = 500;
const FULL_MAX_RESULTS = 3000;
const LIVE_DEBOUNCE_MS = 120;

// 外部字典：字詳情面板會把全部連結一次列出(PUA 補充字除外——沒有正式碼位，
// 外部字典查不到)。字統網是 legacy 版預設的 `ref`；其餘 URL 格式都驗證過
// 可直接以字(或碼位)查詢——國學大師的格式出自其官方說明頁(站點有地區
// 連線限制，未能直接實測)。Unihan 是 Unicode 官方資料庫，再罕見的正式
// 編碼字都有記錄，對擴充區生僻字特別有用。
const EXTERNAL_DICTS = [
  { name: '字統網', url: (ch) => `https://zi.tools/zi/${encodeURIComponent(ch)}` },
  { name: '漢典', url: (ch) => `https://www.zdic.net/hans/${encodeURIComponent(ch)}` },
  { name: '教育部異體字字典', url: (ch) => `https://dict.variants.moe.edu.tw/search.jsp?QTP=0&WORD=${encodeURIComponent(ch)}` },
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
};

// 側欄「收起/展開」：跟 setSideView 一樣拉到模組層級，因為點字塊觸發的
// showCharDetail() 也需要在使用者收起面板時自動展開，讓詳情看得到。
function setCollapsed(collapsed) {
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
  if (els.subdivide.checked) p.set('d', '1');
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
  els.subdivide.checked = p.get('d') === '1';
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
    els.output.replaceChildren();
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

// 插入字元到目前游標位置（覆蓋選取範圍），並讓輸入框保持焦點與正確的游標位置。
// selectionStart/selectionEnd 本來就是以 UTF-16 code unit 計算，
// 跟原版手刻的 surrogate pair 位移邏輯效果相同，不需要另外處理。
function insertAtCursor(el, text) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  el.value = el.value.slice(0, start) + text + el.value.slice(end);
  const pos = start + text.length;
  el.focus();
  el.setSelectionRange(pos, pos);
}

// 每個字塊是「本體按鈕 + hover 才浮現的小工具列」組成的 wrap：
// 直接點字塊＝預設動作(複製)；hover 出現的工具列可以另外選「拆字查詢」
// (切到拆字分頁查這個字)或「查字典」(開 zi.tools 新分頁)。三種動作都會
// 同時把右側面板切到「字詳情」顯示這個字的碼位/拆分/快速動作——
// 觸控裝置沒有 hover，摸不到工具列，但字詳情面板裡有同樣的三顆按鈕可用。
function buildCharChip(char, code, info, chipClass) {
  const wrap = document.createElement('span');
  wrap.className = 'chip-wrap';

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

  const actions = document.createElement('div');
  actions.className = 'chip-actions';
  actions.appendChild(
    buildChipAction('⧉', '複製', () => {
      copyChar(char, tip);
      showCharDetail(char, code, info);
    }),
  );
  // PUA 補充字沒有正式碼位，外部字典查不到，不提供字典入口
  if (!isPua(code)) {
    actions.appendChild(buildChipAction('典', `查${EXTERNAL_DICTS[0].name}`, () => {
      showCharDetail(char, code, info);
      window.open(EXTERNAL_DICTS[0].url(char), '_blank', 'noopener');
    }));
  }
  wrap.append(btn, actions);
  return wrap;
}

function buildChipAction(label, tip, fn) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip-action';
  b.textContent = label;
  b.dataset.tip = tip;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    fn();
  });
  return b;
}

function renderHits(hits, truncated) {
  els.output.replaceChildren();
  const frag = document.createDocumentFragment();
  for (const h of hits) {
    const info = blockInfo(h.block);
    frag.appendChild(buildCharChip(h.char, h.code, info, `char-chip ${hitClass(h.hit)} blk-${info.cls}`));
  }
  els.output.appendChild(frag);
  if (truncated) {
    const note = document.createElement('div');
    note.className = 'truncated-note';
    note.textContent = `僅顯示前 ${hits.length} 字（精確命中一定會列出）；按「查詢」看完整結果。`;
    els.output.appendChild(note);
  }
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
function openDetailForChar(s) {
  const cp = s.codePointAt(0);
  if (cp === undefined) return;
  const char = String.fromCodePoint(cp);
  showCharDetail(char, cp, blockInfo(matcher.getBlock(cp)));
}

// 字詳情：點一個字後，右側面板**一次列出**全部資訊，不需要再點按鈕展開——
// 大字、碼位/字源、外部字典(放頂部、做醒目)、拆分樹(多種拆法左右並排、
// 容器可橫向捲動)。PUA 補充字沒有正式碼位，外部字典查不到，以一行說明
// 代替連結。拆字功能統一在這個面板呈現，主查詢區不再有拆字分頁。
let lastDetail = null;

function showCharDetail(char, code, info) {
  lastDetail = { char, code, info };
  setSideView('detail');
  setCollapsed(false);
  els.charDetail.replaceChildren();

  // 詳情可以直接關掉，關掉後回到部件鍵盤(部首表)
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'char-detail-close';
  close.textContent = '✕';
  close.dataset.tip = '關閉詳情，回到部件鍵盤';
  close.addEventListener('click', () => setSideView('keypad'));
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

  // 外部字典查詢放最頂部(大字下方)，是詳情面板的主要動作
  if (isPua(code)) {
    const note = document.createElement('p');
    note.className = 'char-detail-note';
    note.textContent = '此字尚未正式編碼，目前暫用私有造字區(PUA)碼位，外部字典無法以碼位查詢，故不提供連結。';
    els.charDetail.appendChild(note);
  } else {
    const links = document.createElement('div');
    links.className = 'char-detail-links';
    for (const dict of EXTERNAL_DICTS) {
      const a = document.createElement('a');
      a.className = 'char-detail-link';
      a.href = dict.url(char);
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = dict.name;
      links.appendChild(a);
    }
    els.charDetail.appendChild(links);
  }

  // 拆分樹：尊重「同字異拆」選項(對應 AGENTS.md 黃金案例的 \主 行為)——
  // 未勾選只畫第一種拆法，但提示還有幾種；勾選則全部左右並排。
  const d = els.subdivide.checked;
  const all = matcher.getTree(char, true);
  const trees = d ? all : all.slice(0, 1);
  if (trees.length) {
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
  }
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

let matcher;
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
    els.output.replaceChildren();
    return;
  }
  // 比對是同步計算、會佔住主執行緒，直接跑的話 spinner 根本畫不出來。
  // 先顯示「檢索中」，等瀏覽器畫完這一幀(rAF + setTimeout)再開始算；
  // token 用來作廢已排程但過期的檢索(使用者又打了字/清除/回退)。
  showBusy(els.counter, '檢索中…');
  requestAnimationFrame(() => setTimeout(() => {
    if (token !== searchToken) return;
    runMatch(raw, max);
  }, 0));
}

function runMatch(raw, max) {
  const d = els.subdivide.checked;
  const start = performance.now();
  const v = els.variant.checked;
  const u = els.ucodeOnly.checked;
  const query = hasBlockFlag(raw) ? raw : DEFAULT_FLAGS + raw;
  const hits = matcher.getMatch(query, v, d, u, max);
  // 精確命中排到最前面(如「木木」的「林」)；其餘維持拆分表原順序。
  // 這是 UI 層的顯示排序，不動 core.js 的比對結果本身。
  const ordered = [...hits.filter((h) => h.hit === 0), ...hits.filter((h) => h.hit !== 0)];
  const truncated = ordered.length > max;
  const shown = truncated ? ordered.filter((h, i) => h.hit === 0 || i < max) : ordered;
  renderHits(shown, truncated);
  const elapsed = ((performance.now() - start) / 1000).toFixed(3);
  els.counter.textContent = `「${raw}」總計 ${hits.length} 字（${elapsed} 秒）`;
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

function clearInput() {
  searchToken++; // 作廢排程中的檢索，避免清除後結果又冒出來
  els.input.value = '';
  els.counter.textContent = '';
  els.output.replaceChildren();
  els.input.focus();
  syncUrl(false);
}

async function main() {
  buildLegend();
  setupTooltip();
  showBusy(els.status, '資料載入中（約 4MB，第一次開啟需要一點時間）…');
  const t0 = performance.now();
  try {
    const { dt, rt, vt, kt } = await loadData('./data/');
    matcher = createMatcher(dt, rt, vt);
    buildKeypad(parseKeypad(kt));
  } catch (err) {
    els.status.textContent = `資料載入失敗：${err.message}`;
    return;
  }
  const ms = (performance.now() - t0).toFixed(0);
  els.status.textContent = `資料載入完成（${ms} ms）`;

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
  els.input.addEventListener('input', () => {
    // 沿用 legacy 版的「\字」語法：「\」後面跟一個字＝直接開那個字的字詳情
    // (拆字已統一併入字詳情面板)。IME 組字中不觸發，避免吃掉組字過程。
    if (!composing && els.input.value.startsWith('\\')) {
      const rest = els.input.value.slice(1);
      if (rest) {
        els.input.value = rest;
        openDetailForChar(rest);
      }
    }
    scheduleLiveSearch();
  });
  // 使用者把焦點放回輸入框＝要繼續組部件了，右側自動切回部件鍵盤；
  // 字詳情要看時再點字塊就會回來。
  els.input.addEventListener('focus', () => setSideView('keypad'));
  els.input.addEventListener('compositionstart', () => { composing = true; });
  els.input.addEventListener('compositionend', () => {
    composing = false;
    scheduleLiveSearch();
  });
  els.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
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
