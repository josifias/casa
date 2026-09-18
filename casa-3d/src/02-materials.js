// ============================================================
// 02 · MATERIAIS, TEMAS E HELPERS DE GEOMETRIA
// ============================================================
let TX, M;
const std = (o) => new THREE.MeshStandardMaterial(o);
const _matCache = new Map();
function C(hex, rough = .8, metal = 0) {
  const k = hex + rough + metal;
  if (!_matCache.has(k)) _matCache.set(k, std({ color: hex, roughness: rough, metalness: metal }));
  return _matCache.get(k);
}

const THEMES = {
  tour: {
    label: 'Tour 360°',
    colors: {
      wall: '#f3ede5', sofa: '#efe5d3', sofaPillow: '#b24f2c', salaRug: '#d8bf98',
      headboard: '#dccfbd', runner: '#8a3a22', pillowA: '#e8b3a0', pillowB: '#afc0d6', duvet: '#f4f1ec',
      kidsFrame: '#6f8c94', rope: '#efe6d5', kidsAccent: '#c9643c', desk: '#cc6034', niche: '#6f8c94',
      kidsWardrobe: '#f5f2ee', chairFabric: '#efe6d6', upper: '#efe3c8', base: '#cfa373', towel: '#d6874b',
      bathCab: '#c99a68', fridge: '#3c3d40', lowerBed: '#b9aa98', entryPanel: '#c99a68',
    },
    kidsPaper: 'confetti', kidsRug: 'rugAbstract',
  },
  fotos: {
    label: 'Fotos do decorado',
    colors: {
      wall: '#ebe1d4', sofa: '#8e9093', sofaPillow: '#7c8550', salaRug: '#e6e1d9',
      headboard: '#a3a19c', runner: '#6f7650', pillowA: '#e6e0d6', pillowB: '#b7bba5', duvet: '#f2f0eb',
      kidsFrame: '#dcbc8f', rope: '#d6a33a', kidsAccent: '#a7b39a', desk: '#b9c8b5', niche: '#dcbc8f',
      kidsWardrobe: '#efe8dd', chairFabric: '#d9cbb2', upper: '#bf9163', base: '#bf9163', towel: '#f4f2ee',
      bathCab: '#b98a5b', fridge: '#b8bbbf', lowerBed: '#8f9499', entryPanel: '#bf9163',
    },
    kidsPaper: 'mushroom', kidsRug: 'rugStripes',
  },
};

function makeMaterials() {
  const th = THEMES.tour.colors;
  const grainM = (color, rough = .6) => std({ color, map: TX.grain, roughness: rough });
  M = {
    wall: std({ color: th.wall, map: TX.linen, roughness: .95 }),
    ceiling: std({ color: '#f7f3ee', roughness: 1 }),
    slab: std({ color: '#d4cdc4', roughness: 1 }),
    floorWood: std({ map: TX.planks, roughness: .48 }),
    floorTile: std({ color: '#e4ded6', map: TX.tile, roughness: .3 }),
    tileWhite: std({ map: TX.wtile, roughness: .16 }),
    threshold: std({ color: '#3d3833', roughness: .3 }),
    trim: std({ color: '#f8f7f4', roughness: .45 }),
    frame: std({ color: '#f3f3f1', roughness: .3, metalness: .15 }),
    glass: std({ color: '#d5e8ee', transparent: true, opacity: .14, roughness: .02, depthWrite: false }),
    doorLeaf: std({ color: '#f4f2ef', roughness: .45 }),
    oak: grainM('#d3aa7a'), oakLight: grainM('#dfc099'), walnut: grainM('#7c5538', .45),
    base: grainM(th.base), upper: grainM(th.upper, .5), entryPanel: grainM(th.entryPanel), bathCab: grainM(th.bathCab),
    counter: std({ color: '#f5f1eb', roughness: .22 }),
    white: std({ color: '#f6f5f2', roughness: .4 }),
    porcelain: std({ color: '#fbfbfa', roughness: .1 }),
    black: std({ color: '#1e1e20', roughness: .45 }),
    blackMetal: std({ color: '#232325', roughness: .35, metalness: .7 }),
    steel: std({ color: '#c6c9cc', roughness: .25, metalness: 1 }),
    chrome: std({ color: '#eef0f2', roughness: .06, metalness: 1 }),
    brass: std({ color: '#caa45a', roughness: .26, metalness: 1 }),
    mirror: std({ color: '#f2f6f7', roughness: .04, metalness: .92, envMapIntensity: 1.6 }),
    screen: std({ color: '#0b0c0f', roughness: .1, metalness: .35 }),
    fridge: std({ color: th.fridge, roughness: .28, metalness: .75 }),
    mattress: std({ color: '#f7f5f1', roughness: .95 }),
    sofa: std({ color: th.sofa, roughness: .95 }), sofaPillow: std({ color: th.sofaPillow, roughness: .95 }),
    salaRug: std({ color: th.salaRug, map: TX.jute, roughness: 1 }),
    headboard: std({ color: th.headboard, roughness: .95 }), runner: std({ color: th.runner, roughness: .95 }),
    pillowA: std({ color: th.pillowA, roughness: .95 }), pillowB: std({ color: th.pillowB, roughness: .95 }),
    duvet: std({ color: th.duvet, roughness: .95 }),
    kidsFrame: grainM(th.kidsFrame, .55), rope: std({ color: th.rope, roughness: .9 }),
    kidsAccent: std({ color: th.kidsAccent, map: TX.linen, roughness: .9 }),
    kidsPaper: std({ map: TX.confetti, roughness: .9 }),
    desk: std({ color: th.desk, roughness: .5 }), niche: grainM(th.niche, .55),
    kidsRug: std({ map: TX.rugAbstract, roughness: 1 }),
    kidsWardrobe: std({ color: th.kidsWardrobe, roughness: .45 }),
    chairFabric: std({ color: th.chairFabric, roughness: .95 }),
    lowerBed: std({ color: th.lowerBed, roughness: .95 }),
    towel: std({ color: th.towel, roughness: 1 }),
    plant: std({ color: '#4d7a3a', roughness: .85, flatShading: true }),
    plant2: std({ color: '#6c9350', roughness: .85, flatShading: true }),
    potWhite: std({ color: '#eeeae4', roughness: .6 }), potClay: std({ color: '#b8683f', roughness: .8 }),
    wicker: std({ color: '#7a5634', map: TX.jute, roughness: .95 }),
    cane: std({ map: TX.cane, roughness: .75 }),
    blinds: std({ map: TX.blinds, roughness: .55 }),
    sheer: std({ map: TX.sheer, transparent: true, opacity: .86, side: THREE.DoubleSide, roughness: .9 }),
    led: std({ color: '#fff6e4', emissive: '#ffe2b0', emissiveIntensity: .5, roughness: .4 }),
    bulb: std({ color: '#fff8ec', emissive: '#ffd49a', emissiveIntensity: .35, roughness: .25 }),
    shade: std({ color: '#f4ede2', emissive: '#ffcf8f', emissiveIntensity: 0, roughness: .85 }),
    view: new THREE.MeshBasicMaterial({ map: TX.view, side: THREE.BackSide, fog: false }),
  };
  M.kidsRug.userData.noProject = true;
  for (let i = 1; i <= 5; i++) { M['art' + i] = std({ map: TX['art' + i], roughness: .85 }); M['art' + i].userData.noProject = true; }
}

let CURRENT_STYLE = 'tour';
function applyTheme(name) {
  const th = THEMES[name];
  CURRENT_STYLE = name;
  for (const [k, v] of Object.entries(th.colors)) if (M[k]) M[k].color.set(v);
  M.kidsPaper.map = TX[th.kidsPaper]; M.kidsPaper.needsUpdate = true;
  M.kidsRug.map = TX[th.kidsRug]; M.kidsRug.needsUpdate = true;
  if (STYLE.tour) { STYLE.tour.visible = name === 'tour'; STYLE.fotos.visible = name === 'fotos'; }
}

// ---------- helpers de geometria ----------
let CUR = null;               // grupo pai atual
const COLL = [];              // caixas de colisão [x1,z1,x2,z2] (coordenadas da planta)
const STYLE = {};             // grupos exclusivos de cada estilo
let BUILD_STYLE = null;      // estilo do grupo em construção (colisões exclusivas)
function within(group, fn) {
  const p = CUR, ps = BUILD_STYLE;
  CUR = group; if (group.userData.style) BUILD_STYLE = group.userData.style;
  fn();
  CUR = p; BUILD_STYLE = ps;
}
function addColl(x1, z1, x2, z2) { COLL.push([Math.min(x1, x2), Math.min(z1, z2), Math.max(x1, x2), Math.max(z1, z2), BUILD_STYLE]); }

function projectUV(geom, mat) {
  const map = mat && mat.map;
  if (!map || mat.userData.noProject || !geom.attributes.uv) return geom;
  const s = map.userData.uv || 1;
  const p = geom.attributes.position, n = geom.attributes.normal, uv = geom.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv.setXY(i, u / s, v / s);
  }
  uv.needsUpdate = true;
  return geom;
}
function addMesh(geom, mat, o = {}) {
  const m = new THREE.Mesh(geom, mat);
  m.castShadow = o.cast ?? true; m.receiveShadow = o.receive ?? true;
  (o.parent || CUR).add(m);
  return m;
}
function B(x1, y1, z1, x2, y2, z2, mat, o = {}) {
  const g = new THREE.BoxGeometry(Math.abs(x2 - x1), Math.abs(y2 - y1), Math.abs(z2 - z1));
  g.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  projectUV(g, mat);
  return addMesh(g, mat, o);
}
function RB(x1, y1, z1, x2, y2, z2, r, mat, o = {}) {
  const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1), d = Math.abs(z2 - z1);
  const rr = Math.max(.002, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001));
  const g = new RoundedBoxGeometry(w, h, d, o.seg ?? 2, rr);
  g.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  projectUV(g, mat);
  return addMesh(g, mat, o);
}
function CY(x, y1, z, r, y2, mat, o = {}) {
  const g = new THREE.CylinderGeometry(o.rTop ?? r, r, Math.abs(y2 - y1), o.seg ?? 24, 1, o.open ?? false);
  if (o.sx || o.sz) g.scale(o.sx ?? 1, 1, o.sz ?? 1);
  g.translate(x, (y1 + y2) / 2, z);
  projectUV(g, mat);
  return addMesh(g, mat, o);
}
function SP(x, y, z, r, mat, o = {}) {
  const g = o.ico ? new THREE.IcosahedronGeometry(r, o.detail ?? 0) : new THREE.SphereGeometry(r, o.seg ?? 16, o.seg2 ?? 10);
  if (o.sx || o.sy || o.sz) g.scale(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
  g.translate(x, y, z);
  return addMesh(g, mat, o);
}
const _up = new THREE.Vector3(0, 1, 0);
function rod(a, b, r, mat, o = {}) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const g = new THREE.CylinderGeometry(o.r2 ?? r, r, va.distanceTo(vb), o.seg ?? 8);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(_up, vb.clone().sub(va).normalize()));
  const mid = va.add(vb).multiplyScalar(.5);
  g.translate(mid.x, mid.y, mid.z);
  return addMesh(g, mat, o);
}
function G(x = 0, y = 0, z = 0, ry = 0, parent = CUR) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g;
}

// Painel ripado: ripas verticais. face = 'x+','x-','z+','z-' (direção para onde o painel olha)
function slats(face, a1, a2, y1, y2, wallPos, depth, mat, { w = .028, gap = .014 } = {}) {
  const step = w + gap, n = Math.max(1, Math.floor((a2 - a1 + gap) / step));
  const start = a1 + ((a2 - a1) - (n * step - gap)) / 2;
  const s = face.endsWith('+') ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const p1 = start + i * step, p2 = p1 + w;
    if (face[0] === 'x') B(wallPos, y1, p1, wallPos + s * depth, y2, p2, mat, { cast: false });
    else B(p1, y1, wallPos, p2, y2, wallPos + s * depth, mat, { cast: false });
  }
}

// Quadro com moldura preta. face indica a direção da parede para o ambiente.
function ART(face, c1, c2, y1, y2, wallPos, artMat, frameMat = M.black) {
  const s = face.endsWith('+') ? 1 : -1, d = .03, inset = .025;
  const w = c2 - c1, h = y2 - y1;
  if (face[0] === 'x') B(wallPos, y1, c1, wallPos + s * d, y2, c2, frameMat, { cast: false });
  else B(c1, y1, wallPos, c2, y2, wallPos + s * d, frameMat, { cast: false });
  const g = new THREE.PlaneGeometry(w - 2 * inset, h - 2 * inset);
  if (face === 'x+') g.rotateY(Math.PI / 2); else if (face === 'x-') g.rotateY(-Math.PI / 2); else if (face === 'z-') g.rotateY(Math.PI);
  const off = wallPos + s * (d + .002);
  if (face[0] === 'x') g.translate(off, (y1 + y2) / 2, (c1 + c2) / 2); else g.translate((c1 + c2) / 2, (y1 + y2) / 2, off);
  addMesh(g, artMat, { cast: false });
}

// Planta em vaso
function PLANT(x, y, z, s = 1, pot = M.potWhite, seed = 1) {
  const R = rng(seed);
  CY(x, y, z, .09 * s, y + .16 * s, pot, { rTop: .11 * s, seg: 16 });
  for (let i = 0; i < 6; i++) {
    const a = R() * 6.28, rr = R() * .08 * s;
    SP(x + Math.cos(a) * rr, y + (.2 + R() * .22) * s, z + Math.sin(a) * rr, (.07 + R() * .06) * s, i % 2 ? M.plant : M.plant2, { ico: true, sy: 1.3, cast: false });
  }
}
function HANGING_PLANT(x, y, z, s = 1, seed = 2) {
  const R = rng(seed);
  CY(x, y, z, .07 * s, y + .12 * s, M.potWhite, { rTop: .09 * s, seg: 14 });
  for (let i = 0; i < 9; i++) {
    const a = R() * 6.28, rr = .06 + R() * .06;
    SP(x + Math.cos(a) * rr * s, y + (.1 - R() * .35) * s, z + Math.sin(a) * rr * s, (.04 + R() * .04) * s, i % 2 ? M.plant : M.plant2, { ico: true, sy: 1.8, cast: false });
  }
}
// Almofada (rotacionada)
function PILLOW(x, y, z, w, h, d, mat, rx = 0, ry = 0, rz = 0) {
  const g = G(x, y, z, 0);
  g.rotation.set(rx, ry, rz);
  RB(-w / 2, -h / 2, -d / 2, w / 2, h / 2, d / 2, Math.min(w, h, d) * .45, mat, { parent: g, seg: 3 });
  return g;
}
