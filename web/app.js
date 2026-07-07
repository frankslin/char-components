import { loadData } from './data.js';
import { createMatcher } from './core.js';
import { parseKeypad } from './keypad.js';
import { BLOCKS, blockInfo } from './blocks.js';

const LIVE_MAX_RESULTS = 100;
const FULL_MAX_RESULTS = 3000;
const LIVE_DEBOUNCE_MS = 120;

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
  keypadTabs: document.getElementById('keypad-tabs'),
  keypadGrid: document.getElementById('keypad-grid'),
  sidePanel: document.getElementById('side-panel'),
  togglePanel: document.getElementById('toggle-panel'),
};

// 「補充」分類(見 blocks.js／doc/04 第 5 節)是作者暫用的私有造字區碼位，
// 不是正式的 Unicode 編碼，所以不顯示 U+ 碼位，避免讓人誤以為那是標準編碼。
function chipTitle(code, info) {
  if (info.cls === 'sup') return `${info.label}（尚未正式編碼，暫用私有碼位）`;
  return `U+${code.toString(16).toUpperCase()} · ${info.label}`;
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
    btn.textContent = h.char;
    btn.title = chipTitle(h.code, info);
    btn.addEventListener('click', () => copyChar(h.char));
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
    chip.textContent = n.char;
    chip.title = chipTitle(n.code, info);
    chip.addEventListener('click', () => copyChar(n.char));
    const text = document.createElement('span');
    text.className = 'tree-text';
    text.textContent = n.text;
    row.append(chip, text);
    frag.appendChild(row);
  }
  els.output.appendChild(frag);
}

let toastTimer;
function copyChar(ch) {
  navigator.clipboard?.writeText(ch).catch(() => {});
  els.toast.textContent = `已複製「${ch}」`;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1200);
}

function buildLegend() {
  els.legend.replaceChildren();
  for (const b of BLOCKS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `legend-chip blk-${b.cls}`;
    btn.textContent = b.label;
    btn.title = `只搜「${b.label}」(插入篩選符號 ${b.flag === '@' ? '@' : b.flag})`;
    btn.addEventListener('click', () => {
      insertAtCursor(els.input, b.flag);
      scheduleLiveSearch();
    });
    els.legend.appendChild(btn);
  }
}

function buildKeypad(categories) {
  els.keypadTabs.replaceChildren();
  els.keypadGrid.replaceChildren();

  function showCategory(idx) {
    for (const child of els.keypadTabs.children) {
      child.classList.toggle('active', Number(child.dataset.idx) === idx);
    }
    els.keypadGrid.replaceChildren();
    const cat = categories[idx];
    for (const row of cat.rows) {
      const rowEl = document.createElement('div');
      rowEl.className = 'keypad-row';
      for (const ch of row) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'keypad-key';
        btn.textContent = ch;
        btn.addEventListener('click', () => {
          insertAtCursor(els.input, ch);
          scheduleLiveSearch();
        });
        rowEl.appendChild(btn);
      }
      els.keypadGrid.appendChild(rowEl);
    }
  }

  categories.forEach((cat, idx) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'keypad-tab';
    tab.dataset.idx = String(idx);
    tab.title = cat.name;
    tab.textContent = cat.icon;
    tab.addEventListener('click', () => showCategory(idx));
    els.keypadTabs.appendChild(tab);
  });

  if (categories.length) showCategory(0);
}

let matcher;
let composing = false;
let liveTimer;

function doSearch(max) {
  const raw = els.input.value;
  if (!raw) {
    els.counter.textContent = '';
    els.output.replaceChildren();
    return;
  }
  const d = els.subdivide.checked;
  const start = performance.now();
  if (raw.charAt(0) === '\\') {
    const nodes = matcher.getTree(raw.slice(1), d);
    renderTree(nodes);
    els.counter.textContent = `「${raw.slice(1)}」共 ${nodes.length} 種拆法`;
    return;
  }
  const v = els.variant.checked;
  const u = els.ucodeOnly.checked;
  const hits = matcher.getMatch(raw, v, d, u, max);
  const truncated = hits.length > max;
  const shown = truncated ? hits.filter((h) => h.hit === 0 || hits.indexOf(h) < max) : hits;
  renderHits(shown, truncated);
  const elapsed = ((performance.now() - start) / 1000).toFixed(3);
  els.counter.textContent = `「${raw}」總計 ${hits.length} 字（${elapsed} 秒）`;
}

function runSearch() {
  doSearch(FULL_MAX_RESULTS);
}

function scheduleLiveSearch() {
  if (!els.live.checked || composing) return;
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => doSearch(LIVE_MAX_RESULTS), LIVE_DEBOUNCE_MS);
}

async function main() {
  buildLegend();
  els.status.textContent = '資料載入中…';
  const t0 = performance.now();
  try {
    const { dt, rt, vt, kt } = await loadData('../data/');
    matcher = createMatcher(dt, rt, vt);
    buildKeypad(parseKeypad(kt));
  } catch (err) {
    els.status.textContent = `資料載入失敗：${err.message}`;
    return;
  }
  const ms = (performance.now() - t0).toFixed(0);
  els.status.textContent = `資料載入完成（${ms} ms），可以開始查詢。`;

  els.search.addEventListener('click', runSearch);
  els.input.addEventListener('input', scheduleLiveSearch);
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
    if (e.key === 'Escape') {
      els.input.value = '';
      els.counter.textContent = '';
      els.output.replaceChildren();
    }
  });
  els.clear.addEventListener('click', () => {
    els.input.value = '';
    els.counter.textContent = '';
    els.output.replaceChildren();
    els.input.focus();
  });
  els.togglePanel.addEventListener('click', () => {
    const collapsed = els.sidePanel.classList.toggle('collapsed');
    els.togglePanel.textContent = collapsed ? '▼' : '▲';
  });
  els.input.focus();
}

main();
