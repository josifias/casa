// ============================================================
// 07 · INTERIOR — entrar em qualquer apartamento de qualquer bloco
// ============================================================
// O interior é o mesmo apartamento 3D da página principal (src/01–05, embutido pelo build.py como
// APTO_KIT). Ele é montado uma vez e posicionado na unidade escolhida: andar, fileira e lado do
// prédio; nas unidades espelhadas a planta vem espelhada. Pelas janelas aparece o condomínio real.
let KIT = null, INSIDE = null, pickBlock = '01', ROOM_ENV = null, SKY_ENV = null;
const APTO_VARIANTS = {};                 // 'normal' e 'garden' (térreo: janela da sala vira porta)
const APTO_EYE = 1.55, APTO_R = .2;
const APTO_FILLS = [[3.70, 2.25, 1.60], [6.20, 2.25, 1.40], [1.40, 2.25, 1.40], [2.60, 2.25, 3.85], [6.30, 2.25, 3.85], [4.55, 1.45, 1.85]];
const floorName = (k) => k === 0 ? 'Térreo' : `${k + 1}º pavimento`;

// ---------- unidades ----------
function findBlock(num) { for (const b of BUILDINGS) { const i = b.blocks.indexOf(num); if (i >= 0) return { b, i }; } return null; }
// as 4 unidades de um bloco: fileira (0/1), posição na fileira (u) e número (1–4)
function blockUnits(b, i) {
  const out = [];
  for (const row of [0, 1]) for (const u of i === 0 ? [0, 1] : [2, 3]) out.push({ row, u, n: UNIT_NUM[b.dir][row][u] });
  return out.sort((p, q) => p.n - q.n);
}
function aptoInfo(block, num) {
  const f = findBlock(block); if (!f) return null;
  const k = Math.floor(num / 100) - 1, n = num % 100;
  if (k < 0 || k >= f.b.floors || n < 1 || n > 4) return null;
  const q = blockUnits(f.b, f.i).find((x) => x.n === n);
  return { ...f, block, num, k, n, row: q.row, u: q.u, garden: k === 0 && hasGarden(f.b, q.row, q.u) };
}
// referencial da unidade: X (0..7,40) ao longo da fileira, Z = 0 na fachada externa e 4,60 na circulação
// (a mesma convenção da página do apartamento); devolve a matriz e as conversões lote ↔ planta
function unitFrame(b, row, u, k) {
  const r = bRect(b), H = b.dir === 'h', mir = u % 2 === 1, ua = u * UNIT;
  const aO = mir ? ua + UNIT - .1 : ua + .1, aX = mir ? -1 : 1;
  const cO = row === 0 ? .1 : BWID - .1, cZ = row === 0 ? 1 : -1;
  const y = k * FLOOR_H + .02;
  const toW = (X, Z) => { const a = aO + aX * X, c = cO + cZ * Z; return H ? [r.x0 + a, r.z0 + c] : [r.x0 + c, r.z0 + a]; };
  const toL = (x, z) => { const a = H ? x - r.x0 : z - r.z0, c = H ? z - r.z0 : x - r.x0; return [(a - aO) * aX, (c - cO) * cZ]; };
  const ex = H ? [aX, 0] : [0, aX], ez = H ? [0, cZ] : [cZ, 0], o = toW(0, 0);
  const m = new THREE.Matrix4().set(ex[0], 0, ez[0], o[0], 0, 1, 0, y, ex[1], 0, ez[1], o[1], 0, 0, 0, 1);
  return { m, toW, toL, y, mirrored: m.determinant() < 0 };
}

// esconde (ou devolve) as janelas da fachada da unidade, que ficam por fora das janelas do interior
function setTagHidden(tag, hide) {
  for (const m of site.children) {
    const rs = m.userData.tags && m.userData.tags[tag];
    if (!rs) continue;
    const pos = m.geometry.attributes.position, a = pos.array, sv = m.userData.saved = m.userData.saved || {};
    if (hide) {
      sv[tag] = rs.map(([s, n]) => a.slice(s * 3, (s + n) * 3));
      for (const [s, n] of rs) for (let i = s + 1; i < s + n; i++) { a[i * 3] = a[s * 3]; a[i * 3 + 1] = a[s * 3 + 1]; a[i * 3 + 2] = a[s * 3 + 2]; }
    } else if (sv[tag]) { rs.forEach(([s], j) => a.set(sv[tag][j], s * 3)); delete sv[tag]; }
    for (const [s, n] of rs) pos.addUpdateRange(s * 3, n * 3);
    pos.needsUpdate = true;
  }
}

// ---------- entrar e sair ----------
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frame2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
async function fadeTo(on, text = '') {
  const f = $('fade');
  f.querySelector('span').textContent = text;
  f.classList.toggle('on', on);
  await wait(on ? 340 : 0);
}
async function enterApto(block, num, opts = {}) {
  const info = aptoInfo(block, num);
  if (!info) { toast('Apartamento não encontrado'); return; }
  closeAptoPicker();
  await fadeTo(true, KIT ? '' : 'Abrindo o apartamento…');
  await frame2();
  if (INSIDE) leaveInterior();
  leaveCore();
  try {
    if (!KIT) KIT = APTO_KIT(MAX_ANISO);
    const vk = info.garden ? 'garden' : 'normal';
    if (!APTO_VARIANTS[vk]) APTO_VARIANTS[vk] = KIT.build({ garden: info.garden });
    const v = APTO_VARIANTS[vk], fr = unitFrame(info.b, info.row, info.u, info.k);
    v.house.matrixAutoUpdate = false; v.house.matrix.copy(fr.m); v.house.updateMatrixWorld(true);
    scene.add(v.house);
    // reflexos de ambiente interno (com o céu como ambiente o piso vinílico refletia azul)
    ensureRoomEnv();
    scene.environment = ROOM_ENV;
    const style = (+info.block + info.num) % 2 ? 'fotos' : 'tour';
    KIT.theme(style, v);
    // veio pela porta do hall: a porta de entrada fica aberta atrás dele
    for (const d of v.doors) { d.isOpen = d.name !== 'entrada' || !!opts.door; d.angle = d.isOpen ? d.openAng : 0; d.apply(d.angle); }
    const tag = unitTag(info.b, info.row, info.k, info.u);
    setTagHidden(tag, true);
    INSIDE = { ...info, fr, v, tag, style };
    if (glowMesh) glowMesh.visible = info.k > 0;   // manchas de luz dos postes ficam no chão do térreo
    // começa no hall de entrada, olhando para a sala (como na página do apartamento)
    const e = KIT.VIEWS[0], p = fr.toW(e.pos[0], e.pos[1]), l = fr.toW(e.look[0], e.look[1]);
    tween = null; walkTarget = null; controls.enabled = false;
    setMode('passeio');
    Object.assign(walk, { x: p[0], z: p[1], yaw: Math.atan2(-(l[0] - p[0]), -(l[1] - p[1])), pitch: -.08, fov: IS_TOUCH && innerWidth < innerHeight ? 82 : 74 });
    hasWalked = true;
    applyWalkCamera(camera);
    // sombra nítida em volta do apartamento e, à noite, as luzes dos ambientes
    const c = fr.toW(KIT.W_IN / 2, KIT.D_IN / 2);
    aimShadow(new THREE.Vector3(c[0], fr.y, c[1]), 16);
    shadowAt.set(1e9, 0, 0);
    lampLights.forEach((L, i) => { const f = APTO_FILLS[i % APTO_FILLS.length], w = fr.toW(f[0], f[2]); L.position.set(w[0], fr.y + f[1], w[1]); L.distance = 5.5; L.userData.power = 2.6; });
    renderer.shadowMap.needsUpdate = true;
    document.body.classList.add('inside');
    $('inName').textContent = `Bloco ${info.block} · Apto ${info.num}`;
    $('inSub').textContent = floorName(info.k) + (info.garden ? ' · com garden' : '') + (fr.mirrored ? ' · planta espelhada' : '');
    invalidate();
    await frame2();
  } catch (err) {
    console.error(err); window.__errors && window.__errors.push('apto: ' + (err && err.message));
    toast('Não foi possível abrir o apartamento neste aparelho.');
  }
  await fadeTo(false);
  if (INSIDE) toast(IS_TOUCH ? 'Toque nas portas para abrir · para sair, abra a porta de entrada ou use “Sair”' : 'Clique nas portas para abrir · para sair, abra a porta de entrada ou use “Sair”', 5200);
}
// tira o interior da cena (sem mover o visitante)
function leaveInterior() {
  if (!INSIDE) return;
  scene.remove(INSIDE.v.house);
  if (SKY_ENV && !CORE) scene.environment = SKY_ENV;
  if (glowMesh) glowMesh.visible = true;
  setTagHidden(INSIDE.tag, false);
  for (const L of lampLights) { L.distance = 16; delete L.userData.power; }
  INSIDE = null;
  document.body.classList.remove('inside');
  renderer.shadowMap.needsUpdate = true;
  invalidate();
}
// sai pela porta de entrada: fica no hall do andar, em frente à porta do apartamento
async function exitApto() {
  if (!INSIDE || INSIDE.leaving) return;
  INSIDE.leaving = true;
  await fadeTo(true);
  const { b, i, row, k, num } = INSIDE;
  leaveInterior();
  const c = CORE_LIST.find((q) => q.b === b && q.i === i), d = c.doors.find((q) => q.k === k && q.num === num);
  const sm = (d.s0 + d.s1) / 2, [x, z] = c.toW(sm, row === 0 ? .75 : COR - .75), [lx, lz] = c.toW(sm, row === 0 ? COR : 0);
  setMode('passeio'); controls.enabled = false; tween = null; walkTarget = null;
  Object.assign(walk, { x, z, yaw: Math.atan2(-(lx - x), -(lz - z)), pitch: -.05 });
  enterCore(c, k);
  applyWalkCamera(camera);
  await frame2();
  await fadeTo(false);
}
// ---------- núcleo de escada: entrar no prédio, subir/descer a escada, portas dos apartamentos ----------
let CORE = null;               // { core, k (andar), flight (lance da escada em que está, ou null) }
const CORE_R = .25;
function ensureRoomEnv() {
  if (!ROOM_ENV) { const pm = new THREE.PMREMGenerator(renderer); ROOM_ENV = pm.fromScene(new RoomEnvironment(), .04).texture; pm.dispose(); }
  if (!SKY_ENV) SKY_ENV = scene.environment;
}
function coreFind(x, z) {
  for (const c of CORE_LIST) { const [s, t] = c.toCore(x, z); if (s > 0 && s < c.L && t > 0 && t < COR) return c; }
  return null;
}
// passagem pela porta de entrada (do lado de fora): o prédio em si continua bloqueado
function coreDoorway(x, z) {
  for (const c of CORE_LIST) {
    const [s, t] = c.toCore(x, z);
    if (s > -1.4 && s < .35 && t > CORE_DOOR[0] + R_PLAYER && t < CORE_DOOR[1] - R_PLAYER) return true;
  }
  return false;
}
// altura do piso onde o visitante está (na escada, sobe junto com os degraus)
function coreLevel() {
  if (!CORE) return 0;
  if (CORE.flight == null) return CORE.k * FLOOR_H;
  const s = CORE.core.toCore(walk.x, walk.z)[0];
  return CORE.flight * FLOOR_H + FLOOR_H * clamp((s - CORE_ST0) / (CORE_ST1 - CORE_ST0), 0, 1);
}
function coreBlocked(x, z) {
  const c = CORE.core, [s, t] = c.toCore(x, z), R = CORE_R;
  if (t < R || t > COR - R || s > c.L - .15 - R) return true;
  if (s < .15 + R) return !(CORE.flight == null && CORE.k === 0 && s > -1.3 && t > CORE_DOOR[0] + R && t < CORE_DOOR[1] - R);   // só a porta do térreo
  const lane = s > CORE_ST0 && s < CORE_ST1;
  if (CORE.flight != null) return lane && t < CORE_GAL + R;          // na escada: o guarda-corpo separa da galeria
  if (!lane || t < CORE_GAL - R) return false;                       // halls e galeria
  if (t > CORE_GAL + R) {                                             // boca da escada: sobe pelo hall da entrada, desce pelo do fundo
    if (s < CORE_ST0 + .6 && CORE.k <= c.F - 2) return false;
    if (s > CORE_ST1 - .6 && CORE.k >= 1) return false;
  }
  return true;
}
function coreFloorLabel() {
  if (!CORE) return '';
  return CORE.flight == null ? floorName(CORE.k) : `Escada · ${floorName(CORE.flight)} ↕ ${floorName(CORE.flight + 1)}`;
}
let lastCoreUi = '';
function updateCoreUi() {
  const sub = coreFloorLabel();
  if (sub === lastCoreUi) return;
  lastCoreUi = sub;
  $('inName').textContent = `Bloco ${CORE.core.block}`;
  $('inSub').textContent = sub;
  if (CORE.flight == null) assignCoreLights();
}
// chamado depois de cada passo dentro do núcleo
function coreUpdate() {
  const c = CORE.core, [s, t] = c.toCore(walk.x, walk.z);
  if (CORE.flight == null) {
    if (s > CORE_ST0 && s < CORE_ST1 && t > CORE_GAL) CORE.flight = s < (CORE_ST0 + CORE_ST1) / 2 ? CORE.k : CORE.k - 1;
  } else if (s <= CORE_ST0) { CORE.k = CORE.flight; CORE.flight = null; }
  else if (s >= CORE_ST1) { CORE.k = CORE.flight + 1; CORE.flight = null; }
  if (CORE.flight == null && CORE.k === 0 && s < .05) { leaveCore(); return; }   // saiu pela porta
  updateCoreUi();
}
// do lado de fora: passou da porta → está no hall do térreo
function maybeEnterCore() {
  const c = coreFind(walk.x, walk.z);
  if (c && c.toCore(walk.x, walk.z)[0] > .2) enterCore(c, 0);
}
function assignCoreLights() {
  const c = CORE.core, ks = [CORE.k, CORE.k + 1, CORE.k - 1].filter((k) => k >= 0 && k < c.F);
  let n = 0;
  for (const k of ks) for (const s of [.8, c.L - .8]) {
    const L = lampLights[n++]; if (!L) break;
    const [x, z] = c.toW(s, COR / 2); L.position.set(x, k * FLOOR_H + 2.3, z); L.distance = 6; L.userData.power = 3;
  }
  for (; n < lampLights.length; n++) { lampLights[n].userData.power = 0; }
  invalidate();
}
function enterCore(c, k) {
  ensureRoomEnv();
  scene.environment = ROOM_ENV;
  const first = !CORE;
  CORE = { core: c, k, flight: null };
  lastCoreUi = '';
  const [cx, cz] = c.toW(c.L / 2, COR / 2);
  aimShadow(new THREE.Vector3(cx, 0, cz), 18);
  shadowAt.set(1e9, 0, 0);
  renderer.shadowMap.needsUpdate = true;
  document.body.classList.add('incore');
  updateCoreUi();
  if (first) toast(IS_TOUCH ? 'Suba pela escada · toque numa porta para entrar no apartamento' : 'Suba pela escada (W/setas) · clique numa porta para entrar no apartamento', 5200);
  invalidate();
}
function leaveCore() {
  if (!CORE) return;
  CORE = null;
  if (SKY_ENV && !INSIDE) scene.environment = SKY_ENV;
  for (const L of lampLights) { L.distance = 16; delete L.userData.power; }
  document.body.classList.remove('incore');
  shadowAt.set(1e9, 0, 0);
  if (!INSIDE) { assignLampLights(new THREE.Vector3(walk.x, 0, walk.z)); followShadow(true); }
  invalidate();
}
function leaveBuilding() { leaveInterior(); leaveCore(); }
// toque dentro do núcleo: numa porta → entra no apartamento; no chão → anda até lá
function coreTap(cx, cy) {
  const r = renderer.domElement.getBoundingClientRect();
  camera.updateMatrixWorld();
  _ray.setFromCamera(new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera);
  const o = _ray.ray.origin, d = _ray.ray.direction, c = CORE.core;
  const ks = CORE.flight == null ? [CORE.k] : [CORE.flight, CORE.flight + 1];
  let best = null, bt = 7;
  for (const q of c.doors) {
    if (!ks.includes(q.k)) continue;
    const y = q.k * FLOOR_H, [x0, z0] = c.toW(q.s0, q.row === 0 ? 0 : COR - .1), [x1, z1] = c.toW(q.s1, q.row === 0 ? .1 : COR);
    const t = rayBox(o, d, Math.min(x0, x1), y, Math.min(z0, z1), Math.max(x0, x1), y + 2.15, Math.max(z0, z1));
    if (t !== null && t < bt) { bt = t; best = q; }
  }
  if (best) { enterApto(c.block, best.num, { door: true }); return; }
  if (d.y > -1e-3) return;
  const tg = (coreLevel() + .02 - o.y) / d.y;
  if (tg <= 0) return;
  const px = o.x + d.x * tg, pz = o.z + d.z * tg, f = blocked(px, pz) ? freeNear(px, pz, 3) : [px, pz];
  if (f) { walkTarget = f; markInput(); invalidate(); }
}
// "Sair do prédio": volta para a frente da entrada do bloco
async function exitBuilding() {
  if (!CORE) return;
  await fadeTo(true);
  const { b, i } = CORE.core;
  leaveCore();
  const d = blockDoor(b, i);
  goWalk(d.x, d.z, d.x + (d.x - d.lx), d.z + (d.z - d.lz), true);
  await frame2();
  await fadeTo(false);
}


// ---------- caminhar dentro do apartamento ----------
function interiorBlocked(x, z) {
  const [X, Z] = INSIDE.fr.toL(x, z), R = APTO_R;
  // com a porta de entrada aberta dá para chegar à soleira e sair
  const door = INSIDE.v.doors.find((d) => d.name === 'entrada');
  if (door && door.isOpen && X > 4.30 + R && X < 5.10 - R && Z > KIT.D_IN - R - .05) return Z > KIT.D_IN + .3;
  if (X < R || X > KIT.W_IN - R || Z < R || Z > KIT.D_IN - R) return true;
  const r2 = R * R;
  for (const c of INSIDE.v.coll) {
    if (c[4] && c[4] !== INSIDE.style) continue;
    const dx = X - clamp(X, c[0], c[2]), dz = Z - clamp(Z, c[1], c[3]);
    if (dx * dx + dz * dz < r2) return true;
  }
  return false;
}
function stepInterior(dt) {
  if (!INSIDE) return false;
  let moving = false;
  for (const d of INSIDE.v.doors) {
    const target = d.isOpen ? d.openAng : 0;
    if (Math.abs(d.angle - target) > 1e-3) { const sp = (d.speed || 2.6) * dt; d.angle += clamp(target - d.angle, -sp, sp); d.apply(d.angle); moving = true; }
  }
  if (moving) renderer.shadowMap.needsUpdate = true;
  if (INSIDE.fr.toL(walk.x, walk.z)[1] > KIT.D_IN + .05) exitApto();   // passou pela porta de entrada
  return moving;
}
function interiorTap(cx, cy) {
  const r = renderer.domElement.getBoundingClientRect();
  camera.updateMatrixWorld();
  _ray.setFromCamera(new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera);
  _ray.far = 30;
  const v = INSIDE.v;
  const doorHit = _ray.intersectObjects(v.doorGroup.children, true)[0];
  const floorHit = _ray.intersectObjects(v.floors.children, false)[0];
  const wallHit = _ray.intersectObjects(v.walls, false)[0];
  _ray.far = Infinity;
  if (doorHit && (!floorHit || doorHit.distance < floorHit.distance) && (!wallHit || doorHit.distance <= wallHit.distance + .05) && doorHit.distance < 8) {
    const d = doorHit.object.userData.door; d.isOpen = !d.isOpen; markInput(); invalidate(); return;
  }
  if (!floorHit || (wallHit && wallHit.distance < floorHit.distance - .05)) return;
  const f = freeNear(floorHit.point.x, floorHit.point.z, 3);
  if (f) { walkTarget = f; markInput(); invalidate(); }
}
function interiorRoom() {
  const [X, Z] = INSIDE.fr.toL(walk.x, walk.z), id = KIT.roomAt(X, Z);
  return (KIT.VIEWS.find((q) => q.id === id) || { nome: '' }).nome;
}
function toggleInteriorStyle() {
  if (!INSIDE) return;
  INSIDE.style = INSIDE.style === 'tour' ? 'fotos' : 'tour';
  KIT.theme(INSIDE.style, INSIDE.v);
  if (blocked(walk.x, walk.z)) { const f = freeNear(walk.x, walk.z, 3); if (f) { walk.x = f[0]; walk.z = f[1]; applyWalkCamera(camera); } }
  toast(INSIDE.style === 'tour' ? 'Decoração: Tour 360°' : 'Decoração: Fotos do decorado', 2200);
  renderer.shadowMap.needsUpdate = true; invalidate();
}

// ---------- escolha do apartamento ----------
const ALL_BLOCKS = BUILDINGS.flatMap((b) => b.blocks).sort();
function nearestBlock() {
  const x = mode === 'passeio' ? walk.x : controls.target.x, z = mode === 'passeio' ? walk.z : controls.target.z;
  let best = '01', bd = 1e9;
  for (const b of BUILDINGS) b.blocks.forEach((num, i) => { const d = blockDoor(b, i), dist = Math.hypot(d.x - x, d.z - z); if (dist < bd) { bd = dist; best = num; } });
  return best;
}
function openAptoPicker(num) {
  pickBlock = num || (INSIDE ? INSIDE.block : CORE ? CORE.core.block : nearestBlock());
  renderAptoPicker();
  $('aptoModal').classList.add('on');
}
function closeAptoPicker() { $('aptoModal').classList.remove('on'); }
function renderAptoPicker() {
  const f = findBlock(pickBlock);
  $('apTitle').textContent = `Bloco ${pickBlock} — escolha o apartamento`;
  const chips = $('apBlocks'); chips.innerHTML = '';
  for (const n of ALL_BLOCKS) {
    const c = document.createElement('button');
    c.textContent = n; c.setAttribute('aria-pressed', String(n === pickBlock)); c.title = 'Bloco ' + n;
    c.addEventListener('click', () => { pickBlock = n; renderAptoPicker(); });
    chips.appendChild(c);
  }
  const grid = $('apGrid'); grid.innerHTML = '';
  const units = blockUnits(f.b, f.i);
  for (let k = f.b.floors - 1; k >= 0; k--) {
    const lab = document.createElement('div'); lab.className = 'fl'; lab.textContent = floorName(k); grid.appendChild(lab);
    for (const q of units) {
      const num = (k + 1) * 100 + q.n, garden = k === 0 && hasGarden(f.b, q.row, q.u);
      const btn = document.createElement('button');
      btn.innerHTML = num + (garden ? '<i title="com garden">🌿</i>' : '');
      btn.title = `Apto ${num}` + (garden ? ' · térreo com garden' : '') + (q.u % 2 ? ' · planta espelhada' : '');
      if (INSIDE && INSIDE.block === pickBlock && INSIDE.num === num) btn.setAttribute('aria-current', 'true');
      btn.addEventListener('click', () => enterApto(pickBlock, num));
      grid.appendChild(btn);
    }
  }
}
let nearDoorShown = null;
function updateEnterBtn() {
  let best = null, bd = 7.5;
  if (mode === 'passeio' && !INSIDE && !CORE && !tween) for (const b of BUILDINGS) b.blocks.forEach((num, i) => {
    const d = blockDoor(b, i), dist = Math.hypot(d.x - walk.x, d.z - walk.z);
    if (dist < bd) { bd = dist; best = num; }
  });
  if (best === nearDoorShown) return;
  nearDoorShown = best;
  $('enterBtn').classList.toggle('on', !!best);
  if (best) $('enterTxt').textContent = `Apartamentos · Bloco ${best}`;
}
function initInterior() {
  $('enterBtn').addEventListener('click', () => openAptoPicker(nearDoorShown));
  $('apClose').addEventListener('click', closeAptoPicker);
  $('aptoModal').addEventListener('click', (e) => { if (e.target.id === 'aptoModal') closeAptoPicker(); });
  $('apGo').addEventListener('click', () => { const f = findBlock(pickBlock); closeAptoPicker(); if (f) goBlock(f.b, f.i); });
  $('inOut').addEventListener('click', () => (INSIDE ? exitApto() : exitBuilding()));
  $('inStyle').addEventListener('click', toggleInteriorStyle);
  $('inPick').addEventListener('click', () => openAptoPicker());
  addEventListener('keydown', (e) => { if (e.code === 'Escape') closeAptoPicker(); });
}
