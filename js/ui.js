'use strict';

// ── Config ─────────────────────────────────────────────────────────────────
const FILTERS = [
  { id: 'original', label: 'Original' },
  { id: '8k',       label: '8K'       },
  { id: 'antigua',  label: 'Antigua'  },
  { id: 'vivid',    label: 'Vivid'    },
  { id: 'japonesa', label: 'Japonesa' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'noir',     label: 'Noir'     },
  { id: 'dreamy',   label: 'Dreamy'   },
  { id: 'y2k',      label: 'Y2K'      },
  { id: 'y2kflash', label: 'Y2K Flash'},
  { id: 'golden',   label: 'Golden'   },
  { id: 'film',     label: 'Film'     },
  { id: 'pacific',  label: 'Pacific'  },
  { id: 'moody',    label: 'Moody'    },
  { id: 'fade',     label: 'Fade'     },
  { id: 'bloom',    label: 'Bloom'    },
];
const THUMB = 82;

// ── State ──────────────────────────────────────────────────────────────────
let srcImage        = null;
let activeId        = 'original';
let customPresets   = [];
let filterIntensity = 100;
let undoStack       = [];
let redoStack       = [];

// ── Histogram ─────────────────────────────────────────────────────────────
const histogramWrap   = document.getElementById('histogram-wrap');
const histogramCanvas = document.getElementById('histogram-canvas');
const hCtx            = histogramCanvas.getContext('2d');
const histogramToggle = document.getElementById('histogram-toggle');
let   histCollapsed   = false;

histogramToggle.addEventListener('click', () => {
  histCollapsed = !histCollapsed;
  histogramWrap.classList.toggle('collapsed', histCollapsed);
  histogramToggle.textContent = histCollapsed ? '▸' : '▾';
});

const histTooltip  = document.getElementById('hist-tooltip');
const histHelpBtn  = document.getElementById('hist-help-btn');
histHelpBtn.addEventListener('click', e => {
  e.stopPropagation();
  histTooltip.classList.toggle('open');
});
document.addEventListener('click', () => histTooltip.classList.remove('open'));

function renderHistogram() {
  if (!srcImage || histCollapsed) return;
  const W = histogramCanvas.width;
  const H = histogramCanvas.height;
  const pixels = pCtx.getImageData(0, 0, previewCanvas.width, previewCanvas.height).data;

  const r = new Float32Array(256);
  const g = new Float32Array(256);
  const b = new Float32Array(256);
  for (let i = 0; i < pixels.length; i += 4) {
    r[pixels[i]]++; g[pixels[i+1]]++; b[pixels[i+2]]++;
  }

  let max = 1;
  for (let i = 0; i < 256; i++) {
    if (r[i] > max) max = r[i];
    if (g[i] > max) max = g[i];
    if (b[i] > max) max = b[i];
  }

  hCtx.clearRect(0, 0, W, H);

  const channels = [
    { ch: r, fill: 'rgba(255,70,70,0.55)'  },
    { ch: g, fill: 'rgba(60,200,60,0.55)'  },
    { ch: b, fill: 'rgba(60,120,255,0.55)' },
  ];
  for (const { ch, fill } of channels) {
    hCtx.beginPath();
    hCtx.moveTo(0, H);
    for (let i = 0; i < 256; i++) {
      hCtx.lineTo(i * W / 255, H - (ch[i] / max) * H);
    }
    hCtx.lineTo(W, H);
    hCtx.closePath();
    hCtx.fillStyle = fill;
    hCtx.fill();
  }
}

// ── Undo / Redo ────────────────────────────────────────────────────────────
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');

function snapshotImage() {
  const w = srcImage.naturalWidth || srcImage.width;
  const h = srcImage.naturalHeight || srcImage.height;
  const snap = document.createElement('canvas');
  snap.width = w; snap.height = h;
  snap.getContext('2d').drawImage(srcImage, 0, 0);
  return snap;
}

function pushUndo() {
  if (!srcImage) return;
  undoStack.push(snapshotImage());
  if (undoStack.length > 20) undoStack.shift();
  redoStack = [];
  undoBtn.classList.add('visible');
  redoBtn.classList.remove('visible');
}

function restoreState(snap) {
  srcImage = snap;
  activeId = 'original';
  filterIntensity = 100; intensitySlider.value = 100; intensityVal.textContent = '100%';
  applyFilterBtn.classList.remove('visible');
  document.querySelectorAll('.filter-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === 'original')
  );
  renderThumbs();
  renderPreview('original');
}

undoBtn.addEventListener('click', () => {
  if (!undoStack.length) return;
  redoStack.push(snapshotImage());
  redoBtn.classList.add('visible');
  restoreState(undoStack.pop());
  if (!undoStack.length) undoBtn.classList.remove('visible');
});

redoBtn.addEventListener('click', () => {
  if (!redoStack.length) return;
  undoStack.push(snapshotImage());
  undoBtn.classList.add('visible');
  restoreState(redoStack.pop());
  if (!redoStack.length) redoBtn.classList.remove('visible');
});

// ── DOM ────────────────────────────────────────────────────────────────────
const dropzone        = document.getElementById('dropzone');
const dropLabel       = document.getElementById('drop-label');
const previewCanvas   = document.getElementById('preview-canvas');
const pCtx            = previewCanvas.getContext('2d', { willReadFrequently: true });
const fileInput       = document.getElementById('file-input');
const downloadWrap    = document.getElementById('download-wrap');
const downloadBtn     = document.getElementById('download-btn');
const viewAllBtn      = document.getElementById('view-all-btn');
const deleteBtn       = document.getElementById('delete-btn');
const filterList      = document.getElementById('filter-list');
const allPanel        = document.getElementById('all-panel');
const allPanelGrid    = document.getElementById('all-panel-grid');
const allPanelClose   = document.getElementById('all-panel-close');
const adjustBtn       = document.getElementById('adjust-btn');
const editPanel       = document.getElementById('edit-panel');
const editClose       = document.getElementById('edit-close');
const editReset       = document.getElementById('edit-reset');
const editSave        = document.getElementById('edit-save');
const presetNameInput = document.getElementById('preset-name-input');
const sliderGrid      = document.getElementById('slider-grid');
const cropBtn         = document.getElementById('crop-btn');
const rotLBtn         = document.getElementById('rot-l-btn');
const rotRBtn         = document.getElementById('rot-r-btn');
const flipHBtn        = document.getElementById('flip-h-btn');
const flipVBtn        = document.getElementById('flip-v-btn');
const compareBtn      = document.getElementById('compare-btn');
const intensityBar    = document.getElementById('intensity-bar');
const intensitySlider = document.getElementById('intensity-slider');
const intensityVal    = document.getElementById('intensity-val');
const cropBar         = document.getElementById('crop-bar');
const cropCancel      = document.getElementById('crop-cancel');
const cropApply       = document.getElementById('crop-apply');
const applyFilterBtn  = document.getElementById('apply-filter-btn');
const wmBtn           = document.getElementById('wm-btn');
const wmBar           = document.getElementById('watermark-bar');
const wmTextInput     = document.getElementById('wm-text-input');
const wmOpacitySlider = document.getElementById('wm-opacity-slider');
const wmOpacityVal    = document.getElementById('wm-opacity-val');

// ── Build filter strip ─────────────────────────────────────────────────────
for (const f of FILTERS) {
  const el = document.createElement('div');
  el.className = 'filter-item' + (f.id === 'original' ? ' active' : '');
  el.dataset.id = f.id;
  el.innerHTML = `
    <div class="thumb-wrap">
      <canvas class="filter-thumb" id="th-${f.id}" width="${THUMB}" height="${THUMB}"></canvas>
    </div>
    <span class="filter-name">${f.label}</span>`;
  el.addEventListener('click', () => selectFilter(f.id));
  filterList.appendChild(el);
}

// ── Upload ─────────────────────────────────────────────────────────────────
dropzone.addEventListener('click', () => { if (!srcImage) fileInput.click(); });
fileInput.addEventListener('change', e => loadFile(e.target.files[0]));
dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f?.type.startsWith('image/')) loadFile(f);
});

function loadFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img  = new Image();
  img.onload = () => {
    srcImage = img;
    URL.revokeObjectURL(url);
    activeId = 'original';
    document.querySelectorAll('.filter-item').forEach(el =>
      el.classList.toggle('active', el.dataset.id === 'original')
    );
    renderThumbs();
    renderPreview(activeId);
    dropLabel.style.display     = 'none';
    previewCanvas.style.display = 'block';
    downloadWrap.classList.add('visible');
    viewAllBtn.style.display    = 'flex';
    deleteBtn.style.display     = 'flex';
    adjustBtn.style.display     = 'flex';
    compareBtn.style.display    = 'flex';
    intensityBar.style.display  = 'flex';
    [cropBtn, rotLBtn, rotRBtn, flipHBtn, flipVBtn].forEach(b => b.style.display = 'flex');
    wmBtn.style.display    = 'flex';
    speedBtn.style.display = 'flex';
    histogramWrap.classList.add('visible');
    dropzone.classList.add('has-image');
  };
  img.src = url;
}

// ── Delete ─────────────────────────────────────────────────────────────────
deleteBtn.addEventListener('click', e => {
  e.stopPropagation();
  srcImage    = null;
  activeId    = 'original';
  previewCanvas.style.display = 'none';
  dropLabel.style.display     = '';
  downloadWrap.classList.remove('visible', 'open');
  viewAllBtn.style.display    = 'none';
  deleteBtn.style.display     = 'none';
  adjustBtn.style.display     = 'none';
  compareBtn.style.display    = 'none';
  intensityBar.style.display  = 'none';
  [cropBtn, rotLBtn, rotRBtn, flipHBtn, flipVBtn].forEach(b => b.style.display = 'none');
  wmBtn.style.display = 'none';
  wmActive = false; wmBtn.classList.remove('active'); wmBar.style.display = 'none';
  exitSpeedMode(); speedBtn.style.display = 'none';
  histogramWrap.classList.remove('visible');
  hCtx.clearRect(0, 0, histogramCanvas.width, histogramCanvas.height);
  undoStack = []; undoBtn.classList.remove('visible');
  redoStack = []; redoBtn.classList.remove('visible');
  applyFilterBtn.classList.remove('visible');
  compareMode = false; compareBtn.classList.remove('active');
  exitCropMode(false);
  filterIntensity = 100; intensitySlider.value = 100; intensityVal.textContent = '100%';
  closeEditPanel(false);
  dropzone.classList.remove('has-image');
  document.querySelectorAll('.filter-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === 'original')
  );
  for (const f of FILTERS) {
    const c = document.getElementById(`th-${f.id}`);
    if (c) c.getContext('2d').clearRect(0, 0, THUMB, THUMB);
  }
  for (const p of customPresets) {
    const c = document.getElementById(`th-${p.id}`);
    if (c) c.getContext('2d').clearRect(0, 0, THUMB, THUMB);
  }
  fileInput.value = '';
  closePanel();
});

// ── All Filters Panel ──────────────────────────────────────────────────────
viewAllBtn.addEventListener('click', () => { buildPanelGrid(); allPanel.classList.add('open'); });
allPanelClose.addEventListener('click', closePanel);
allPanel.addEventListener('click', e => { if (e.target === allPanel) closePanel(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

function closePanel() { allPanel.classList.remove('open'); }

function buildPanelGrid() {
  allPanelGrid.innerHTML = '';
  for (const f of [...FILTERS, ...customPresets]) {
    const canvas  = document.getElementById(`th-${f.id}`);
    const dataURL = canvas ? canvas.toDataURL() : '';
    const item    = document.createElement('div');
    item.className  = 'panel-item' + (f.id === activeId ? ' active' : '');
    item.dataset.id = f.id;
    item.innerHTML  = `
      <div class="panel-thumb-wrap">
        <img class="panel-thumb-img" src="${dataURL}" alt="${f.label}">
      </div>
      <span class="panel-name">${f.label}</span>`;
    item.addEventListener('click', () => { selectFilter(f.id); closePanel(); });
    allPanelGrid.appendChild(item);
  }
}

// ── Thumbnails ─────────────────────────────────────────────────────────────
function renderThumbs() {
  const s    = srcImage;
  const side = Math.min(s.width, s.height);
  const sx   = (s.width  - side) / 2;
  const sy   = (s.height - side) / 2;
  for (const f of FILTERS) {
    const canvas = document.getElementById(`th-${f.id}`);
    const ctx    = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, THUMB, THUMB);
    ctx.drawImage(s, sx, sy, side, side, 0, 0, THUMB, THUMB);
    const id = ctx.getImageData(0, 0, THUMB, THUMB);
    runFilter(id, f.id, THUMB, THUMB);
    ctx.putImageData(id, 0, 0);
    runOverlay(ctx, f.id, THUMB, THUMB);
    if (filterIntensity < 100 && f.id !== 'original') {
      ctx.globalAlpha = 1 - filterIntensity / 100;
      ctx.drawImage(s, sx, sy, side, side, 0, 0, THUMB, THUMB);
      ctx.globalAlpha = 1;
    }
  }
  for (const p of customPresets) renderCustomThumb(p);
}

// ── Preview ────────────────────────────────────────────────────────────────
function renderPreview(filterId) {
  if (!srcImage) return;
  if (cropMode)    { renderCropMode(); return; }
  if (compareMode) { renderCompare();  return; }
  const rect  = dropzone.getBoundingClientRect();
  const scale = Math.min(rect.width / srcImage.width, rect.height / srcImage.height, 1);
  const w     = Math.max(1, Math.round(srcImage.width  * scale));
  const h     = Math.max(1, Math.round(srcImage.height * scale));
  previewCanvas.width  = w;
  previewCanvas.height = h;
  pCtx.drawImage(srcImage, 0, 0, w, h);
  const id = pCtx.getImageData(0, 0, w, h);
  runFilter(id, filterId, w, h);
  pCtx.putImageData(id, 0, 0);
  runOverlay(pCtx, filterId, w, h);
  if (filterIntensity < 100 && filterId !== 'original') {
    pCtx.globalAlpha = 1 - filterIntensity / 100;
    pCtx.drawImage(srcImage, 0, 0, w, h);
    pCtx.globalAlpha = 1;
  }
  if (speedMode) {
    applyZoomBlur(pCtx, w, h, speedCX * w, speedCY * h, speedIntensity);
    drawSpeedHandle(pCtx, speedCX * w, speedCY * h);
  }
  if (wmActive && wmTextInput && wmTextInput.value.trim()) drawWatermark(pCtx, w, h);
  renderHistogram();
}

function selectFilter(id) {
  activeId = id;
  document.querySelectorAll('.filter-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === id)
  );
  applyFilterBtn.classList.toggle('visible', !!(srcImage && id !== 'original'));
  renderPreview(id);
}

applyFilterBtn.addEventListener('click', () => {
  if (!srcImage || activeId === 'original') return;
  pushUndo();
  const w = srcImage.naturalWidth || srcImage.width;
  const h = srcImage.naturalHeight || srcImage.height;
  const ec = document.createElement('canvas');
  ec.width = w; ec.height = h;
  const ctx = ec.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(srcImage, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  runFilter(id, activeId, w, h);
  ctx.putImageData(id, 0, 0);
  runOverlay(ctx, activeId, w, h);
  if (filterIntensity < 100) {
    ctx.globalAlpha = 1 - filterIntensity / 100;
    ctx.drawImage(srcImage, 0, 0, w, h);
    ctx.globalAlpha = 1;
  }
  srcImage = ec;
  activeId = 'original';
  filterIntensity = 100; intensitySlider.value = 100; intensityVal.textContent = '100%';
  applyFilterBtn.classList.remove('visible');
  document.querySelectorAll('.filter-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === 'original')
  );
  renderThumbs();
  renderPreview('original');
});

// ── Download ───────────────────────────────────────────────────────────────
function doDownload(targetW, targetH) {
  if (!srcImage) return;
  const imgW = srcImage.naturalWidth  || srcImage.width;
  const imgH = srcImage.naturalHeight || srcImage.height;
  const w = targetW || imgW;
  const h = targetH || imgH;
  const ec  = document.createElement('canvas');
  ec.width  = w; ec.height = h;
  const ctx = ec.getContext('2d', { willReadFrequently: true });
  if (targetW && targetH) {
    const scale = Math.max(w / imgW, h / imgH);
    const sw = w / scale, sh = h / scale;
    const sx = (imgW - sw) / 2, sy = (imgH - sh) / 2;
    ctx.drawImage(srcImage, sx, sy, sw, sh, 0, 0, w, h);
  } else {
    ctx.drawImage(srcImage, 0, 0, w, h);
  }
  const id = ctx.getImageData(0, 0, w, h);
  runFilter(id, activeId, w, h);
  ctx.putImageData(id, 0, 0);
  runOverlay(ctx, activeId, w, h);
  if (filterIntensity < 100 && activeId !== 'original') {
    ctx.globalAlpha = 1 - filterIntensity / 100;
    if (targetW && targetH) {
      const scale = Math.max(w / imgW, h / imgH);
      const sw = w / scale, sh = h / scale;
      const sx = (imgW - sw) / 2, sy = (imgH - sh) / 2;
      ctx.drawImage(srcImage, sx, sy, sw, sh, 0, 0, w, h);
    } else {
      ctx.drawImage(srcImage, 0, 0, w, h);
    }
    ctx.globalAlpha = 1;
  }
  if (speedMode) applyZoomBlur(ctx, w, h, speedCX * w, speedCY * h, speedIntensity);
  if (wmActive && wmTextInput.value.trim()) drawWatermark(ctx, w, h);
  const a    = document.createElement('a');
  a.download = `forza-${activeId}.png`;
  a.href     = ec.toDataURL('image/png');
  a.click();
}

downloadBtn.addEventListener('click', e => {
  e.stopPropagation();
  if (!srcImage) return;
  downloadWrap.classList.toggle('open');
});

document.querySelectorAll('.export-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    downloadWrap.classList.remove('open');
    doDownload(+btn.dataset.w, +btn.dataset.h);
  });
});

document.addEventListener('click', e => {
  if (!downloadWrap.contains(e.target)) downloadWrap.classList.remove('open');
});

window.addEventListener('resize', () => {
  if (!srcImage) return;
  if (editPanel.classList.contains('open')) renderCustomPreview();
  else renderPreview(activeId);
});

// ── Tab switching ──────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const t = btn.dataset.tab;
    document.getElementById('tab-filters').style.display = t === 'filters' ? 'grid' : 'none';
    document.getElementById('tab-grid').style.display    = t === 'grid'    ? 'flex' : 'none';
  });
});

// ── Changelog ─────────────────────────────────────────────────────────────
// Add new entries at the top. version must match CHANGELOG[0].version for dot logic.
const CHANGELOG = [
  {
    version: '1.4', date: 'Jun 2026',
    notes: [
      'Export size presets — Instagram, Twitter/X, LinkedIn, YouTube',
      'Speed effect tool with radial zoom blur + Apply',
      'Undo / Redo — full history up to 20 steps',
      'Apply Filter button — stack filters on top of each other',
      'Watermark Apply — bake watermark into image',
      'Real-time RGB histogram panel (collapsible)',
    ]
  },
  {
    version: '1.3', date: 'Jun 2026',
    notes: ['Watermark tool — text, opacity, 7 positions, italic font', 'CSS/JS split into separate files']
  },
  {
    version: '1.2', date: 'May 2026',
    notes: ['Grid Split for Instagram carousels', 'Tile preview strip', 'ZIP download']
  },
  {
    version: '1.1', date: 'May 2026',
    notes: ['Before/after compare slider', 'Filter intensity slider', 'Crop with aspect ratios', 'Rotate & flip']
  },
  {
    version: '1.0', date: 'May 2026',
    notes: ['16 built-in filters', 'Custom filter presets', 'Full-resolution PNG download']
  },
];

const CHANGELOG_KEY = 'forza_changelog_read';
const changelogBtn  = document.getElementById('changelog-btn');
const changelogDot  = document.getElementById('changelog-dot');
const changelogDrop = document.getElementById('changelog-dropdown');

(function initChangelog() {
  changelogDrop.innerHTML =
    '<div class="cl-title">What\'s new</div>' +
    CHANGELOG.map(e =>
      `<div class="cl-entry">
        <div class="cl-version">v${e.version}<span class="cl-date">${e.date}</span></div>
        <ul class="cl-notes">${e.notes.map(n => `<li>${n}</li>`).join('')}</ul>
      </div>`
    ).join('');
  if (localStorage.getItem(CHANGELOG_KEY) !== CHANGELOG[0].version) {
    changelogDot.classList.add('visible');
  }
})();

changelogBtn.addEventListener('click', e => {
  e.stopPropagation();
  changelogDrop.classList.toggle('open');
  if (changelogDrop.classList.contains('open')) {
    localStorage.setItem(CHANGELOG_KEY, CHANGELOG[0].version);
    changelogDot.classList.remove('visible');
  }
});

document.addEventListener('click', e => {
  if (!changelogDrop.contains(e.target) && e.target !== changelogBtn) {
    changelogDrop.classList.remove('open');
  }
});

// ── Filter strip drag-scroll ───────────────────────────────────────────────
{
  const strip = document.getElementById('filter-strip');
  let dragging = false, startX = 0, scrollLeft = 0;
  strip.addEventListener('mousedown', e => {
    dragging = true; startX = e.pageX; scrollLeft = strip.scrollLeft;
    strip.classList.add('is-dragging');
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    strip.scrollLeft = scrollLeft - (e.pageX - startX);
  });
  document.addEventListener('mouseup', () => {
    dragging = false; strip.classList.remove('is-dragging');
  });
}
