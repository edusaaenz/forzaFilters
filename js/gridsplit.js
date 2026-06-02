'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let gridSrc       = null;
let gridN         = 3;
let gridRatioW    = 9;
let gridRatioH    = 16;
let gridPanX      = 0;
let gridPanY      = 0;
let gridDispScale = 1;

// ── DOM ────────────────────────────────────────────────────────────────────
const gridDropzone      = document.getElementById('grid-dropzone');
const gridDropLabel     = document.getElementById('grid-drop-label');
const gridOverlayCanvas = document.getElementById('grid-overlay-canvas');
const gridOCtx          = gridOverlayCanvas.getContext('2d');
const gridDeleteBtn     = document.getElementById('grid-delete-btn');
const gridFileInput     = document.getElementById('grid-file-input');
const gridFooter        = document.getElementById('grid-footer');
const gridInfoEl        = document.getElementById('grid-info');
const gridDlBtn         = document.getElementById('grid-dl-btn');

// ── Upload ─────────────────────────────────────────────────────────────────
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
    gridDropLabel.style.display     = 'none';
    gridOverlayCanvas.style.display = 'block';
    gridDeleteBtn.style.display     = 'flex';
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
  gridFileInput.value = '';
});

// ── Controls ───────────────────────────────────────────────────────────────
document.querySelectorAll('#grid-tile-btns .gctrl-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#grid-tile-btns .gctrl-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gridN = +btn.dataset.n;
    if (gridSrc) gridRender();
  });
});

document.querySelectorAll('#grid-ratio-btns .gctrl-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#grid-ratio-btns .gctrl-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const [rw, rh] = btn.dataset.ratio.split(':').map(Number);
    gridRatioW = rw; gridRatioH = rh;
    if (gridSrc) gridRender();
  });
});

// ── Pan ────────────────────────────────────────────────────────────────────
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

// ── Crop params ────────────────────────────────────────────────────────────
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

// ── Render ─────────────────────────────────────────────────────────────────
function gridRender() {
  if (!gridSrc) return;

  gridOverlayCanvas.width  = gridDropzone.offsetWidth;
  gridOverlayCanvas.height = gridDropzone.offsetHeight;
  const W = gridOverlayCanvas.width, H = gridOverlayCanvas.height;
  const ctx = gridOCtx;

  const imgW = gridSrc.naturalWidth  || gridSrc.width;
  const imgH = gridSrc.naturalHeight || gridSrc.height;
  const scale   = Math.min(W / imgW, H / imgH);
  gridDispScale = scale;
  const dispW   = imgW * scale, dispH = imgH * scale;
  const imgOffX = (W - dispW) / 2, imgOffY = (H - dispH) / 2;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(gridSrc, imgOffX, imgOffY, dispW, dispH);

  const { srcX, srcY, srcW, srcH, tileW, tileH } = gridCropParams();
  const cx  = imgOffX + srcX * scale;
  const cy  = imgOffY + srcY * scale;
  const cw  = srcW * scale;
  const ch  = srcH * scale;
  const tdw = cw / gridN;

  ctx.fillStyle = 'rgba(0,0,0,0.52)';
  if (cx > imgOffX)              ctx.fillRect(imgOffX,  imgOffY, cx - imgOffX,                   dispH);
  if (cx + cw < imgOffX + dispW) ctx.fillRect(cx + cw,  imgOffY, (imgOffX + dispW) - (cx + cw), dispH);
  if (cy > imgOffY)              ctx.fillRect(cx,  imgOffY, cw, cy - imgOffY);
  if (cy + ch < imgOffY + dispH) ctx.fillRect(cx, cy + ch, cw, (imgOffY + dispH) - (cy + ch));

  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth   = 1;
  ctx.strokeRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1);

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

  gridFooter.style.display = 'flex';
  gridInfoEl.textContent   = `${gridN} tiles · ${tileW} × ${tileH}px each`;

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

// ── Download ZIP ───────────────────────────────────────────────────────────
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

// ── Tile strip drag-scroll ─────────────────────────────────────────────────
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
