'use strict';

// ── Slider config + custom settings ────────────────────────────────────────
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

// ── State ──────────────────────────────────────────────────────────────────
let preEditActive = 'original';
let compareMode   = false;
let compareDivX   = 0.5;
let compareDrag   = false;
let cropMode      = false;
let cropRect      = { x1: 0, y1: 0, x2: 1, y2: 1 };
let cropDrag      = null;
let cropDragStart = null;
let cropAspect    = null;
let wmActive      = false;
let wmPosition    = 'br';
let wmCursive     = false;

// ── Intensity ──────────────────────────────────────────────────────────────
intensitySlider.addEventListener('input', () => {
  filterIntensity = +intensitySlider.value;
  intensityVal.textContent = filterIntensity + '%';
  if (srcImage) renderPreview(activeId);
  if (srcImage) renderThumbs();
});

// ── Rotate / Flip ──────────────────────────────────────────────────────────
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

// ── Compare ────────────────────────────────────────────────────────────────
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

  const divX = Math.round(w * compareDivX);
  pCtx.save();
  pCtx.beginPath();
  pCtx.rect(0, 0, divX, h);
  pCtx.clip();
  pCtx.drawImage(srcImage, 0, 0, w, h);
  pCtx.restore();

  pCtx.save();
  pCtx.strokeStyle = 'rgba(255,255,255,0.9)';
  pCtx.lineWidth   = 1.5;
  pCtx.beginPath(); pCtx.moveTo(divX, 0); pCtx.lineTo(divX, h); pCtx.stroke();

  const hr = 18, hy = h / 2;
  pCtx.fillStyle   = '#fff';
  pCtx.beginPath(); pCtx.arc(divX, hy, hr, 0, Math.PI * 2); pCtx.fill();
  pCtx.fillStyle   = '#222';
  pCtx.font        = '14px sans-serif';
  pCtx.textAlign   = 'center';
  pCtx.textBaseline = 'middle';
  pCtx.fillText('⇔', divX, hy);

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

// ── Crop ───────────────────────────────────────────────────────────────────
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

  pCtx.fillStyle = 'rgba(0,0,0,0.55)';
  pCtx.fillRect(0,  0,  w,      y1);
  pCtx.fillRect(0,  y2, w,      h - y2);
  pCtx.fillRect(0,  y1, x1,     y2 - y1);
  pCtx.fillRect(x2, y1, w - x2, y2 - y1);

  pCtx.strokeStyle = '#fff';
  pCtx.lineWidth   = 1.5;
  pCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);

  pCtx.strokeStyle = 'rgba(255,255,255,0.22)';
  pCtx.lineWidth   = 0.5;
  for (let i = 1; i <= 2; i++) {
    const gx = x1 + (x2 - x1) * i / 3;
    const gy = y1 + (y2 - y1) * i / 3;
    pCtx.beginPath(); pCtx.moveTo(gx, y1); pCtx.lineTo(gx, y2); pCtx.stroke();
    pCtx.beginPath(); pCtx.moveTo(x1, gy); pCtx.lineTo(x2, gy); pCtx.stroke();
  }

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

// ── Custom Filter Panel ────────────────────────────────────────────────────
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

// ── Init ───────────────────────────────────────────────────────────────────
buildSliders();
