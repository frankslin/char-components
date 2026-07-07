import { loadData } from './data.js';
import { createMatcher } from './core.js';

const MAX_RESULTS = 3000;

const els = {
  input: document.getElementById('input'),
  search: document.getElementById('search'),
  clear: document.getElementById('clear'),
  variant: document.getElementById('opt-variant'),
  subdivide: document.getElementById('opt-subdivide'),
  ucodeOnly: document.getElementById('opt-ucodeonly'),
  counter: document.getElementById('counter'),
  output: document.getElementById('output'),
  status: document.getElementById('status'),
  toast: document.getElementById('toast'),
};

const blockClass = {
  1: 'blk-bmp', 2: 'blk-exa', 3: 'blk-exb', 4: 'blk-exc', 5: 'blk-exd',
  6: 'blk-exe', 7: 'blk-exf', 8: 'blk-exg', 9: 'blk-exh', 10: 'blk-exi',
  11: 'blk-exj', 28: 'blk-cmp', 29: 'blk-cmp', 30: 'blk-sup', 31: 'blk-sup',
};

function hitClass(hit) {
  if (hit === -2) return 'hit-regu1';
  if (hit < 0) return 'hit-regu0';
  return hit ? 'hit-fuzzy' : 'hit-exact';
}

function renderHits(hits) {
  els.output.replaceChildren();
  const frag = document.createDocumentFragment();
  for (const h of hits) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `char-chip ${hitClass(h.hit)} ${blockClass[h.block] ?? 'blk-oth'}`;
    btn.textContent = h.char;
    btn.title = `U+${h.code.toString(16).toUpperCase()}`;
    btn.addEventListener('click', () => copyChar(h.char));
    frag.appendChild(btn);
  }
  els.output.appendChild(frag);
}

function renderTree(nodes) {
  els.output.replaceChildren();
  const frag = document.createDocumentFragment();
  for (const n of nodes) {
    const row = document.createElement('div');
    row.className = 'tree-row';
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'char-chip hit-exact';
    chip.textContent = n.char;
    chip.title = `U+${n.code.toString(16).toUpperCase()}`;
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

async function main() {
  els.status.textContent = '資料載入中…';
  const t0 = performance.now();
  let matcher;
  try {
    const { dt, rt, vt } = await loadData('../data/');
    matcher = createMatcher(dt, rt, vt);
  } catch (err) {
    els.status.textContent = `資料載入失敗：${err.message}`;
    return;
  }
  const ms = (performance.now() - t0).toFixed(0);
  els.status.textContent = `資料載入完成（${ms} ms），可以開始查詢。`;

  function runSearch() {
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
    } else {
      const v = els.variant.checked;
      const u = els.ucodeOnly.checked;
      const hits = matcher.getMatch(raw, v, d, u, MAX_RESULTS);
      renderHits(hits);
      const elapsed = ((performance.now() - start) / 1000).toFixed(3);
      const over = hits.length > MAX_RESULTS ? `（超過 ${MAX_RESULTS} 字，僅顯示前段）` : '';
      els.counter.textContent = `「${raw}」總計 ${hits.length} 字${over}（${elapsed} 秒）`;
    }
  }

  els.search.addEventListener('click', runSearch);
  els.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runSearch();
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
  els.input.focus();
}

main();
