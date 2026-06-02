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

// ── DOM ────────────────────────────────────────────────────────────────────
const dropzone        = document.getElementById('dropzone');
const dropLabel       = document.getElementById('drop-label');
const previewCanvas   = document.getElementById('preview-canvas');
const pCtx            = previewCanvas.getContext('2d', { willReadFrequently: true });
const fileInput       = document.getElementById('file-input');
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
