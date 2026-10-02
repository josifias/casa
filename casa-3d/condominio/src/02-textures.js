// ============================================================
// 02 · TEXTURAS E MATERIAIS — geradas por código (canvas), sem arquivos externos
// ============================================================
let MAX_ANISO = 4;
let TX, M;
function canvasTex(w, h, draw, uv = 1, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = MAX_ANISO;
  t.userData = { uv };
  return t;
}
function speckle(g, w, h, R, n, colors, rMin, rMax, alpha = 1) {
  g.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[R() * colors.length | 0];
    const r = rMin + R() * (rMax - rMin);
    g.fillRect(R() * w, R() * h, r, r);
  }
  g.globalAlpha = 1;
}
function makeTextures() {
  const T = {};
  T.grass = canvasTex(512, 512, (g, w, h) => {
    const R = rng(1); g.fillStyle = '#6f9a45'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { const x = R() * w, y = R() * h, r = 20 + R() * 60; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, R() < .5 ? 'rgba(90,140,50,.35)' : 'rgba(60,100,35,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    for (let i = 0; i < 9000; i++) { g.strokeStyle = ['#5f8a3a', '#86b155', '#4f7a30', '#9cc066'][R() * 4 | 0]; g.globalAlpha = .5; const x = R() * w, y = R() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - .5) * 3, y - 3 - R() * 5); g.stroke(); }
    g.globalAlpha = 1;
  }, 4);
  T.asphalt = canvasTex(512, 512, (g, w, h) => { const R = rng(2); g.fillStyle = '#4a4b4f'; g.fillRect(0, 0, w, h); speckle(g, w, h, R, 14000, ['#3c3d41', '#5c5d62', '#6a6b70', '#2f3034'], 1, 2.5, .7); }, 4);
  T.paving = canvasTex(512, 512, (g, w, h) => {
    const R = rng(3); g.fillStyle = '#c9c4b8'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = `rgba(${150 + R() * 40},${145 + R() * 40},${135 + R() * 35},.18)`; g.fillRect(x * 128, y * 128, 128, 128); }
    speckle(g, w, h, R, 5000, ['#b8b3a7', '#d6d1c6', '#a9a497'], 1, 2, .5);
    g.fillStyle = '#9c978c'; for (let i = 0; i <= 4; i++) { g.fillRect(i * 128 - 1, 0, 3, h); g.fillRect(0, i * 128 - 1, w, 3); }
  }, 2);
  T.sidewalk = canvasTex(512, 512, (g, w, h) => {
    const R = rng(4); g.fillStyle = '#d3d0c8'; g.fillRect(0, 0, w, h); speckle(g, w, h, R, 4000, ['#c4c1b9', '#e0ddd5'], 1, 2, .6);
    g.fillStyle = '#aeaba3'; for (let i = 0; i <= 5; i++) { g.fillRect(i * 102.4 - 1, 0, 2, h); g.fillRect(0, i * 102.4 - 1, w, 2); }
  }, 2);
  T.plaster = canvasTex(512, 512, (g, w, h) => { const R = rng(5); g.fillStyle = '#f6f4f0'; g.fillRect(0, 0, w, h); speckle(g, w, h, R, 9000, ['#e8e5df', '#ffffff', '#ebe7e0'], 1, 2.5, .6); }, 2);
  T.roof = canvasTex(256, 256, (g, w, h) => { const R = rng(6); g.fillStyle = '#8e8c88'; g.fillRect(0, 0, w, h); speckle(g, w, h, R, 6000, ['#76746f', '#a4a19c', '#65635f'], 1, 3, .8); }, 2);
  T.deck = canvasTex(512, 512, (g, w, h) => {
    const R = rng(7);
    for (let i = 0; i < 8; i++) { g.fillStyle = `rgb(${150 + R() * 25},${104 + R() * 20},${66 + R() * 14})`; g.fillRect(0, i * 64, w, 64); g.fillStyle = 'rgba(60,40,20,.5)'; g.fillRect(0, i * 64 + 61, w, 3); }
    for (let i = 0; i < 1400; i++) { g.strokeStyle = `rgba(70,45,25,${.05 + R() * .1})`; const y = R() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + R() * 4 - 2, w * .6, y + R() * 4 - 2, w, y); g.stroke(); }
  }, 2);
  T.pooltile = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3d97c9'; g.fillRect(0, 0, w, h); g.fillStyle = '#7cc0e3'; for (let i = 0; i <= 8; i++) { g.fillRect(i * 32 - 1, 0, 2, h); g.fillRect(0, i * 32 - 1, w, 2); } }, 1);
  T.water = canvasTex(512, 512, (g, w, h) => {
    const R = rng(8); g.fillStyle = '#2f8fc7'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(200,240,255,.35)'; g.lineWidth = 2;
    for (let i = 0; i < 140; i++) { const x = R() * w, y = R() * h, r = 10 + R() * 26; g.beginPath(); g.ellipse(x, y, r, r * .6, R() * 3, 0, Math.PI * (1 + R())); g.stroke(); }
  }, 3);
  T.terracotta = canvasTex(512, 512, (g, w, h) => {
    const R = rng(9); g.fillStyle = '#8f6a55'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++) { const off = r % 2 ? 51 : 0; g.fillStyle = `rgb(${168 + R() * 25},${88 + R() * 18},${58 + R() * 14})`; g.fillRect((c * 102 + off) % w + 3, r * 64 + 3, 96, 58); if ((c * 102 + off) % w + 102 > w) g.fillRect((c * 102 + off) % w - w + 3, r * 64 + 3, 96, 58); }
  }, 2);
  T.rubber = canvasTex(256, 256, (g, w, h) => { const R = rng(10); g.fillStyle = '#4f5f55'; g.fillRect(0, 0, w, h); speckle(g, w, h, R, 3000, ['#3f4d44', '#b5584a', '#4b7fb2', '#d6b24c'], 1, 3, .6); }, 2);
  T.gravel = canvasTex(256, 256, (g, w, h) => { const R = rng(11); g.fillStyle = '#9b958b'; g.fillRect(0, 0, w, h); speckle(g, w, h, R, 5000, ['#7c776f', '#b9b3a8', '#6a655e', '#cfc9be'], 2, 4, .9); }, 2);
  T.dirt = canvasTex(512, 512, (g, w, h) => { const R = rng(12); g.fillStyle = '#b08d64'; g.fillRect(0, 0, w, h); speckle(g, w, h, R, 9000, ['#9c7a54', '#c4a27a', '#8e6e4a', '#a59c90'], 1, 3, .7); }, 4);
  T.leaves = canvasTex(256, 256, (g, w, h) => { const R = rng(13); g.fillStyle = '#4c7a36'; g.fillRect(0, 0, w, h); speckle(g, w, h, R, 2600, ['#3b652a', '#5f9143', '#2f5222', '#6fa04c'], 3, 7, .9); }, 1.5);
  T.blocks = canvasTex(512, 512, (g, w, h) => {
    const R = rng(14); g.fillStyle = '#cbc7bf'; g.fillRect(0, 0, w, h); speckle(g, w, h, R, 5000, ['#bdb9b1', '#d8d4cc'], 1, 2, .6);
    g.fillStyle = '#a9a59d'; for (let r = 0; r < 8; r++) { g.fillRect(0, r * 64, w, 2); for (let c = 0; c < 4; c++) g.fillRect(c * 128 + (r % 2 ? 64 : 0), r * 64, 2, 64); }
  }, 1.6);
  // grades com transparência
  const alphaTex = (draw, uv) => { const t = canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); draw(g, w, h); }, uv); return t; };
  T.bars = alphaTex((g) => { g.fillStyle = '#4a4c50'; for (let x = 4; x < 128; x += 16) g.fillRect(x, 0, 5, 128); g.fillRect(0, 4, 128, 6); g.fillRect(0, 118, 128, 6); }, 1);
  T.chain = alphaTex((g) => { g.strokeStyle = '#9aa0a6'; g.lineWidth = 2; for (let i = -128; i < 256; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); g.beginPath(); g.moveTo(i + 128, 0); g.lineTo(i, 128); g.stroke(); } }, .6);
  T.railing = alphaTex((g) => { g.fillStyle = '#3e4044'; g.fillRect(0, 0, 128, 10); g.fillRect(0, 112, 128, 8); for (let x = 6; x < 128; x += 21) g.fillRect(x, 0, 4, 128); }, 1.1);
  T.net = alphaTex((g) => { g.fillStyle = '#f2f2f2'; for (let i = 0; i < 128; i += 12) { g.fillRect(i, 0, 2, 128); g.fillRect(0, i, 128, 2); } g.fillRect(0, 0, 128, 10); }, .4);
  T.cobogo = alphaTex((g) => { g.fillStyle = '#b9b5ad'; g.fillRect(0, 0, 128, 128); g.clearRect(16, 16, 40, 40); g.clearRect(72, 16, 40, 40); g.clearRect(16, 72, 40, 40); g.clearRect(72, 72, 40, 40); }, .6);
  T.glow = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,150,.95)'); gr.addColorStop(.35, 'rgba(255,196,120,.45)'); gr.addColorStop(1, 'rgba(255,180,100,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  T.cloth = canvasTex(128, 128, (g) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#c8352f' : '#f4eee6'; g.fillRect(x * 16, y * 16, 16, 16); } }, .6);
  T.hammock = canvasTex(128, 128, (g) => { const c = ['#e2783a', '#f0c23c', '#3f86c4', '#f4eee6']; for (let y = 0; y < 16; y++) { g.fillStyle = c[y % 4]; g.fillRect(0, y * 8, 128, 8); } }, 1);
  T.pingpong = canvasTex(256, 128, (g) => { g.fillStyle = '#24599f'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 256, 4); g.fillRect(0, 124, 256, 4); g.fillRect(0, 0, 4, 128); g.fillRect(252, 0, 4, 128); g.fillRect(0, 62, 256, 3); });
  T.slats = canvasTex(256, 256, (g) => { g.fillStyle = '#ecebe6'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#c9c7c0'; for (let y = 0; y < 256; y += 24) g.fillRect(0, y, 256, 5); }, 1);
  // sombra difusa (contato) embaixo dos carros: só a sombra borrada de um retângulo
  T.carShadow = canvasTex(128, 64, (g) => { g.shadowColor = 'rgba(0,0,0,1)'; g.shadowBlur = 12; g.shadowOffsetX = 1000; g.fillStyle = '#000'; g.fillRect(18 - 1000, 13, 92, 38); }, 1, false);
  return T;
}

// ---------- materiais ----------
const std = (o) => new THREE.MeshStandardMaterial(o);
const _cache = new Map();
function C(hex, rough = .8, metal = 0) {
  const k = hex + rough + metal;
  if (!_cache.has(k)) _cache.set(k, std({ color: hex, roughness: rough, metalness: metal }));
  return _cache.get(k);
}
function makeMaterials() {
  const tex = (map, o = {}) => std({ map, ...o });
  const alpha = (map, color = '#ffffff') => std({ map, color, transparent: false, alphaTest: .5, side: THREE.DoubleSide, roughness: .5, metalness: .4 });
  M = {
    grass: tex(TX.grass, { roughness: 1 }), asphalt: tex(TX.asphalt, { roughness: .95 }), paving: tex(TX.paving, { roughness: .9 }),
    sidewalk: tex(TX.sidewalk, { roughness: .9 }), roof: tex(TX.roof, { roughness: 1 }), deck: tex(TX.deck, { roughness: .8 }),
    pooltile: tex(TX.pooltile, { roughness: .3 }), terracotta: tex(TX.terracotta, { roughness: .9 }), rubber: tex(TX.rubber, { roughness: 1 }),
    gravel: tex(TX.gravel, { roughness: 1 }), dirt: tex(TX.dirt, { roughness: 1 }), hedge: tex(TX.leaves, { roughness: .95 }),
    muro: tex(TX.blocks, { roughness: .95 }),
    water: std({ map: TX.water, color: '#7fd0f5', transparent: true, opacity: .82, roughness: .08, metalness: .1 }),
    wall: tex(TX.plaster, { color: '#ddd3c3', roughness: .95 }), wallGray: tex(TX.plaster, { color: '#a39c93', roughness: .95 }),
    wallDark: tex(TX.plaster, { color: '#6f6b67', roughness: .95 }), white: tex(TX.plaster, { color: '#f3f2ee', roughness: .9 }),
    concrete: tex(TX.plaster, { color: '#b8b5ae', roughness: .95 }), blue: tex(TX.plaster, { color: '#2f5dab', roughness: .8 }),
    glass: std({ color: '#3f5a70', roughness: .08, metalness: .35 }),
    glassLit: std({ color: '#3f5a70', roughness: .08, metalness: .35, emissive: '#ffcf8a', emissiveIntensity: 0 }),
    clearGlass: std({ color: '#cfe6ee', transparent: true, opacity: .25, roughness: .05, metalness: .1, depthWrite: false }),
    frame: std({ color: '#f5f5f3', roughness: .4, metalness: .2 }), door: std({ color: '#e9e6e0', roughness: .6 }),
    metal: std({ color: '#9aa0a6', roughness: .35, metalness: .8 }), darkMetal: std({ color: '#3a3c40', roughness: .45, metalness: .6 }),
    black: std({ color: '#1e1e20', roughness: .5 }), tire: std({ color: '#1b1b1d', roughness: .9 }),
    wood: std({ color: '#a8794b', roughness: .75 }), trunk: std({ color: '#6b4f36', roughness: 1 }), palmTrunk: std({ color: '#9c8466', roughness: 1 }),
    leaf: std({ color: '#4f8a3a', roughness: .95, flatShading: true }), leafDark: std({ color: '#33642c', roughness: .95, flatShading: true }),
    leafYellow: std({ color: '#e0b72e', roughness: .9, flatShading: true }), leafPalm: std({ color: '#5f9a3e', roughness: .9, flatShading: true }),
    leafPink: std({ color: '#c23b84', roughness: .9, flatShading: true }),
    bulb: std({ color: '#fff4dc', emissive: '#ffd590', emissiveIntensity: .2 }),
    carGlass: std({ color: '#34424f', roughness: .05, metalness: .72 }), headlight: std({ color: '#fffbe8', emissive: '#fff2c4', emissiveIntensity: .2 }),
    taillight: std({ color: '#b3231f', emissive: '#ff2a1f', emissiveIntensity: .1 }),
    cloth: tex(TX.cloth, { roughness: .9 }), hammock: tex(TX.hammock, { roughness: .9 }), pingpong: tex(TX.pingpong, { roughness: .6 }),
    lounger: tex(TX.slats, { roughness: .7 }),
    bars: alpha(TX.bars), chain: alpha(TX.chain), railing: alpha(TX.railing), net: alpha(TX.net), cobogo: alpha(TX.cobogo),
    carShadow: new THREE.MeshBasicMaterial({ map: TX.carShadow, color: '#000000', transparent: true, opacity: .62, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    plate: std({ color: '#f3f3ef', roughness: .45 }),
    glowPool: new THREE.MeshBasicMaterial({ map: TX.glow, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffffff' }),
  };
  for (const k of ['cloth', 'hammock', 'pingpong']) M[k].userData.noProject = true;
  M.glowPool.userData.noProject = true;
  M.carShadow.userData.noProject = true;
}
// placas com texto
const _signs = new Map();
function signMat(text, bg = '#c0392b', fg = '#ffffff') {
  if (_signs.has(text)) return _signs.get(text);
  const t = canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, h - 5, w, 5);
    g.fillStyle = fg; let s = 38; g.font = `700 ${s}px system-ui,Segoe UI,Arial`;
    while (g.measureText(text).width > w - 20 && s > 14) { s -= 2; g.font = `700 ${s}px system-ui,Segoe UI,Arial`; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 1);
  });
  const m = std({ map: t, roughness: .6 }); m.userData.noProject = true;
  _signs.set(text, m);
  return m;
}
