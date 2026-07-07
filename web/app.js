import { loadData } from './data.js';
import { createMatcher } from './core.js';
import { parseKeypad } from './keypad.js';
import { BLOCKS, blockInfo } from './blocks.js';

const LIVE_MAX_RESULTS = 500;
const FULL_MAX_RESULTS = 3000;
const LIVE_DEBOUNCE_MS = 120;

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
  tabSearch: document.getElementById('tab-search'),
  tabTree: document.getElementById('tab-tree'),
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
};

// 兩種查詢模式各自記住輸入內容，切換分頁時互不干擾。
// 拆字模式對應 legacy 版的「\字」語法；在部件查字模式輸入「\」會自動切過去。
const MODE = {
  search: { placeholder: '輸入部件，例如「日月」', value: '' },
  tree: { placeholder: '輸入單一漢字，例如「明」，列出它的拆分樹', value: '' },
};
let mode = 'search';

function setMode(next, { silent = false } = {}) {
  if (mode === next) return;
  MODE[mode].value = els.input.value;
  mode = next;
  els.tabSearch.classList.toggle('active', mode === 'search');
  els.tabTree.classList.toggle('active', mode === 'tree');
  els.tabSearch.setAttribute('aria-selected', String(mode === 'search'));
  els.tabTree.setAttribute('aria-selected', String(mode === 'tree'));
  document.querySelectorAll('.options [data-mode]').forEach((el) => {
    el.hidden = el.dataset.mode !== mode;
  });
  els.input.placeholder = MODE[mode].placeholder;
  els.input.value = MODE[mode].value;
  els.counter.textContent = '';
  els.output.replaceChildren();
  if (silent) return; // 由 URL 還原時(popstate/初次載入)，由呼叫端負責後續
  els.input.focus();
  syncUrl(false);
  if (els.input.value) scheduleLiveSearch();
}

// 查詢狀態 ↔ URL query string，讓連結可以直接分享。
// 選項只在偏離預設值時才寫進網址，保持乾淨。
function stateToParams() {
  const p = new URLSearchParams();
  if (els.input.value) p.set('q', els.input.value);
  if (mode === 'tree') p.set('mode', 'tree');
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
  const m = p.get('mode') === 'tree' ? 'tree' : 'search';
  setMode(m, { silent: true });
  const q = p.get('q') ?? '';
  els.input.value = q;
  MODE[m].value = q;
  clearTimeout(liveTimer);
  urlSettled = true;
  if (q) {
    doSearch(FULL_MAX_RESULTS, { sync: false });
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

function renderHits(hits, truncated) {
  els.output.replaceChildren();
  const frag = document.createDocumentFragment();
  for (const h of hits) {
    const info = blockInfo(h.block);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `char-chip ${hitClass(h.hit)} blk-${info.cls}`;
    if (isPua(h.code)) btn.classList.add('pua-char');
    btn.textContent = h.char;
    btn.dataset.tip = chipTitle(h.code, info);
    btn.addEventListener('click', () => copyChar(h.char, btn.dataset.tip));
    frag.appendChild(btn);
  }
  els.output.appendChild(frag);
  if (truncated) {
    const note = document.createElement('div');
    note.className = 'truncated-note';
    note.textContent = `僅顯示前 ${hits.length} 字（精確命中一定會列出）；按「查詢」看完整結果。`;
    els.output.appendChild(note);
  }
}

function renderTree(nodes) {
  els.output.replaceChildren();
  const frag = document.createDocumentFragment();
  for (const n of nodes) {
    const row = document.createElement('div');
    row.className = 'tree-row';
    const info = blockInfo(matcher.getBlock(n.code));
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `char-chip hit-exact blk-${info.cls}`;
    if (isPua(n.code)) chip.classList.add('pua-char');
    chip.textContent = n.char;
    chip.dataset.tip = chipTitle(n.code, info);
    chip.addEventListener('click', () => copyChar(n.char, chip.dataset.tip));
    const text = document.createElement('span');
    text.className = 'tree-text';
    text.textContent = n.text;
    row.append(chip, text);
    frag.appendChild(row);
  }
  els.output.appendChild(frag);
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
  if (mode === 'tree') {
    const nodes = matcher.getTree(raw, d);
    renderTree(nodes);
    els.counter.textContent = `「${raw}」共 ${nodes.length} 種拆法`;
    return;
  }
  const start = performance.now();
  const v = els.variant.checked;
  const u = els.ucodeOnly.checked;
  const query = hasBlockFlag(raw) ? raw : DEFAULT_FLAGS + raw;
  const hits = matcher.getMatch(query, v, d, u, max);
  const truncated = hits.length > max;
  const shown = truncated ? hits.filter((h) => h.hit === 0 || hits.indexOf(h) < max) : hits;
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

  els.tabSearch.addEventListener('click', () => setMode('search'));
  els.tabTree.addEventListener('click', () => setMode('tree'));
  els.search.addEventListener('click', runSearch);
  // 選項變更立即反映到網址(replace)並重跑即時查詢
  for (const el of [els.variant, els.subdivide, els.ucodeOnly]) {
    el.addEventListener('change', () => {
      syncUrl(false);
      scheduleLiveSearch();
    });
  }
  window.addEventListener('popstate', applyStateFromUrl);
  els.input.addEventListener('input', () => {
    // 沿用 legacy 版的「\字」語法：在部件查字模式打「\」自動切到拆字分頁。
    if (mode === 'search' && els.input.value.startsWith('\\')) {
      const rest = els.input.value.slice(1);
      els.input.value = '';
      setMode('tree');
      els.input.value = rest;
    }
    scheduleLiveSearch();
  });
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
  // 展開時只有「收起」小按鈕會觸發收合(面板本體是鍵盤,不能整塊都是開關)；
  // 收起後剩下的小條整塊都可以點擊展開。
  const setCollapsed = (collapsed) => {
    els.sidePanel.classList.toggle('collapsed', collapsed);
    document.body.classList.toggle('panel-collapsed', collapsed);
    els.togglePanel.textContent = collapsed ? '展開' : '收起';
  };
  els.togglePanel.addEventListener('click', (e) => {
    e.stopPropagation();
    setCollapsed(!els.sidePanel.classList.contains('collapsed'));
  });
  els.sidePanel.addEventListener('click', () => {
    if (els.sidePanel.classList.contains('collapsed')) setCollapsed(false);
  });
  // 手機(窄螢幕)上鍵盤是底部抽屜，預設收起，要用時再點開
  if (window.matchMedia('(max-width: 60rem)').matches) setCollapsed(true);
  // 開啟分享連結時，還原 ?q=…&mode=…&v/d/u 狀態並直接執行查詢
  applyStateFromUrl();
  els.input.focus();
}

main();
