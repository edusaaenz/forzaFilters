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
let srcImage       = null;
let activeId       = 'original';
let customPresets  = [];
let preEditActive  = 'original';
let filterIntensity = 100;
let compareMode    = false;
let compareDivX    = 0.5;
let compareDrag    = false;
let cropMode       = false;
let cropRect       = { x1: 0, y1: 0, x2: 1, y2: 1 };
let cropDrag       = null;
let cropDragStart  = null;
let cropAspect     = null;
let wmActive       = false;
let wmPosition     = 'br';
let wmCursive      = false;

const SLIDER_DEFS = [
  { id: 'brightness', label: 'Brightness', min: -100, max: 100, def: 0 },
  { id: 'contrast',   label: 'Contrast',   min: -100, max: 100, def: 0 },
  { id: 'saturation', label: 'Saturation', min: -100, max: 100, def: 0 },
  { id: 'warmth',     label: 'Warmth',     min: -100, max: 100, def: 0 },
  { id: 'fade',       label: 'Fade',       min:    0, max: 100, def: 0 },
  { id: 'grain',      label: 'Grain',      min:    0, max: 100, def: 0 },
  { id: 'vignette',   label: 'Vignette',   min:    0, max: 100, def: 0 },
  { id: 'sharpness',  label: 'Sharpness',  min:    0, max: 100, def: 0 },
];
const customSettings = {};
for (const s of SLIDER_DEFS) customSettings[s.id] = s.def;

// ── DOM ────────────────────────────────────────────────────────────────────
const dropzone      = document.getElementById('dropzone');
const dropLabel     = document.getElementById('drop-label');
const previewCanvas = document.getElementById('preview-canvas');
const pCtx          = previewCanvas.getContext('2d', { willReadFrequently: true });
const fileInput     = document.getElementById('file-input');
const downloadBtn   = document.getElementById('download-btn');
const viewAllBtn    = document.getElementById('view-all-btn');
const deleteBtn     = document.getElementById('delete-btn');
const filterList    = document.getElementById('filter-list');
const allPanel      = document.getElementById('all-panel');
const allPanelGrid  = document.getElementById('all-panel-grid');
const allPanelClose = document.getElementById('all-panel-close');
const adjustBtn     = document.getElementById('adjust-btn');
const editPanel     = document.getElementById('edit-panel');
const editClose     = document.getElementById('edit-close');
const editReset     = document.getElementById('edit-reset');
const editSave      = document.getElementById('edit-save');
const presetNameInput = document.getElementById('preset-name-input');
const sliderGrid    = document.getElementById('slider-grid');
const cropBtn       = document.getElementById('crop-btn');
const rotLBtn       = document.getElementById('rot-l-btn');
const rotRBtn       = document.getElementById('rot-r-btn');
const flipHBtn      = document.getElementById('flip-h-btn');
const flipVBtn      = document.getElementById('flip-v-btn');
const compareBtn    = document.getElementById('compare-btn');
const intensityBar  = document.getElementById('intensity-bar');
const intensitySlider = document.getElementById('intensity-slider');
const intensityVal  = document.getElementById('intensity-val');
const cropBar       = document.getElementById('crop-bar');
const cropCancel    = document.getElementById('crop-cancel');
const cropApply     = document.getElementById('crop-apply');
const wmBtn         = document.getElementById('wm-btn');
const wmBar         = document.getElementById('watermark-bar');
const wmTextInput   = document.getElementById('wm-text-input');
const wmOpacitySlider = document.getElementById('wm-opacity-slider');
const wmOpacityVal  = document.getElementById('wm-opacity-val');

// ── Build strip ────────────────────────────────────────────────────────────
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
    downloadBtn.style.display   = 'flex';
    viewAllBtn.style.display    = 'flex';
    deleteBtn.style.display     = 'flex';
    adjustBtn.style.display     = 'flex';
    compareBtn.style.display    = 'flex';
    intensityBar.style.display  = 'flex';
    [cropBtn, rotLBtn, rotRBtn, flipHBtn, flipVBtn].forEach(b => b.style.display = 'flex');
    wmBtn.style.display = 'flex';
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
  downloadBtn.style.display   = 'none';
  viewAllBtn.style.display    = 'none';
  deleteBtn.style.display     = 'none';
  adjustBtn.style.display     = 'none';
  compareBtn.style.display    = 'none';
  intensityBar.style.display  = 'none';
  [cropBtn, rotLBtn, rotRBtn, flipHBtn, flipVBtn].forEach(b => b.style.display = 'none');
  wmBtn.style.display = 'none';
  wmActive = false; wmBtn.classList.remove('active'); wmBar.style.display = 'none';
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
  if (wmActive && wmTextInput && wmTextInput.value.trim()) drawWatermark(pCtx, w, h);
}

function selectFilter(id) {
  activeId = id;
  document.querySelectorAll('.filter-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === id)
  );
  renderPreview(id);
}

// ── Download ───────────────────────────────────────────────────────────────
downloadBtn.addEventListener('click', () => {
  if (!srcImage) return;
  const w   = srcImage.naturalWidth  || srcImage.width;
  const h   = srcImage.naturalHeight || srcImage.height;
  const ec  = document.createElement('canvas');
  ec.width  = w; ec.height = h;
  const ctx = ec.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(srcImage, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  runFilter(id, activeId, w, h);
  ctx.putImageData(id, 0, 0);
  runOverlay(ctx, activeId, w, h);
  if (filterIntensity < 100 && activeId !== 'original') {
    ctx.globalAlpha = 1 - filterIntensity / 100;
    ctx.drawImage(srcImage, 0, 0, w, h);
    ctx.globalAlpha = 1;
  }
  if (wmActive && wmTextInput.value.trim()) drawWatermark(ctx, w, h);
  const a    = document.createElement('a');
  a.download = `forza-${activeId}.png`;
  a.href     = ec.toDataURL('image/png');
  a.click();
});

window.addEventListener('resize', () => {
  if (!srcImage) return;
  if (editPanel.classList.contains('open')) renderCustomPreview();
  else renderPreview(activeId);
});

// ── Watermark ──────────────────────────────────────────────────────────────
wmBtn.addEventListener('click', () => {
  if (!srcImage) return;
  wmActive = !wmActive;
  wmBtn.classList.toggle('active', wmActive);
  wmBar.style.display = wmActive ? 'flex' : 'none';
  renderPreview(activeId);
});

wmOpacitySlider.addEventListener('input', () => {
  wmOpacityVal.textContent = wmOpacitySlider.value + '%';
  if (srcImage) renderPreview(activeId);
});

wmTextInput.addEventListener('input', () => {
  if (srcImage) renderPreview(activeId);
});

document.querySelectorAll('.wm-pos-btn[data-pos]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.wm-pos-btn[data-pos]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    wmPosition = btn.dataset.pos;
    if (srcImage) renderPreview(activeId);
  });
});

document.getElementById('wm-font-normal').addEventListener('click', () => {
  wmCursive = false;
  document.getElementById('wm-font-normal').classList.add('active');
  document.getElementById('wm-font-cursive').classList.remove('active');
  if (srcImage) renderPreview(activeId);
});
document.getElementById('wm-font-cursive').addEventListener('click', () => {
  wmCursive = true;
  document.getElementById('wm-font-cursive').classList.add('active');
  document.getElementById('wm-font-normal').classList.remove('active');
  if (srcImage) renderPreview(activeId);
});

function drawWatermark(ctx, w, h) {
  const text    = wmTextInput.value.trim();
  if (!text) return;
  const opacity = +wmOpacitySlider.value / 100;
  const size    = Math.max(18, Math.round(Math.min(w, h) * 0.042));
  const pad     = Math.round(size * 1.0);
  const fontStack = wmCursive
    ? `italic bold ${size}px Georgia, 'Times New Roman', serif`
    : `bold ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.save();
  ctx.font         = fontStack;
  ctx.textBaseline = 'bottom';
  ctx.textAlign    = 'left';
  const tw = ctx.measureText(text).width;
  let x, y;
  switch (wmPosition) {
    case 'tl': x = pad;            y = size + pad;      break;
    case 'tc': x = (w - tw) / 2;   y = size + pad;      break;
    case 'tr': x = w - tw - pad;   y = size + pad;      break;
    case 'c':  x = (w - tw) / 2;   y = (h + size) / 2; break;
    case 'bl': x = pad;            y = h - pad;         break;
    case 'bc': x = (w - tw) / 2;   y = h - pad;         break;
    case 'br': x = w - tw - pad;   y = h - pad;         break;
    default:   x = w - tw - pad;   y = h - pad;
  }
  ctx.globalAlpha  = opacity * 0.55;
  ctx.fillStyle    = 'rgba(0,0,0,1)';
  ctx.shadowColor  = 'transparent';
  ctx.fillText(text, x + 1, y + 1);
  ctx.globalAlpha  = opacity;
  ctx.fillStyle    = '#ffffff';
  ctx.shadowColor  = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur   = size * 0.25;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ── Filter Router ──────────────────────────────────────────────────────────
function runFilter(imageData, id, w, h) {
  if (id.startsWith('custom-')) {
    const p = customPresets.find(p => p.id === id);
    if (p) fCustom(imageData, w, h, p.settings);
    return;
  }
  switch (id) {
    case '8k':       f8K(imageData, w, h);  break;
    case 'antigua':  fAntiqua(imageData);   break;
    case 'vivid':    fVivid(imageData);     break;
    case 'japonesa': fJaponesa(imageData);  break;
    case 'polaroid': fPolaroid(imageData);  break;
    case 'noir':     fNoir(imageData);      break;
    case 'dreamy':   fDreamy(imageData);    break;
    case 'y2k':      fY2K(imageData, w, h);      break;
    case 'y2kflash': fY2KFlash(imageData, w, h); break;
    case 'golden':   fGolden(imageData);          break;
    case 'film':     fFilm(imageData);      break;
    case 'pacific':  fPacific(imageData);   break;
    case 'moody':    fMoody(imageData);     break;
    case 'fade':     fFade(imageData);      break;
    case 'bloom':    fBloom(imageData);     break;
  }
}

function runOverlay(ctx, id, w, h) {
  if (id.startsWith('custom-')) {
    const p = customPresets.find(p => p.id === id);
    if (p && p.settings.vignette > 0)
      vignette(ctx, w, h, p.settings.vignette / 100 * 0.9, [0, 0, 0]);
    return;
  }
  switch (id) {
    case '8k':       vignette(ctx, w, h, 0.18, [0,  0,  0]); break;
    case 'antigua':  vignette(ctx, w, h, 0.82, [0,  0,  0]); break;
    case 'vivid':    vignette(ctx, w, h, 0.28, [0,  0,  0]); break;
    case 'japonesa': vignette(ctx, w, h, 0.32, [0,  0,  0]); break;
    case 'noir':     vignette(ctx, w, h, 0.68, [0,  0,  0]); break;
    case 'dreamy':   dreamyGlow(ctx, w, h);                   break;
    case 'y2k':      vignette(ctx, w, h, 0.20, [8, 18,  0]); break;
    case 'y2kflash': vignette(ctx, w, h, 0.88, [0,  0,  0]); break;
    case 'golden':   vignette(ctx, w, h, 0.30, [28,10,  0]); break;
    case 'film':     vignette(ctx, w, h, 0.14, [0,  0,  0]); break;
    case 'pacific':  vignette(ctx, w, h, 0.24, [0,  0,  0]); break;
    case 'moody':    vignette(ctx, w, h, 0.58, [0,  0,  0]); break;
    case 'bloom':    bloomGlow(ctx, w, h);                    break;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
const clamp = v => v < 0 ? 0 : v > 255 ? 255 : v;
const lut   = fn => {
  const t = new Uint8Array(256);
  for (let i = 0; i < 256; i++) t[i] = clamp(fn(i) | 0);
  return t;
};

function convolve(imageData, k, w, h) {
  const s = new Uint8ClampedArray(imageData.data);
  const d = imageData.data;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const ki = (ky + 1) * 3 + (kx + 1);
          const pi = ((y + ky) * w + (x + kx)) * 4;
          r += s[pi]     * k[ki];
          g += s[pi + 1] * k[ki];
          b += s[pi + 2] * k[ki];
        }
      }
      const di  = (y * w + x) * 4;
      d[di]     = clamp(r);
      d[di + 1] = clamp(g);
      d[di + 2] = clamp(b);
    }
  }
}

function vignette(ctx, w, h, strength, [cr, cg, cb]) {
  const cx = w / 2, cy = h / 2;
  const r  = Math.sqrt(cx * cx + cy * cy);
  const g  = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},0)`);
  g.addColorStop(1, `rgba(${cr},${cg},${cb},${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function dreamyGlow(ctx, w, h) {
  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const tc = tmp.getContext('2d');
  tc.filter = 'blur(20px)';
  tc.drawImage(ctx.canvas, 0, 0, w, h);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.28;
  ctx.drawImage(tmp, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  vignette(ctx, w, h, 0.38, [170, 140, 215]);
}

function bloomGlow(ctx, w, h) {
  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const tc = tmp.getContext('2d');
  tc.filter = 'blur(28px)';
  tc.drawImage(ctx.canvas, 0, 0, w, h);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.14;
  ctx.drawImage(tmp, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

// ══ FILTER IMPLEMENTATIONS ══════════════════════════════════════════════════

// ── 8K ─────────────────────────────────────────────────────────────────────
function f8K(imageData, w, h) {
  convolve(imageData, [
     0,   -0.6,  0,
    -0.6,  3.4, -0.6,
     0,   -0.6,  0
  ], w, h);
  const d  = imageData.data;
  const sc = lut(v => {
    const t = v / 255;
    return 255 * (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
  });
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = sc[clamp(d[i]     * 0.93 | 0)];
    d[i + 1] = sc[d[i + 1]];
    d[i + 2] = sc[clamp(d[i + 2] * 1.08 | 0)];
  }
}

// ── Antigua ────────────────────────────────────────────────────────────────
function fAntiqua(imageData) {
  const d  = imageData.data;
  const fl = lut(v => v * 0.85 + 24);
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    let r = clamp(gray * 1.14 + 32 | 0);
    let g = clamp(gray * 0.96 + 10 | 0);
    let b = clamp(gray * 0.72       | 0);
    r = fl[r]; g = fl[g]; b = fl[b];
    const noise = (Math.random() - 0.5) * 28;
    d[i]     = clamp(r + noise);
    d[i + 1] = clamp(g + noise);
    d[i + 2] = clamp(b + noise);
  }
}

// ── Vivid ── (original foto2000 values: warm + saturated + highlight crush)
function fVivid(imageData) {
  const d  = imageData.data;
  const hc = lut(v => v < 195 ? v : 195 + (v - 195) * 0.3);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    r = clamp(r * 1.18 | 0);
    g = clamp(g * 1.04 | 0);
    b = clamp(b * 0.76 | 0);
    const gr = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clamp(gr + (r - gr) * 1.45 | 0);
    g = clamp(gr + (g - gr) * 1.45 | 0);
    b = clamp(gr + (b - gr) * 1.45 | 0);
    d[i]     = hc[clamp(r)];
    d[i + 1] = hc[clamp(g)];
    d[i + 2] = hc[clamp(b)];
  }
}

// ── Japonesa ───────────────────────────────────────────────────────────────
function fJaponesa(imageData) {
  const d  = imageData.data;
  const cc = lut(v => {
    const t = v / 255;
    return 255 * (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
  });
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    const gr = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clamp(gr + (r - gr) * 0.32 | 0);
    g = clamp(gr + (g - gr) * 0.32 | 0);
    b = clamp(gr + (b - gr) * 0.32 | 0);
    r = clamp(r * 0.86 | 0);
    g = clamp(g * 1.02 | 0);
    b = clamp(b * 1.14 | 0);
    d[i]     = cc[clamp(r)];
    d[i + 1] = cc[clamp(g)];
    d[i + 2] = cc[clamp(b)];
  }
}

// ── Polaroid ───────────────────────────────────────────────────────────────
function fPolaroid(imageData) {
  const d  = imageData.data;
  const lc = lut(v => v * 0.75 + 34);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    r = lc[r]; g = lc[g]; b = lc[b];
    const bright = (r + g + b) / (3 * 255);
    const dark   = 1 - bright;
    r = clamp(r + bright * 16 | 0);
    g = clamp(g + bright *  8 | 0);
    b = clamp(b - bright * 10 | 0);
    g = clamp(g + dark * 13   | 0);
    b = clamp(b - dark * 11   | 0);
    d[i]     = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
}

// ── Noir ────────────────────────────────────────────────────────────────────
function fNoir(imageData) {
  const d  = imageData.data;
  const nc = lut(v =>
    v < 52  ? v * 0.42 :
    v > 205 ? 205 + (v - 205) * 1.65 : v
  );
  for (let i = 0; i < d.length; i += 4) {
    const v      = nc[clamp(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] | 0)];
    d[i] = d[i + 1] = d[i + 2] = v;
  }
}

// ── Dreamy ──────────────────────────────────────────────────────────────────
function fDreamy(imageData) {
  const d  = imageData.data;
  const lc = lut(v => v * 0.80 + 38);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    r = lc[r]; g = lc[g]; b = lc[b];
    const gr = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clamp(gr + (r - gr) * 0.68 | 0);
    g = clamp(gr + (g - gr) * 0.68 | 0);
    b = clamp(gr + (b - gr) * 0.68 | 0);
    r = clamp(r + 12);
    b = clamp(b -  5);
    d[i]     = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
}

// ── Y2K Real ────────────────────────────────────────────────────────────────
function fY2K(imageData, w, h) {
  const d  = imageData.data;
  const hc = lut(v => v < 210 ? v : 210 + (v - 210) * 0.45);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    const gr = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clamp(gr + (r - gr) * 0.90 | 0);
    g = clamp(gr + (g - gr) * 0.90 | 0);
    b = clamp(gr + (b - gr) * 0.90 | 0);
    r = clamp(r * 1.05 | 0);
    g = clamp(g * 1.10 | 0);
    b = clamp(b * 0.78 | 0);
    if (r > g + 18 && r > b + 18) r = clamp(r * 1.12 | 0);
    d[i]     = hc[clamp(r)];
    d[i + 1] = hc[clamp(g)];
    d[i + 2] = hc[clamp(b)];
    d[i]     = clamp(d[i]     + (Math.random() - 0.5) * 12);
    d[i + 1] = clamp(d[i + 1] + (Math.random() - 0.5) * 10);
    d[i + 2] = clamp(d[i + 2] + (Math.random() - 0.5) * 14);
  }
}

// ── Y2K Flash ─── digicam flash: blown center, crushed highlights, dark edges
function fY2KFlash(imageData, w, h) {
  const d  = imageData.data;
  const hc = lut(v => v < 195 ? v : 195 + (v - 195) * 0.18);
  const cx = w / 2, cy = h / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = d[i], g = d[i + 1], b = d[i + 2];
      // Y2K color grade
      const gr = 0.299 * r + 0.587 * g + 0.114 * b;
      r = clamp(gr + (r - gr) * 0.88 | 0);
      g = clamp(gr + (g - gr) * 0.88 | 0);
      b = clamp(gr + (b - gr) * 0.88 | 0);
      r = clamp(r * 1.05 | 0);
      g = clamp(g * 1.08 | 0);
      b = clamp(b * 0.80 | 0);
      // Flash radial overexposure
      const dx = x - cx, dy = y - cy;
      const dist  = Math.sqrt(dx * dx + dy * dy) / maxDist;
      const flash = Math.max(0, 1 - dist * dist);
      const mult  = 1 + flash * 1.15;
      r = hc[clamp(r * mult | 0)];
      g = hc[clamp(g * mult | 0)];
      b = hc[clamp(b * mult | 0)];
      // Noise
      d[i]     = clamp(r + (Math.random() - 0.5) * 14);
      d[i + 1] = clamp(g + (Math.random() - 0.5) * 12);
      d[i + 2] = clamp(b + (Math.random() - 0.5) * 16);
    }
  }
}

// ── Golden ─── warm golden hour, rich skintones, sun-kissed ────────────────
function fGolden(imageData) {
  const d  = imageData.data;
  const sl = lut(v => v * 0.91 + 16);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    r = sl[r]; g = sl[g]; b = sl[b];
    // Warm golden cast
    r = clamp(r * 1.12 + 10 | 0);
    g = clamp(g * 1.04 +  2 | 0);
    b = clamp(b * 0.82      | 0);
    // Boost warm saturation, pull back blue
    const gr = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clamp(gr + (r - gr) * 1.20 | 0);
    g = clamp(gr + (g - gr) * 1.12 | 0);
    b = clamp(gr + (b - gr) * 0.88 | 0);
    d[i]     = clamp(r);
    d[i + 1] = clamp(g);
    d[i + 2] = clamp(b);
  }
}

// ── Film ─── Portra-inspired: natural, warm, analog soul ───────────────────
function fFilm(imageData) {
  const d  = imageData.data;
  const sl = lut(v => v * 0.91 + 15);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    r = sl[r]; g = sl[g]; b = sl[b];
    // Warm analog cast
    r = clamp(r + 12 | 0);
    g = clamp(g +  4 | 0);
    b = clamp(b -  8 | 0);
    // Gentle desat — film has less saturation than digital
    const gr = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clamp(gr + (r - gr) * 0.86 | 0);
    g = clamp(gr + (g - gr) * 0.86 | 0);
    b = clamp(gr + (b - gr) * 0.86 | 0);
    // Fine grain
    const noise = (Math.random() - 0.5) * 9;
    d[i]     = clamp(r + noise);
    d[i + 1] = clamp(g + noise);
    d[i + 2] = clamp(b + noise);
  }
}

// ── Pacific ─── cool teal, VSCO-inspired, travel/nature ────────────────────
function fPacific(imageData) {
  const d  = imageData.data;
  const sl = lut(v => v * 0.90 + 16);
  const cc = lut(v => {
    const t = v / 255;
    return 255 * (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
  });
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    r = sl[r]; g = sl[g]; b = sl[b];
    // Cool teal cast
    r = clamp(r * 0.87 | 0);
    g = clamp(g * 1.03 | 0);
    b = clamp(b * 1.13 | 0);
    // Moderate saturation boost
    const gr = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clamp(gr + (r - gr) * 1.12 | 0);
    g = clamp(gr + (g - gr) * 1.12 | 0);
    b = clamp(gr + (b - gr) * 1.12 | 0);
    d[i]     = cc[clamp(r)];
    d[i + 1] = cc[clamp(g)];
    d[i + 2] = cc[clamp(b)];
  }
}

// ── Moody ─── cinematic teal-orange grade, Hollywood split-tone ─────────────
function fMoody(imageData) {
  const d  = imageData.data;
  const cc = lut(v => {
    const t = v / 255;
    return 255 * (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
  });
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    const lum    = 0.299 * r + 0.587 * g + 0.114 * b;
    const bright = lum / 255;
    const dark   = 1 - bright;
    // Orange-warm in highlights
    r = clamp(r + bright * 22 | 0);
    g = clamp(g + bright *  6 | 0);
    b = clamp(b - bright * 15 | 0);
    // Teal in shadows
    r = clamp(r - dark * 18   | 0);
    g = clamp(g + dark *  5   | 0);
    b = clamp(b + dark * 20   | 0);
    d[i]     = cc[clamp(r)];
    d[i + 1] = cc[clamp(g)];
    d[i + 2] = cc[clamp(b)];
  }
}

// ── Fade ─── VSCO A-series: faded, muted, editorial, lifestyle ─────────────
function fFade(imageData) {
  const d  = imageData.data;
  const fc = lut(v => v * 0.72 + 42);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    r = fc[r]; g = fc[g]; b = fc[b];
    // Desaturate for muted editorial look
    const gr = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clamp(gr + (r - gr) * 0.78 | 0);
    g = clamp(gr + (g - gr) * 0.78 | 0);
    b = clamp(gr + (b - gr) * 0.78 | 0);
    // Very subtle cool cast
    b = clamp(b + 5);
    d[i]     = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
}

// ── Custom ── user-defined filter ──────────────────────────────────────────
function fCustom(imageData, w, h, s) {
  if (s.sharpness > 0) {
    const amt = (s.sharpness / 100) * 0.5;
    convolve(imageData, [
      0, -amt, 0,
      -amt, 1 + amt * 4, -amt,
      0, -amt, 0
    ], w, h);
  }
  const d         = imageData.data;
  const brightOff = (s.brightness / 100) * 80;
  const contMult  = 1 + (s.contrast   / 100) * 0.8;
  const satMult   = 1 + (s.saturation / 100);
  const warmShift = (s.warmth  / 100) * 30;
  const fadeLift  = (s.fade    / 100) * 55;
  const fadeScale = (255 - fadeLift) / 255;
  const grainAmt  = (s.grain   / 100) * 36;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    r = r * fadeScale + fadeLift;
    g = g * fadeScale + fadeLift;
    b = b * fadeScale + fadeLift;
    r += brightOff; g += brightOff; b += brightOff;
    r = 128 + (r - 128) * contMult;
    g = 128 + (g - 128) * contMult;
    b = 128 + (b - 128) * contMult;
    const gr = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gr + (r - gr) * satMult;
    g = gr + (g - gr) * satMult;
    b = gr + (b - gr) * satMult;
    r += warmShift; b -= warmShift;
    if (grainAmt > 0) {
      const noise = (Math.random() - 0.5) * grainAmt;
      r += noise; g += noise; b += noise;
    }
    d[i] = clamp(r); d[i + 1] = clamp(g); d[i + 2] = clamp(b);
  }
}

// ── Custom Filter Panel ─────────────────────────────────────────────────────
function buildSliders() {
  sliderGrid.innerHTML = '';
  for (const def of SLIDER_DEFS) {
    const row = document.createElement('div');
    row.className = 'sl-row';
    row.innerHTML = `
      <div class="sl-head">
        <span class="sl-label">${def.label}</span>
        <span class="sl-val" id="sv-${def.id}">${customSettings[def.id]}</span>
      </div>
      <input type="range" class="adj-sl" id="sl-${def.id}"
             min="${def.min}" max="${def.max}" value="${customSettings[def.id]}">`;
    sliderGrid.appendChild(row);
    row.querySelector('input').addEventListener('input', e => {
      customSettings[def.id] = +e.target.value;
      document.getElementById(`sv-${def.id}`).textContent = e.target.value;
      if (srcImage) renderCustomPreview();
    });
  }
}

function syncSliderUI() {
  for (const def of SLIDER_DEFS) {
    const inp = document.getElementById(`sl-${def.id}`);
    const val = document.getElementById(`sv-${def.id}`);
    if (inp) inp.value = customSettings[def.id];
    if (val) val.textContent = customSettings[def.id];
  }
}

function renderCustomPreview() {
  if (!srcImage) return;
  const rect  = dropzone.getBoundingClientRect();
  const scale = Math.min(rect.width / srcImage.width, rect.height / srcImage.height, 1);
  const w = Math.max(1, Math.round(srcImage.width  * scale));
  const h = Math.max(1, Math.round(srcImage.height * scale));
  previewCanvas.width  = w;
  previewCanvas.height = h;
  pCtx.drawImage(srcImage, 0, 0, w, h);
  const id = pCtx.getImageData(0, 0, w, h);
  fCustom(id, w, h, customSettings);
  pCtx.putImageData(id, 0, 0);
  if (customSettings.vignette > 0)
    vignette(pCtx, w, h, customSettings.vignette / 100 * 0.9, [0, 0, 0]);
}

function renderCustomThumb(preset) {
  const canvas = document.getElementById(`th-${preset.id}`);
  if (!canvas || !srcImage) return;
  const ctx  = canvas.getContext('2d', { willReadFrequently: true });
  const s    = srcImage;
  const side = Math.min(s.width, s.height);
  const sx   = (s.width - side) / 2, sy = (s.height - side) / 2;
  ctx.clearRect(0, 0, THUMB, THUMB);
  ctx.drawImage(s, sx, sy, side, side, 0, 0, THUMB, THUMB);
  const id = ctx.getImageData(0, 0, THUMB, THUMB);
  fCustom(id, THUMB, THUMB, preset.settings);
  ctx.putImageData(id, 0, 0);
  if (preset.settings.vignette > 0)
    vignette(ctx, THUMB, THUMB, preset.settings.vignette / 100 * 0.9, [0, 0, 0]);
}

function addPresetToStrip(preset) {
  const el = document.createElement('div');
  el.className = 'filter-item';
  el.dataset.id = preset.id;
  el.innerHTML = `
    <div class="thumb-wrap">
      <canvas class="filter-thumb" id="th-${preset.id}" width="${THUMB}" height="${THUMB}"></canvas>
    </div>
    <span class="filter-name">${preset.label}</span>`;
  el.addEventListener('click', () => selectFilter(preset.id));
  filterList.appendChild(el);
  renderCustomThumb(preset);
  el.scrollIntoView({ behavior: 'smooth', inline: 'center' });
}

// ── Intensity ───────────────────────────────────────────────────────────────
intensitySlider.addEventListener('input', () => {
  filterIntensity = +intensitySlider.value;
  intensityVal.textContent = filterIntensity + '%';
  if (srcImage) renderPreview(activeId);
  if (srcImage) renderThumbs();
});

// ── Rotate / Flip ────────────────────────────────────────────────────────────
function applyTransform(type) {
  if (!srcImage) return;
  const sw = srcImage.width, sh = srcImage.height;
  const c   = document.createElement('canvas');
  const ctx = c.getContext('2d');
  if (type === 'rotL' || type === 'rotR') {
    c.width = sh; c.height = sw;
    ctx.translate(type === 'rotR' ? sh : 0, type === 'rotL' ? sw : 0);
    ctx.rotate((type === 'rotR' ? 1 : -1) * Math.PI / 2);
  } else {
    c.width = sw; c.height = sh;
    ctx.translate(type === 'flipH' ? sw : 0, type === 'flipV' ? sh : 0);
    ctx.scale(type === 'flipH' ? -1 : 1, type === 'flipV' ? -1 : 1);
  }
  ctx.drawImage(srcImage, 0, 0);
  srcImage = c;
  renderThumbs();
  renderPreview(activeId);
}
rotLBtn.addEventListener('click',  () => applyTransform('rotL'));
rotRBtn.addEventListener('click',  () => applyTransform('rotR'));
flipHBtn.addEventListener('click', () => applyTransform('flipH'));
flipVBtn.addEventListener('click', () => applyTransform('flipV'));

// ── Compare ──────────────────────────────────────────────────────────────────
compareBtn.addEventListener('click', () => {
  if (cropMode) return;
  compareMode = !compareMode;
  compareBtn.classList.toggle('active', compareMode);
  compareDivX = 0.5;
  if (srcImage) renderPreview(activeId);
});

function renderCompare() {
  if (!srcImage) return;
  const rect  = dropzone.getBoundingClientRect();
  const scale = Math.min(rect.width / srcImage.width, rect.height / srcImage.height, 1);
  const w = Math.max(1, Math.round(srcImage.width  * scale));
  const h = Math.max(1, Math.round(srcImage.height * scale));
  previewCanvas.width  = w;
  previewCanvas.height = h;

  // Draw full filtered image
  pCtx.drawImage(srcImage, 0, 0, w, h);
  const id = pCtx.getImageData(0, 0, w, h);
  runFilter(id, activeId, w, h);
  pCtx.putImageData(id, 0, 0);
  runOverlay(pCtx, activeId, w, h);
  if (filterIntensity < 100 && activeId !== 'original') {
    pCtx.globalAlpha = 1 - filterIntensity / 100;
    pCtx.drawImage(srcImage, 0, 0, w, h);
    pCtx.globalAlpha = 1;
  }

  // Clip left half to original
  const divX = Math.round(w * compareDivX);
  pCtx.save();
  pCtx.beginPath();
  pCtx.rect(0, 0, divX, h);
  pCtx.clip();
  pCtx.drawImage(srcImage, 0, 0, w, h);
  pCtx.restore();

  // Divider line
  pCtx.save();
  pCtx.strokeStyle = 'rgba(255,255,255,0.9)';
  pCtx.lineWidth   = 1.5;
  pCtx.beginPath(); pCtx.moveTo(divX, 0); pCtx.lineTo(divX, h); pCtx.stroke();

  // Handle circle
  const hr = 18;
  const hy = h / 2;
  pCtx.fillStyle   = '#fff';
  pCtx.beginPath(); pCtx.arc(divX, hy, hr, 0, Math.PI * 2); pCtx.fill();
  pCtx.fillStyle   = '#222';
  pCtx.font        = '14px sans-serif';
  pCtx.textAlign   = 'center';
  pCtx.textBaseline = 'middle';
  pCtx.fillText('⇔', divX, hy);

  // Labels
  pCtx.font      = 'bold 10px sans-serif';
  pCtx.fillStyle = 'rgba(255,255,255,0.75)';
  pCtx.textAlign = 'left';  pCtx.fillText('BEFORE', 10, 16);
  pCtx.textAlign = 'right'; pCtx.fillText('AFTER', w - 10, 16);
  pCtx.restore();
  if (wmActive && wmTextInput && wmTextInput.value.trim()) drawWatermark(pCtx, w, h);
}

previewCanvas.addEventListener('mousedown', e => {
  if (!compareMode) return;
  compareDrag = true;
  updateCompareDivider(e);
});
previewCanvas.addEventListener('mousemove', e => {
  if (!compareMode || !compareDrag) return;
  updateCompareDivider(e);
});
previewCanvas.addEventListener('touchstart', e => {
  if (!compareMode) return;
  compareDrag = true;
  updateCompareDivider(e.touches[0]);
}, { passive: true });
previewCanvas.addEventListener('touchmove', e => {
  if (!compareMode || !compareDrag) return;
  e.preventDefault();
  updateCompareDivider(e.touches[0]);
}, { passive: false });
document.addEventListener('mouseup',  () => { compareDrag = false; });
document.addEventListener('touchend', () => { compareDrag = false; });

function updateCompareDivider(e) {
  const r  = previewCanvas.getBoundingClientRect();
  compareDivX = Math.max(0.02, Math.min(0.98, (e.clientX - r.left) / r.width));
  renderCompare();
}

// ── Crop ─────────────────────────────────────────────────────────────────────
cropBtn.addEventListener('click', () => {
  if (compareMode) return;
  if (cropMode) exitCropMode(false);
  else enterCropMode();
});

cropCancel.addEventListener('click', () => exitCropMode(false));
cropApply.addEventListener('click',  applyCrop);

document.querySelectorAll('.aspect-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const ratio = btn.dataset.ratio;
    cropAspect = ratio ? ratio.split(':').map(Number) : null;
    if (cropAspect) applyCropAspect();
    renderCropMode();
  });
});

function enterCropMode() {
  cropMode   = true;
  cropRect   = { x1: 0, y1: 0, x2: 1, y2: 1 };
  cropAspect = null;
  cropBtn.classList.add('active');
  document.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.aspect-btn[data-ratio=""]').classList.add('active');
  cropBar.style.display         = 'flex';
  intensityBar.style.display    = 'none';
  document.getElementById('strip-wrap').style.display = 'none';
  renderCropMode();
}

function exitCropMode(restore) {
  cropMode = false;
  cropBtn.classList.remove('active');
  cropBar.style.display         = 'none';
  intensityBar.style.display    = srcImage ? 'flex' : 'none';
  document.getElementById('strip-wrap').style.display = '';
  if (restore && srcImage) renderPreview(activeId);
}

function applyCropAspect() {
  if (!cropAspect) return;
  const [aw, ah] = cropAspect;
  const iw = srcImage.width, ih = srcImage.height;
  const targetAR = aw / ah;
  const imageAR  = iw / ih;
  let rw, rh;
  if (targetAR > imageAR) { rw = 1; rh = imageAR / targetAR; }
  else                     { rh = 1; rw = targetAR / imageAR; }
  cropRect.x1 = (1 - rw) / 2; cropRect.x2 = cropRect.x1 + rw;
  cropRect.y1 = (1 - rh) / 2; cropRect.y2 = cropRect.y1 + rh;
}

function renderCropMode() {
  if (!srcImage) return;
  const rect  = dropzone.getBoundingClientRect();
  const scale = Math.min(rect.width / srcImage.width, rect.height / srcImage.height, 1);
  const w = Math.max(1, Math.round(srcImage.width  * scale));
  const h = Math.max(1, Math.round(srcImage.height * scale));
  previewCanvas.width  = w;
  previewCanvas.height = h;
  pCtx.drawImage(srcImage, 0, 0, w, h);

  const x1 = cropRect.x1 * w, y1 = cropRect.y1 * h;
  const x2 = cropRect.x2 * w, y2 = cropRect.y2 * h;

  // Dark outside
  pCtx.fillStyle = 'rgba(0,0,0,0.55)';
  pCtx.fillRect(0,  0,  w,      y1);
  pCtx.fillRect(0,  y2, w,      h - y2);
  pCtx.fillRect(0,  y1, x1,     y2 - y1);
  pCtx.fillRect(x2, y1, w - x2, y2 - y1);

  // Border
  pCtx.strokeStyle = '#fff';
  pCtx.lineWidth   = 1.5;
  pCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);

  // Rule-of-thirds grid
  pCtx.strokeStyle = 'rgba(255,255,255,0.22)';
  pCtx.lineWidth   = 0.5;
  for (let i = 1; i <= 2; i++) {
    const gx = x1 + (x2 - x1) * i / 3;
    const gy = y1 + (y2 - y1) * i / 3;
    pCtx.beginPath(); pCtx.moveTo(gx, y1); pCtx.lineTo(gx, y2); pCtx.stroke();
    pCtx.beginPath(); pCtx.moveTo(x1, gy); pCtx.lineTo(x2, gy); pCtx.stroke();
  }

  // Corner handles
  const HS = 12;
  pCtx.fillStyle = '#fff';
  [[x1, y1], [x2 - HS, y1], [x1, y2 - HS], [x2 - HS, y2 - HS]]
    .forEach(([hx, hy]) => pCtx.fillRect(hx, hy, HS, HS));
}

function cropHitTest(px, py, w, h) {
  const x1 = cropRect.x1 * w, y1 = cropRect.y1 * h;
  const x2 = cropRect.x2 * w, y2 = cropRect.y2 * h;
  const T  = 14;
  if (Math.abs(px - x1) < T && Math.abs(py - y1) < T) return 'nw';
  if (Math.abs(px - x2) < T && Math.abs(py - y1) < T) return 'ne';
  if (Math.abs(px - x1) < T && Math.abs(py - y2) < T) return 'sw';
  if (Math.abs(px - x2) < T && Math.abs(py - y2) < T) return 'se';
  if (px > x1 && px < x2 && py > y1 && py < y2)       return 'move';
  return null;
}

previewCanvas.addEventListener('mousedown', e => {
  if (!cropMode) return;
  const r  = previewCanvas.getBoundingClientRect();
  const px = (e.clientX - r.left) * previewCanvas.width  / r.width;
  const py = (e.clientY - r.top)  * previewCanvas.height / r.height;
  cropDrag      = cropHitTest(px, py, previewCanvas.width, previewCanvas.height);
  cropDragStart = cropDrag ? { px, py, r: { ...cropRect } } : null;
});

previewCanvas.addEventListener('mousemove', e => {
  if (!cropMode || !cropDrag) return;
  const r  = previewCanvas.getBoundingClientRect();
  const px = (e.clientX - r.left) * previewCanvas.width  / r.width;
  const py = (e.clientY - r.top)  * previewCanvas.height / r.height;
  updateCropDrag(px, py);
});

previewCanvas.addEventListener('touchstart', e => {
  if (!cropMode) return;
  const t  = e.touches[0];
  const r  = previewCanvas.getBoundingClientRect();
  const px = (t.clientX - r.left) * previewCanvas.width  / r.width;
  const py = (t.clientY - r.top)  * previewCanvas.height / r.height;
  cropDrag      = cropHitTest(px, py, previewCanvas.width, previewCanvas.height);
  cropDragStart = cropDrag ? { px, py, r: { ...cropRect } } : null;
}, { passive: true });

previewCanvas.addEventListener('touchmove', e => {
  if (!cropMode || !cropDrag) return;
  e.preventDefault();
  const t  = e.touches[0];
  const r  = previewCanvas.getBoundingClientRect();
  const px = (t.clientX - r.left) * previewCanvas.width  / r.width;
  const py = (t.clientY - r.top)  * previewCanvas.height / r.height;
  updateCropDrag(px, py);
}, { passive: false });

document.addEventListener('mouseup',  () => { cropDrag = null; });
document.addEventListener('touchend', () => { cropDrag = null; });

function updateCropDrag(px, py) {
  const W  = previewCanvas.width, H = previewCanvas.height;
  const dx = (px - cropDragStart.px) / W;
  const dy = (py - cropDragStart.py) / H;
  const r  = cropDragStart.r;
  const MIN = 0.05;

  if (cropDrag === 'move') {
    const dw = r.x2 - r.x1, dh = r.y2 - r.y1;
    cropRect.x1 = Math.max(0, Math.min(1 - dw, r.x1 + dx));
    cropRect.y1 = Math.max(0, Math.min(1 - dh, r.y1 + dy));
    cropRect.x2 = cropRect.x1 + dw;
    cropRect.y2 = cropRect.y1 + dh;
  } else {
    let nx1 = r.x1, ny1 = r.y1, nx2 = r.x2, ny2 = r.y2;
    if (cropDrag === 'nw' || cropDrag === 'sw') nx1 = Math.max(0, Math.min(r.x2 - MIN, r.x1 + dx));
    if (cropDrag === 'ne' || cropDrag === 'se') nx2 = Math.min(1, Math.max(r.x1 + MIN, r.x2 + dx));
    if (cropDrag === 'nw' || cropDrag === 'ne') ny1 = Math.max(0, Math.min(r.y2 - MIN, r.y1 + dy));
    if (cropDrag === 'sw' || cropDrag === 'se') ny2 = Math.min(1, Math.max(r.y1 + MIN, r.y2 + dy));
    if (cropAspect) {
      const [aw, ah] = cropAspect;
      const nw = (nx2 - nx1) * srcImage.width;
      const nh = nw * ah / aw / srcImage.height;
      if (cropDrag === 'nw' || cropDrag === 'sw') ny1 = cropDrag === 'nw' ? ny2 - nh : r.y1;
      if (cropDrag === 'ne' || cropDrag === 'se') ny2 = cropDrag === 'se' ? ny1 + nh : r.y2;
    }
    cropRect.x1 = nx1; cropRect.y1 = ny1;
    cropRect.x2 = nx2; cropRect.y2 = ny2;
  }
  renderCropMode();
}

function applyCrop() {
  if (!srcImage) return;
  const sw = srcImage.width, sh = srcImage.height;
  const cx = Math.round(cropRect.x1 * sw);
  const cy = Math.round(cropRect.y1 * sh);
  const cw = Math.max(1, Math.round((cropRect.x2 - cropRect.x1) * sw));
  const ch = Math.max(1, Math.round((cropRect.y2 - cropRect.y1) * sh));
  const c  = document.createElement('canvas');
  c.width  = cw; c.height = ch;
  c.getContext('2d').drawImage(srcImage, cx, cy, cw, ch, 0, 0, cw, ch);
  srcImage = c;
  exitCropMode(false);
  renderThumbs();
  renderPreview(activeId);
}

function openEditPanel() {
  preEditActive = activeId;
  buildSliders();
  editPanel.classList.add('open');
  if (srcImage) renderCustomPreview();
}

function closeEditPanel(restore) {
  editPanel.classList.remove('open');
  if (restore && srcImage) renderPreview(activeId);
}

adjustBtn.addEventListener('click', () => {
  editPanel.classList.contains('open') ? closeEditPanel(true) : openEditPanel();
});

editClose.addEventListener('click', () => {
  activeId = preEditActive;
  document.querySelectorAll('.filter-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === activeId)
  );
  closeEditPanel(true);
});

editReset.addEventListener('click', () => {
  for (const s of SLIDER_DEFS) customSettings[s.id] = s.def;
  syncSliderUI();
  if (srcImage) renderCustomPreview();
});

editSave.addEventListener('click', () => {
  const name   = presetNameInput.value.trim() || `Custom ${customPresets.length + 1}`;
  const preset = { id: `custom-${Date.now()}`, label: name, settings: { ...customSettings } };
  customPresets.push(preset);
  addPresetToStrip(preset);
  presetNameInput.value = '';
  editPanel.classList.remove('open');
  selectFilter(preset.id);
});

buildSliders();

// ── Bloom ─── bright, airy, rosy, lifestyle/flatlay ────────────────────────
function fBloom(imageData) {
  const d  = imageData.data;
  const al = lut(v => v * 0.88 + 26);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    r = al[r]; g = al[g]; b = al[b];
    // Warm rosy tint
    r = clamp(r + 14 | 0);
    g = clamp(g +  5 | 0);
    b = clamp(b -  5 | 0);
    // Slight desat for clean airy feel
    const gr = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clamp(gr + (r - gr) * 0.88 | 0);
    g = clamp(gr + (g - gr) * 0.88 | 0);
    b = clamp(gr + (b - gr) * 0.88 | 0);
    d[i]     = clamp(r);
    d[i + 1] = clamp(g);
    d[i + 2] = clamp(b);
  }
}

// ══ TAB SWITCHING ═══════════════════════════════════════════════════════════
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const t = btn.dataset.tab;
    document.getElementById('tab-filters').style.display = t === 'filters' ? 'grid' : 'none';
    document.getElementById('tab-grid').style.display    = t === 'grid'    ? 'flex' : 'none';
  });
});

// ══ GRID SPLIT ══════════════════════════════════════════════════════════════
let gridSrc    = null;
let gridN      = 3;
let gridRatioW = 9;
let gridRatioH = 16;
let gridPanX   = 0;  // pan offset in source pixels (+ = shift crop left)
let gridPanY   = 0;
let gridDispScale = 1; // display scale, updated each gridRender()

const gridDropzone    = document.getElementById('grid-dropzone');
const gridDropLabel   = document.getElementById('grid-drop-label');
const gridOverlayCanvas = document.getElementById('grid-overlay-canvas');
const gridOCtx        = gridOverlayCanvas.getContext('2d');
const gridDeleteBtn   = document.getElementById('grid-delete-btn');
const gridFileInput   = document.getElementById('grid-file-input');
const gridFooter      = document.getElementById('grid-footer');
const gridInfoEl      = document.getElementById('grid-info');
const gridDlBtn       = document.getElementById('grid-dl-btn');

// Upload
gridDropzone.addEventListener('click', () => { if (!gridSrc) gridFileInput.click(); });
gridFileInput.addEventListener('change', e => gridLoadFile(e.target.files[0]));
gridDropzone.addEventListener('dragover',  e => { e.preventDefault(); gridDropzone.classList.add('drag-over'); });
gridDropzone.addEventListener('dragleave', () => gridDropzone.classList.remove('drag-over'));
gridDropzone.addEventListener('drop', e => {
  e.preventDefault();
  gridDropzone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f?.type.startsWith('image/')) gridLoadFile(f);
});

function gridLoadFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img  = new Image();
  img.onload = () => {
    gridSrc = img;
    gridPanX = 0; gridPanY = 0;
    URL.revokeObjectURL(url);
    gridDropLabel.style.display       = 'none';
    gridOverlayCanvas.style.display   = 'block';
    gridDeleteBtn.style.display       = 'flex';
    gridDropzone.classList.add('has-image');
    gridRender();
  };
  img.src = url;
}

gridDeleteBtn.addEventListener('click', e => {
  e.stopPropagation();
  gridSrc = null;
  gridOCtx.clearRect(0, 0, gridOverlayCanvas.width, gridOverlayCanvas.height);
  gridOverlayCanvas.style.display = 'none';
  gridDropLabel.style.display     = '';
  gridDeleteBtn.style.display     = 'none';
  gridDropzone.classList.remove('has-image');
  gridFooter.style.display        = 'none';
  const gridTileStrip = document.getElementById('grid-tile-strip');
  if (gridTileStrip) { gridTileStrip.style.display = 'none'; document.getElementById('grid-tile-list').innerHTML = ''; }
  gridFileInput.value             = '';
});

// Tile count buttons
document.querySelectorAll('#grid-tile-btns .gctrl-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#grid-tile-btns .gctrl-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gridN = +btn.dataset.n;
    if (gridSrc) gridRender();
  });
});

// Ratio buttons
document.querySelectorAll('#grid-ratio-btns .gctrl-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#grid-ratio-btns .gctrl-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const [rw, rh] = btn.dataset.ratio.split(':').map(Number);
    gridRatioW = rw; gridRatioH = rh;
    if (gridSrc) gridRender();
  });
});

// ── Grid pan ─────────────────────────────────────────────────────────────────
{
  let panning = false, startX = 0, startY = 0, startPanX = 0, startPanY = 0;

  function gridPanStart(cx, cy) {
    if (!gridSrc) return;
    panning = true;
    startX = cx; startY = cy;
    startPanX = gridPanX; startPanY = gridPanY;
    gridDropzone.style.cursor = 'grabbing';
  }
  function gridPanMove(cx, cy) {
    if (!panning) return;
    const s = gridDispScale || 1;
    gridPanX = startPanX + (cx - startX) / s;
    gridPanY = startPanY + (cy - startY) / s;
    gridRender();
  }
  function gridPanEnd() {
    if (!panning) return;
    panning = false;
    gridDropzone.style.cursor = 'grab';
  }

  gridDropzone.addEventListener('mousedown', e => { if (gridSrc) { gridPanStart(e.clientX, e.clientY); e.preventDefault(); } });
  document.addEventListener('mousemove',     e => gridPanMove(e.clientX, e.clientY));
  document.addEventListener('mouseup',       ()  => gridPanEnd());

  gridDropzone.addEventListener('touchstart', e => { if (gridSrc && e.touches.length === 1) { gridPanStart(e.touches[0].clientX, e.touches[0].clientY); } }, { passive: true });
  gridDropzone.addEventListener('touchmove',  e => { if (e.touches.length === 1) { gridPanMove(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); } }, { passive: false });
  gridDropzone.addEventListener('touchend',   ()  => gridPanEnd());
}

function gridCropParams() {
  const imgW = gridSrc.naturalWidth  || gridSrc.width;
  const imgH = gridSrc.naturalHeight || gridSrc.height;
  const totalAR = (gridRatioW * gridN) / gridRatioH;
  const imgAR   = imgW / imgH;
  let srcX, srcY, srcW, srcH;
  if (imgAR >= totalAR) {
    srcH = imgH;
    srcW = Math.round(imgH * totalAR);
    srcX = Math.max(0, Math.min(imgW - srcW, Math.round((imgW - srcW) / 2 - gridPanX)));
    srcY = 0;
  } else {
    srcW = imgW;
    srcH = Math.round(imgW / totalAR);
    srcX = 0;
    srcY = Math.max(0, Math.min(imgH - srcH, Math.round((imgH - srcH) / 2 - gridPanY)));
  }
  return { srcX, srcY, srcW, srcH,
           tileW: Math.round(srcW / gridN), tileH: srcH };
}

function gridRender() {
  if (!gridSrc) return;

  // Sync canvas pixel dimensions to its CSS display size
  gridOverlayCanvas.width  = gridDropzone.offsetWidth;
  gridOverlayCanvas.height = gridDropzone.offsetHeight;
  const W = gridOverlayCanvas.width, H = gridOverlayCanvas.height;
  const ctx = gridOCtx;

  // Draw source image scaled to fit (contain)
  const imgW = gridSrc.naturalWidth  || gridSrc.width;
  const imgH = gridSrc.naturalHeight || gridSrc.height;
  const scale  = Math.min(W / imgW, H / imgH);
  gridDispScale = scale;
  const dispW  = imgW * scale, dispH = imgH * scale;
  const imgOffX = (W - dispW) / 2, imgOffY = (H - dispH) / 2;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(gridSrc, imgOffX, imgOffY, dispW, dispH);

  // Map crop region to display coords
  const { srcX, srcY, srcW, srcH, tileW, tileH } = gridCropParams();
  const cx  = imgOffX + srcX * scale;
  const cy  = imgOffY + srcY * scale;
  const cw  = srcW * scale;
  const ch  = srcH * scale;
  const tdw = cw / gridN;   // tile display width

  // Dim the parts outside the crop region
  ctx.fillStyle = 'rgba(0,0,0,0.52)';
  if (cx > imgOffX)           ctx.fillRect(imgOffX,  imgOffY, cx - imgOffX,                   dispH);
  if (cx + cw < imgOffX + dispW) ctx.fillRect(cx + cw, imgOffY, (imgOffX + dispW) - (cx + cw), dispH);
  if (cy > imgOffY)           ctx.fillRect(cx,  imgOffY, cw, cy - imgOffY);
  if (cy + ch < imgOffY + dispH) ctx.fillRect(cx, cy + ch, cw, (imgOffY + dispH) - (cy + ch));

  // Crop border
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth   = 1;
  ctx.strokeRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1);

  // Cut lines between tiles
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([]);
  for (let i = 1; i < gridN; i++) {
    const lx = Math.round(cx + i * tdw) + 0.5;
    ctx.beginPath();
    ctx.moveTo(lx, cy);
    ctx.lineTo(lx, cy + ch);
    ctx.stroke();
  }

  // Tile number labels (bottom-center of each tile)
  ctx.font         = `bold ${Math.max(10, Math.round(ch * 0.08))}px -apple-system, sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  const fontSize   = Math.max(10, Math.round(ch * 0.08));
  const padX = fontSize * 1.2, padY = fontSize * 0.55;
  for (let i = 0; i < gridN; i++) {
    const lx  = cx + (i + 0.5) * tdw;
    const ly  = cy + ch * 0.5;
    const txt = String(i + 1);
    const tw  = ctx.measureText(txt).width;
    // Pill background
    ctx.fillStyle = 'rgba(0,0,0,0.52)';
    const rx = lx - tw / 2 - padX / 2, ry = ly - padY;
    const rw2 = tw + padX, rh2 = padY * 2;
    const r   = rh2 / 2;
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.arcTo(rx + rw2, ry, rx + rw2, ry + rh2, r);
    ctx.arcTo(rx + rw2, ry + rh2, rx, ry + rh2, r);
    ctx.arcTo(rx, ry + rh2, rx, ry, r);
    ctx.arcTo(rx, ry, rx + rw2, ry, r);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillText(txt, lx, ly);
  }

  // Footer info
  gridFooter.style.display  = 'flex';
  gridInfoEl.textContent    = `${gridN} tiles · ${tileW} × ${tileH}px each`;

  // Tile preview strip
  const tileList  = document.getElementById('grid-tile-list');
  const tileStrip = document.getElementById('grid-tile-strip');
  tileList.innerHTML = '';
  const thumbH = 72;
  const thumbW = Math.max(1, Math.round(thumbH * gridRatioW / gridRatioH));
  for (let i = 0; i < gridN; i++) {
    const item  = document.createElement('div');
    item.className = 'grid-tile-item';
    const c = document.createElement('canvas');
    c.className = 'grid-tile-thumb';
    c.width = thumbW; c.height = thumbH;
    c.getContext('2d').drawImage(gridSrc, srcX + i * tileW, srcY, tileW, tileH, 0, 0, thumbW, thumbH);
    const lbl = document.createElement('span');
    lbl.className = 'grid-tile-label';
    lbl.textContent = i + 1;
    item.appendChild(c); item.appendChild(lbl);
    tileList.appendChild(item);
  }
  tileStrip.style.display = 'flex';
}

gridDlBtn.addEventListener('click', async () => {
  if (!gridSrc || typeof JSZip === 'undefined') return;
  const { srcX, srcY, srcW, srcH, tileW, tileH } = gridCropParams();
  const zip      = new JSZip();
  const promises = [];
  for (let i = 0; i < gridN; i++) {
    const c   = document.createElement('canvas');
    c.width   = tileW; c.height = tileH;
    c.getContext('2d').drawImage(gridSrc, srcX + i * tileW, srcY, tileW, tileH, 0, 0, tileW, tileH);
    promises.push(
      new Promise(res => c.toBlob(res, 'image/jpeg', 0.92))
        .then(blob => zip.file(`tile_${i + 1}.jpg`, blob))
    );
  }
  await Promise.all(promises);
  const content = await zip.generateAsync({ type: 'blob' });
  const a       = document.createElement('a');
  a.download    = 'grid-split.zip';
  a.href        = URL.createObjectURL(content);
  a.click();
  URL.revokeObjectURL(a.href);
});

window.addEventListener('resize', () => { if (gridSrc) gridRender(); });

// ── Grid tile strip drag-scroll ─────────────────────────────────────────────
{
  const inner = document.getElementById('grid-tile-inner');
  let dragging = false, startX = 0, scrollLeft = 0;
  inner.addEventListener('mousedown', e => {
    dragging = true; startX = e.pageX; scrollLeft = inner.scrollLeft;
    inner.classList.add('is-dragging');
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    inner.scrollLeft = scrollLeft - (e.pageX - startX);
  });
  document.addEventListener('mouseup', () => {
    dragging = false; inner.classList.remove('is-dragging');
  });
}

// ── Filter strip drag-scroll ────────────────────────────────────────────────
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
