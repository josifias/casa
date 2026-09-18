// ============================================================
// 01 · CORE — imports, configuração, utilitários e texturas
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PARAMS = new URLSearchParams(location.search);
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const IS_SMALL = Math.min(innerWidth, innerHeight) < 600;
const LOW_END = IS_TOUCH && (navigator.hardwareConcurrency || 4) <= 4;

// Medidas (metros). X = oeste→leste, Z = norte→sul, origem no canto interno NO.
const H = 2.50;          // pé-direito
const T = 0.10;          // espessura das paredes
const W_IN = 7.40;       // largura interna total
const D_IN = 4.60;       // profundidade interna total
const CX = W_IN / 2, CZ = D_IN / 2;
const EYE = 1.55;
const DOOR_H = 2.10;

const ROOMS = {
  infantil: { nome: 'Quarto infantil', short: 'Infantil', rect: [0, 0, 2.40, 3.00], dims: '2,40 × 3,00 m', area: '7,20 m²' },
  sala:     { nome: 'Sala estar/jantar', short: 'Sala', rect: [2.50, 0, 4.90, 3.10], dims: '2,40 × 3,10 m', area: '7,44 m²' },
  casal:    { nome: 'Quarto casal', short: 'Casal', rect: [5.00, 0, 7.40, 3.00], dims: '2,40 × 3,00 m', area: '7,20 m²' },
  cozinha:  { nome: 'Cozinha / serviço', short: 'Cozinha', rect: [0, 3.10, 5.30, 4.60], dims: '5,30 × 1,50 m', area: '7,95 m²' },
  banheiro: { nome: 'Banheiro', short: 'Banheiro', rect: [5.40, 3.10, 7.40, 4.60], dims: '2,00 × 1,50 m', area: '3,00 m²' },
};

// Pontos de vista do passeio (posição e alvo em coordenadas da planta)
const VIEWS = [
  { id: 'entrada',  nome: 'Entrada',     pos: [4.72, 4.18], look: [3.30, 1.30], icon: 'door' },
  { id: 'sala',     nome: 'Sala',        pos: [3.85, 0.80], look: [2.90, 3.30], icon: 'sofa' },
  { id: 'cozinha',  nome: 'Cozinha',     pos: [4.40, 2.60], look: [2.30, 4.35], icon: 'stove', fov: 75 },
  { id: 'servico',  nome: 'Serviço',     pos: [3.40, 3.72], look: [0.50, 4.25], icon: 'wash', fov: 80 },
  { id: 'banheiro', nome: 'Banheiro',    pos: [5.72, 3.45], look: [7.30, 4.10], icon: 'bath', fov: 78 },
  { id: 'casal',    nome: 'Quarto casal', pos: [5.28, 2.74], look: [7.10, 0.70], icon: 'bed', fov: 78 },
  { id: 'infantil', nome: 'Infantil',    pos: [2.20, 1.30], look: [0.20, 1.75], icon: 'kids', fov: 88 },
];

function roomAt(x, z) {
  if (z < 3.06) { if (x < 2.45) return 'infantil'; if (x < 4.95) return 'sala'; return 'casal'; }
  if (x >= 5.35) return 'banheiro';
  if (x < 1.55) return 'servico';
  if (x < 4.30) return 'cozinha';
  return 'entrada';
}

// ---------- utilitários ----------
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

let MAX_ANISO = 4;
function canvasTex(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = MAX_ANISO;
  return t;
}

// ---------- texturas procedurais ----------
function grainLines(g, x, y, w, h, R, alpha = .07, horizontal = true) {
  const n = Math.floor((horizontal ? h : w) / 2.2);
  for (let i = 0; i < n; i++) {
    g.strokeStyle = `rgba(60,40,20,${0.015 + R() * alpha})`;
    g.lineWidth = 0.4 + R() * 1.6;
    const off = R() * (horizontal ? h : w), amp = 0.5 + R() * 3.5, fr = 0.004 + R() * 0.018, ph = R() * 6.28;
    g.beginPath();
    const len = horizontal ? w : h;
    for (let t = 0; t <= len + 8; t += 8) {
      const d = off + Math.sin(t * fr + ph) * amp;
      if (horizontal) (t ? g.lineTo(x + t, y + d) : g.moveTo(x + t, y + d));
      else (t ? g.lineTo(x + d, y + t) : g.moveTo(x + d, y + t));
    }
    g.stroke();
  }
}

function makeTextures() {
  const TX = {};

  // Veio de madeira em tons claros (cor final vem do material) — 1 m
  TX.grain = canvasTex(512, 512, (g, w, h) => {
    const R = rng(11);
    g.fillStyle = '#f4f1ec'; g.fillRect(0, 0, w, h);
    grainLines(g, 0, 0, w, h, R, .10, true);
    for (let i = 0; i < 3; i++) { // nós discretos
      const x = R() * w, y = R() * h;
      const gr = g.createRadialGradient(x, y, 1, x, y, 10 + R() * 12);
      gr.addColorStop(0, 'rgba(90,60,30,.18)'); gr.addColorStop(1, 'rgba(90,60,30,0)');
      g.fillStyle = gr; g.fillRect(x - 25, y - 25, 50, 50);
    }
  });
  TX.grain.userData = { uv: 1.0 };

  // Piso vinílico (réguas de 21 cm), 1,26 m por repetição
  TX.planks = canvasTex(1024, 1024, (g, w, h) => {
    const R = rng(7), cols = 6, pw = w / cols;
    const tones = ['#caa37a', '#c49b70', '#cfa982', '#bf966c', '#d2ad86', '#c7a077'];
    for (let c = 0; c < cols; c++) {
      const x = c * pw;
      let y = R() * h;
      for (let k = 0; k < 2; k++) {
        const len = h * (0.45 + R() * 0.55);
        const tone = tones[Math.floor(R() * tones.length)];
        for (const yy of [y, y - h]) {
          g.save(); g.beginPath(); g.rect(x, yy, pw, len); g.clip();
          g.fillStyle = tone; g.fillRect(x, yy, pw, len);
          grainLines(g, x, yy, pw, len, R, .09, false);
          g.restore();
          g.fillStyle = 'rgba(60,40,25,.35)'; g.fillRect(x, yy, pw, 2);
        }
        y += len;
      }
      g.fillStyle = 'rgba(60,40,25,.35)'; g.fillRect(x, 0, 2, h);
    }
  });
  TX.planks.userData = { uv: 1.26 };

  // Parede com textura de linho (clara; cor vem do material), 1 m
  TX.linen = canvasTex(512, 512, (g, w, h) => {
    const R = rng(3);
    g.fillStyle = '#f7f5f2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${R() < .5 ? '0,0,0' : '255,255,255'},${0.02 + R() * 0.035})`;
      g.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2);
    }
    g.globalAlpha = .035; g.strokeStyle = '#000';
    for (let y = 0; y < h; y += 3) { g.beginPath(); g.moveTo(0, y + R()); g.lineTo(w, y + R()); g.stroke(); }
    for (let x = 0; x < w; x += 4) { g.beginPath(); g.moveTo(x + R(), 0); g.lineTo(x + R(), h); g.stroke(); }
    g.globalAlpha = 1;
  });
  TX.linen.userData = { uv: 1.0 };

  // Porcelanato 60×60, 1,20 m por repetição
  TX.tile = canvasTex(512, 512, (g, w, h) => {
    const R = rng(21);
    g.fillStyle = '#f2f0ec'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = R() * w, y = R() * h, r = 10 + R() * 50;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(120,110,100,${R() * .05})`); gr.addColorStop(1, 'rgba(120,110,100,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    g.fillStyle = 'rgba(150,140,130,.55)';
    for (const p of [0, 256]) { g.fillRect(p - 1, 0, 2, h); g.fillRect(0, p - 1, w, 2); }
    g.fillRect(w - 1, 0, 1, h); g.fillRect(0, h - 1, w, 1);
  });
  TX.tile.userData = { uv: 1.2 };

  // Revestimento branco 30×60 (box, bancada), 1,20 m
  TX.wtile = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#fbfbfa'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(170,165,160,.55)';
    for (let y = 0; y <= h; y += 128) g.fillRect(0, y - 1, w, 2);
    for (let r = 0; r < 4; r++) for (const x of [0, 256]) g.fillRect(x - 1, r * 128, 2, 128);
  });
  TX.wtile.userData = { uv: 1.2 };

  // Juta / sisal
  TX.jute = canvasTex(256, 256, (g, w, h) => {
    const R = rng(5);
    g.fillStyle = '#e9e1d4'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) {
      const odd = ((x + y) / 8) % 2;
      g.fillStyle = `rgba(90,70,45,${0.10 + R() * 0.12 + odd * .08})`;
      g.fillRect(x + 1, y + 1, 6, 6);
    }
  });
  TX.jute.userData = { uv: 0.4 };

  // Palhinha (cane)
  TX.cane = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e6cf9c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6e5a3c';
    for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) { g.beginPath(); g.arc(x + 8, y + 8, 4.2, 0, 6.29); g.fill(); }
    g.strokeStyle = 'rgba(160,120,60,.8)'; g.lineWidth = 2;
    for (let i = -h; i < w; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); }
  });
  TX.cane.userData = { uv: 0.25 };

  // Papel de parede confete (estilo tour)
  TX.confetti = canvasTex(512, 512, (g, w, h) => {
    const R = rng(9);
    g.fillStyle = '#f3eee6'; g.fillRect(0, 0, w, h);
    const cols = ['#d06a3f', '#e6b04a', '#6f8c94', '#e9a7a0', '#8aa37b', '#b8543b'];
    for (let i = 0; i < 520; i++) {
      const x = R() * w, y = R() * h;
      g.save(); g.translate(x, y); g.rotate(R() * 6.28);
      g.fillStyle = cols[Math.floor(R() * cols.length)];
      g.beginPath(); g.ellipse(0, 0, 2 + R() * 4, 1.2 + R() * 2, 0, 0, 6.29); g.fill();
      g.restore();
    }
  });
  TX.confetti.userData = { uv: 0.8 };

  // Papel de parede de cogumelos e folhas (estilo fotos)
  TX.mushroom = canvasTex(512, 512, (g, w, h) => {
    const R = rng(13);
    g.fillStyle = '#f6f3ee'; g.fillRect(0, 0, w, h);
    const leaf = (x, y, a, c) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, 9, 3.2, 0, 0, 6.29); g.fill(); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = .6; g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.stroke(); g.restore(); };
    const mush = (x, y, s) => {
      g.fillStyle = '#efe6d8'; g.fillRect(x - 1.6 * s, y, 3.2 * s, 7 * s);
      g.fillStyle = '#c0392b'; g.beginPath(); g.ellipse(x, y, 6.5 * s, 4.5 * s, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#fff'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x - 3 * s + k * 3 * s, y - 2 * s + (k % 2) * s, .9 * s, 0, 6.29); g.fill(); }
    };
    for (let i = 0; i < 70; i++) mush(R() * w, R() * h, .9 + R() * .7);
    const greens = ['#8fa98a', '#a7b9a0', '#7d8f86', '#c9b28c'];
    for (let i = 0; i < 160; i++) leaf(R() * w, R() * h, R() * 6.28, greens[Math.floor(R() * greens.length)]);
    for (let i = 0; i < 120; i++) { g.fillStyle = 'rgba(190,80,60,.55)'; g.beginPath(); g.arc(R() * w, R() * h, 1 + R(), 0, 6.29); g.fill(); }
  });
  TX.mushroom.userData = { uv: 0.8 };

  // Tapete abstrato laranja/creme (infantil, tour)
  TX.rugAbstract = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#efe0c2'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8b489';
    g.beginPath(); g.moveTo(0, h * .55); g.bezierCurveTo(w * .3, h * .35, w * .45, h * .8, w * .2, h); g.lineTo(0, h); g.fill();
    g.fillStyle = '#d4643a';
    g.beginPath(); g.moveTo(w, h * .25); g.bezierCurveTo(w * .55, h * .35, w * .75, h * .6, w * .35, h * .75); g.bezierCurveTo(w * .2, h * .85, w * .45, h, w * .6, h); g.lineTo(w, h); g.fill();
    g.strokeStyle = '#6b3a22'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(w * .15, 0); g.bezierCurveTo(w * .6, h * .3, w * .1, h * .55, w * .55, h * .9); g.stroke();
    g.strokeStyle = '#c9a15a'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(w * .8, 0); g.bezierCurveTo(w * .5, h * .2, w * .95, h * .5, w * .7, h); g.stroke();
  });

  // Tapete listrado com traços coloridos (infantil, fotos)
  TX.rugStripes = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#f5f1ea'; g.fillRect(0, 0, w, h);
    const cols = ['#d9a441', '#4f6fa8', '#c65a4a', '#6d9a78', '#9a7ab0', '#d98e5a'];
    for (let c = 0; c < 9; c++) {
      const x = 28 + c * 57; g.fillStyle = cols[c % cols.length];
      for (let y = 6; y < h; y += 22) { g.beginPath(); g.roundRect(x - 3, y, 6, 13, 3); g.fill(); }
    }
  });

  // Persiana (lâminas horizontais)
  TX.blinds = canvasTex(64, 128, (g, w, h) => {
    for (let y = 0; y < h; y += 16) {
      const gr = g.createLinearGradient(0, y, 0, y + 16);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(.8, '#e4e2de'); gr.addColorStop(1, '#bdb9b3');
      g.fillStyle = gr; g.fillRect(0, y, w, 16);
    }
  });

  TX.blinds.userData = { uv: 0.2 };

  // Cortina voil pregueada
  TX.sheer = canvasTex(128, 16, (g, w, h) => {
    for (let x = 0; x < w; x++) {
      const v = 225 + Math.round(30 * Math.sin(x / w * Math.PI * 8));
      g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, h);
    }
  });

  // Paisagem vista pelas janelas (céu + prédios + árvores)
  TX.view = canvasTex(2048, 512, (g, w, h) => {
    const R = rng(33);
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#8fbfe6'); sky.addColorStop(.62, '#d9ecf5'); sky.addColorStop(.63, '#cfd9d2'); sky.addColorStop(1, '#9fb39a');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(R() * w, 40 + R() * 120, 60 + R() * 90, 10 + R() * 14, 0, 0, 6.29); g.fill(); }
    for (let i = 0; i < 40; i++) {
      const bw = 40 + R() * 90, bh = 40 + R() * 150, x = R() * w, y = h * .64 - bh;
      g.fillStyle = ['#e9e2d6', '#d8cfc2', '#c9d3d6', '#efe8dc', '#b9c2c4'][Math.floor(R() * 5)];
      g.fillRect(x, y, bw, bh);
      g.fillStyle = 'rgba(80,100,120,.35)';
      for (let yy = y + 8; yy < y + bh - 6; yy += 14) for (let xx = x + 6; xx < x + bw - 8; xx += 14) g.fillRect(xx, yy, 7, 7);
    }
    for (let i = 0; i < 90; i++) { g.fillStyle = ['#5f7f4a', '#6f8e55', '#4d6a3e'][Math.floor(R() * 3)]; g.beginPath(); g.arc(R() * w, h * .64 + R() * 30, 14 + R() * 26, 0, 6.29); g.fill(); }
  });
  TX.view.wrapT = THREE.ClampToEdgeWrapping;

  // Quadros abstratos
  const art = (seed, painter) => canvasTex(256, 320, (g, w, h) => { g.fillStyle = '#f7f3ec'; g.fillRect(0, 0, w, h); painter(g, w, h, rng(seed)); });
  TX.art1 = art(41, (g, w, h, R) => { // paisagem abstrata verde/laranja
    const cols = ['#3f5b4a', '#7b8f6a', '#c8733e', '#e0c9a6', '#2f3a36'];
    for (let i = 0; i < 26; i++) { g.fillStyle = cols[Math.floor(R() * cols.length)]; g.globalAlpha = .35 + R() * .5; g.fillRect(R() * w - 40, h * .35 + R() * h * .5, 60 + R() * 140, 8 + R() * 40); }
    g.globalAlpha = 1;
  });
  TX.art2 = art(42, (g, w, h, R) => { // névoa verde/cinza
    for (let i = 0; i < 40; i++) { g.fillStyle = ['#51604f', '#8e9a86', '#d7d2c4', '#2d3530'][Math.floor(R() * 4)]; g.globalAlpha = .2 + R() * .4; g.beginPath(); g.ellipse(R() * w, h * .3 + R() * h * .6, 30 + R() * 70, 10 + R() * 40, R(), 0, 6.29); g.fill(); }
    g.globalAlpha = 1;
  });
  TX.art3 = art(43, (g, w, h, R) => { // flor em traço fino
    g.strokeStyle = '#1f1a17'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(w * .5, h * .95); g.bezierCurveTo(w * .45, h * .6, w * .6, h * .45, w * .5, h * .2); g.stroke();
    g.fillStyle = '#b75a33'; g.globalAlpha = .75; g.beginPath(); g.ellipse(w * .5, h * .3, 40, 22, .6, 0, 6.29); g.fill();
    g.fillStyle = '#d7a26b'; g.beginPath(); g.ellipse(w * .42, h * .42, 30, 16, -.5, 0, 6.29); g.fill();
    g.fillStyle = '#31465a'; g.beginPath(); g.ellipse(w * .6, h * .22, 18, 10, .3, 0, 6.29); g.fill(); g.globalAlpha = 1;
  });
  TX.art4 = art(44, (g, w, h, R) => { // pincelada preta e rosa
    g.fillStyle = '#e9c2b4'; g.globalAlpha = .8; g.fillRect(w * .45, h * .2, w * .45, h * .65);
    g.fillStyle = '#2b2b2e'; g.globalAlpha = .9; g.fillRect(w * .12, h * .08, w * .38, h * .55);
    g.strokeStyle = '#c9a55a'; g.globalAlpha = 1; g.lineWidth = 2; g.beginPath(); g.moveTo(w * .7, 0); g.lineTo(w * .55, h); g.stroke();
  });
  TX.art5 = art(45, (g, w, h) => { // geométrico P&B
    g.fillStyle = '#222'; g.beginPath(); g.moveTo(0, h); g.lineTo(w * .55, h * .25); g.lineTo(w, h); g.fill();
    g.fillStyle = '#9a9a9a'; g.beginPath(); g.moveTo(w * .3, h); g.lineTo(w * .75, h * .45); g.lineTo(w, h * .8); g.lineTo(w, h); g.fill();
  });
  return TX;
}
