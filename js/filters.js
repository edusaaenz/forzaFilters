'use strict';

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

// ── Filter Router ──────────────────────────────────────────────────────────
function runFilter(imageData, id, w, h) {
  if (id.startsWith('custom-')) {
    const p = customPresets.find(p => p.id === id);
    if (p) fCustom(imageData, w, h, p.settings);
    return;
  }
  switch (id) {
    case '8k':       f8K(imageData, w, h);       break;
    case 'antigua':  fAntiqua(imageData);         break;
    case 'vivid':    fVivid(imageData);           break;
    case 'japonesa': fJaponesa(imageData);        break;
    case 'polaroid': fPolaroid(imageData);        break;
    case 'noir':     fNoir(imageData);            break;
    case 'dreamy':   fDreamy(imageData);          break;
    case 'y2k':      fY2K(imageData, w, h);       break;
    case 'y2kflash': fY2KFlash(imageData, w, h);  break;
    case 'golden':   fGolden(imageData);          break;
    case 'film':     fFilm(imageData);            break;
    case 'pacific':  fPacific(imageData);         break;
    case 'moody':    fMoody(imageData);           break;
    case 'fade':     fFade(imageData);            break;
    case 'bloom':    fBloom(imageData);           break;
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

// ══ FILTER IMPLEMENTATIONS ══════════════════════════════════════════════════

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

function fY2KFlash(imageData, w, h) {
  const d  = imageData.data;
  const hc = lut(v => v < 195 ? v : 195 + (v - 195) * 0.18);
  const cx = w / 2, cy = h / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = d[i], g = d[i + 1], b = d[i + 2];
      const gr = 0.299 * r + 0.587 * g + 0.114 * b;
      r = clamp(gr + (r - gr) * 0.88 | 0);
      g = clamp(gr + (g - gr) * 0.88 | 0);
      b = clamp(gr + (b - gr) * 0.88 | 0);
      r = clamp(r * 1.05 | 0);
      g = clamp(g * 1.08 | 0);
      b = clamp(b * 0.80 | 0);
      const dx = x - cx, dy = y - cy;
      const dist  = Math.sqrt(dx * dx + dy * dy) / maxDist;
      const flash = Math.max(0, 1 - dist * dist);
      const mult  = 1 + flash * 1.15;
      r = hc[clamp(r * mult | 0)];
      g = hc[clamp(g * mult | 0)];
      b = hc[clamp(b * mult | 0)];
      d[i]     = clamp(r + (Math.random() - 0.5) * 14);
      d[i + 1] = clamp(g + (Math.random() - 0.5) * 12);
      d[i + 2] = clamp(b + (Math.random() - 0.5) * 16);
    }
  }
}

function fGolden(imageData) {
  const d  = imageData.data;
  const sl = lut(v => v * 0.91 + 16);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    r = sl[r]; g = sl[g]; b = sl[b];
    r = clamp(r * 1.12 + 10 | 0);
    g = clamp(g * 1.04 +  2 | 0);
    b = clamp(b * 0.82      | 0);
    const gr = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clamp(gr + (r - gr) * 1.20 | 0);
    g = clamp(gr + (g - gr) * 1.12 | 0);
    b = clamp(gr + (b - gr) * 0.88 | 0);
    d[i]     = clamp(r);
    d[i + 1] = clamp(g);
    d[i + 2] = clamp(b);
  }
}

function fFilm(imageData) {
  const d  = imageData.data;
  const sl = lut(v => v * 0.91 + 15);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    r = sl[r]; g = sl[g]; b = sl[b];
    r = clamp(r + 12 | 0);
    g = clamp(g +  4 | 0);
    b = clamp(b -  8 | 0);
    const gr = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clamp(gr + (r - gr) * 0.86 | 0);
    g = clamp(gr + (g - gr) * 0.86 | 0);
    b = clamp(gr + (b - gr) * 0.86 | 0);
    const noise = (Math.random() - 0.5) * 9;
    d[i]     = clamp(r + noise);
    d[i + 1] = clamp(g + noise);
    d[i + 2] = clamp(b + noise);
  }
}

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
    r = clamp(r * 0.87 | 0);
    g = clamp(g * 1.03 | 0);
    b = clamp(b * 1.13 | 0);
    const gr = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clamp(gr + (r - gr) * 1.12 | 0);
    g = clamp(gr + (g - gr) * 1.12 | 0);
    b = clamp(gr + (b - gr) * 1.12 | 0);
    d[i]     = cc[clamp(r)];
    d[i + 1] = cc[clamp(g)];
    d[i + 2] = cc[clamp(b)];
  }
}

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
    r = clamp(r + bright * 22 | 0);
    g = clamp(g + bright *  6 | 0);
    b = clamp(b - bright * 15 | 0);
    r = clamp(r - dark * 18   | 0);
    g = clamp(g + dark *  5   | 0);
    b = clamp(b + dark * 20   | 0);
    d[i]     = cc[clamp(r)];
    d[i + 1] = cc[clamp(g)];
    d[i + 2] = cc[clamp(b)];
  }
}

function fFade(imageData) {
  const d  = imageData.data;
  const fc = lut(v => v * 0.72 + 42);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    r = fc[r]; g = fc[g]; b = fc[b];
    const gr = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clamp(gr + (r - gr) * 0.78 | 0);
    g = clamp(gr + (g - gr) * 0.78 | 0);
    b = clamp(gr + (b - gr) * 0.78 | 0);
    b = clamp(b + 5);
    d[i]     = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
}

function fBloom(imageData) {
  const d  = imageData.data;
  const al = lut(v => v * 0.88 + 26);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    r = al[r]; g = al[g]; b = al[b];
    r = clamp(r + 14 | 0);
    g = clamp(g +  5 | 0);
    b = clamp(b -  5 | 0);
    const gr = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clamp(gr + (r - gr) * 0.88 | 0);
    g = clamp(gr + (g - gr) * 0.88 | 0);
    b = clamp(gr + (b - gr) * 0.88 | 0);
    d[i]     = clamp(r);
    d[i + 1] = clamp(g);
    d[i + 2] = clamp(b);
  }
}

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
