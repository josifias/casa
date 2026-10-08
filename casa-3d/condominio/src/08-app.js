// ============================================================
// 08 · APP — cena, modos (aérea, planta, passeio), interface e loop
// ============================================================
let renderer, scene, camera, controls, site;
let mode = '', night = false, needsRender = true, tween = null, hasWalked = false;
const shadowAt = new THREE.Vector3(1e9, 0, 0);
const clock = new THREE.Clock();
const $ = (id) => document.getElementById(id);
function invalidate() { needsRender = true; }
function markInput() { lastInput = performance.now(); }

// ---------- cena ----------
function initScene() {
  renderer = new THREE.WebGLRenderer({ antialias: !LOW_END, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, LOW_END ? 1.2 : IS_TOUCH ? 1.5 : 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  $('app').appendChild(renderer.domElement);
  MAX_ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, .1, 2500);
  camera.rotation.order = 'YXZ';

  const T = [performance.now()];
  TX = makeTextures();
  makeMaterials();
  T.push(performance.now());
  site = new THREE.Group();
  scene.add(site);
  CUR = site;
  generateSite();
  T.push(performance.now());
  mergeGroup(site, 32);
  if (BAIRRO_GROUP.children.length) { scene.add(BAIRRO_GROUP); mergeGroup(BAIRRO_GROUP, 260); }
  T.push(performance.now());
  buildSky(scene, renderer);
  buildGlows(scene);
  T.push(performance.now());
  window.__timing = { texturas: T[1] - T[0], geracao: T[2] - T[1], fusao: T[3] - T[2], ceu: T[4] - T[3] };

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .08;
  controls.rotateSpeed = .6; controls.zoomSpeed = .9; controls.autoRotateSpeed = .35;
  controls.addEventListener('change', () => {
    const t = controls.target;
    t.x = clamp(t.x, Math.min(-10, XMIN), Math.max(LOT_W + 10, XMAX)); t.z = clamp(t.z, Math.min(-10, ZMIN), Math.max(LOT_D + 10, ZMAX)); t.y = 0;
    invalidate();
  });
  controls.addEventListener('start', markInput);
}

// ---------- câmera: poses e transições ----------
const _dummy = new THREE.Object3D();
function poseLookAt(pos, target) { _dummy.position.copy(pos); _dummy.up.set(0, 1, 0); _dummy.lookAt(target); return _dummy.quaternion.clone(); }
function flyTo(pos, quat, fov, dur, onDone, arc = 0) {
  tween = { t0: performance.now(), dur: dur * 1000, p0: camera.position.clone(), q0: camera.quaternion.clone(), f0: camera.fov, p1: pos, q1: quat, f1: fov, arc, onDone };
}
function stepTween() {
  const t = clamp((performance.now() - tween.t0) / tween.dur, 0, 1), e = ease(t);
  camera.position.lerpVectors(tween.p0, tween.p1, e);
  camera.position.y += Math.sin(Math.PI * e) * tween.arc;
  camera.quaternion.slerpQuaternions(tween.q0, tween.q1, e);
  camera.fov = lerp(tween.f0, tween.f1, e);
  camera.updateProjectionMatrix();
  if (t >= 1) { const cb = tween.onDone; tween = null; cb && cb(); }
}

function aereaPose() {
  const portrait = innerWidth / innerHeight < 1, preview = PARAMS.has('preview');
  const target = new THREE.Vector3(portrait ? 41 : 43, 0, preview ? 70 : portrait ? 62 : 68);
  // em pé: olha de sul-sudoeste para o terreno (comprido no sentido norte-sul) caber na largura
  const sph = portrait ? new THREE.Spherical(clamp(150 / (innerWidth / innerHeight), 250, 360), .78, -.42) : new THREE.Spherical(preview ? 128 : 182, .9, -1.05);
  return { target, pos: new THREE.Vector3().setFromSpherical(sph).add(target), fov: 40 };
}
function plantaPose() {
  const aspect = innerWidth / innerHeight, land = aspect > 1;
  const fov = 35, t = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const W = LOT_W + 8, D = LOT_D + 8;   // terreno + calçadas
  const needW = (land ? D : W) * 1.06, needH = (land ? W : D) * (land ? 1.45 : 1.32);
  const d = Math.max(needH / (2 * t), needW / (2 * t * aspect));
  const theta = land ? -Math.PI / 2 : 0;   // em telas largas o terreno fica deitado (portaria embaixo)
  const target = new THREE.Vector3(LOT_W / 2 + (land ? -3 : 0), 0, LOT_D / 2 + (land ? 0 : 2));
  const pos = new THREE.Vector3().setFromSpherical(new THREE.Spherical(d, .0008, theta)).add(target);
  return { target, pos, fov, theta, d };
}

function configControls(m) {
  controls.enabled = m !== 'passeio';
  if (m === 'aerea') {
    Object.assign(controls, { enableRotate: true, enablePan: true, screenSpacePanning: false, minPolarAngle: .1, maxPolarAngle: 1.36, minDistance: 18, maxDistance: BAIRRO ? 900 : 340, minAzimuthAngle: -Infinity, maxAzimuthAngle: Infinity });
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE; controls.touches.ONE = THREE.TOUCH.ROTATE;
  } else if (m === 'planta') {
    const p = plantaPose();
    Object.assign(controls, { enableRotate: false, enablePan: true, screenSpacePanning: true, minPolarAngle: 0, maxPolarAngle: .001, minDistance: 25, maxDistance: p.d * (BAIRRO ? 4 : 1.5), minAzimuthAngle: p.theta, maxAzimuthAngle: p.theta });
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN; controls.touches.ONE = THREE.TOUCH.PAN;
  }
}
function wideShadow() {
  aimShadow(new THREE.Vector3(LOT_W / 2, 0, LOT_D / 2), 96);
  shadowAt.set(1e9, 0, 0);
  renderer.shadowMap.needsUpdate = true;
}
function followShadow(force = false) {
  if (!force && Math.hypot(walk.x - shadowAt.x, walk.z - shadowAt.z) < 10) return;
  shadowAt.set(walk.x, 0, walk.z);
  aimShadow(shadowAt, LOW_END ? 30 : 40);
  assignLampLights(shadowAt);
  renderer.shadowMap.needsUpdate = true;
}

function goAerea(instant = false) {
  const p = aereaPose();
  setMode('aerea');
  controls.enabled = false; walkTarget = null;
  const done = () => { controls.target.copy(p.target); configControls('aerea'); controls.update(); wideShadow(); assignLampLights(p.target); invalidate(); };
  if (instant) { camera.position.copy(p.pos); camera.fov = p.fov; camera.updateProjectionMatrix(); camera.lookAt(p.target); done(); }
  else flyTo(p.pos, poseLookAt(p.pos, p.target), p.fov, 1.6, done);
}
function goPlanta(instant = false) {
  const p = plantaPose();
  setMode('planta');
  controls.enabled = false; walkTarget = null;
  const done = () => { controls.target.copy(p.target); configControls('planta'); controls.update(); wideShadow(); invalidate(); };
  const q = poseLookAt(p.pos, p.target);
  if (instant) { camera.position.copy(p.pos); camera.quaternion.copy(q); camera.fov = p.fov; camera.updateProjectionMatrix(); done(); }
  else flyTo(p.pos, q, p.fov, 1.4, done);
}
function goWalk(x, z, lx, lz, instant = false, yawOverride = null) {
  const f = freeNear(x, z);
  if (!f) return;
  const yaw = yawOverride ?? Math.atan2(-(lx - f[0]), -(lz - f[1]));
  const pitch = -.04, fov = IS_TOUCH && innerWidth < innerHeight ? 76 : 68;
  setMode('passeio');
  controls.enabled = false; walkTarget = null;
  const done = () => { Object.assign(walk, { x: f[0], z: f[1], yaw, pitch, fov }); hasWalked = true; applyWalkCamera(camera); followShadow(true); markInput(); invalidate(); };
  if (instant) { done(); return; }
  const pos = new THREE.Vector3(f[0], EYE, f[1]), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
  const dist = camera.position.distanceTo(pos), low = camera.position.y < 20;
  const arc = low && dist > 20 ? Math.min(dist * .3, 38) : 0;
  if (arc) wideShadow();
  flyTo(pos, q, fov, clamp(.8 + dist * .008, 1, 2.4), done, arc);
}
function goPlace(id, instant = false) {
  const p = PLACES.find((v) => v.id === id) || PLACES[0];
  goWalk(p.pos[0], p.pos[1], p.look[0], p.look[1], instant);
}
// entrada do corredor de um bloco (i = 0 → primeira metade do prédio)
function blockDoor(b, i) {
  const r = bRect(b);
  if (b.dir === 'h') { const z = r.z0 + ROW + COR / 2; return { x: i === 0 ? r.x0 - 2.2 : r.x1 + 2.2, z, lx: (r.x0 + r.x1) / 2, lz: z }; }
  const x = r.x0 + ROW + COR / 2;
  return { x, z: i === 0 ? r.z0 - 2.2 : r.z1 + 2.2, lx: x, lz: (r.z0 + r.z1) / 2 };
}
function goBlock(b, i) { const d = blockDoor(b, i); goWalk(d.x, d.z, d.lx, d.lz); }
const SPOT_PLACE = { 'Guarita': 'portaria', 'Piscina': 'piscina', 'Solarium': 'piscina', 'Salão de festas': 'salao', 'Apoio do salão': 'salao', 'Playground': 'playground', 'Espaço fitness': 'fitness', 'Bicicletário': 'bicicletario', 'Redário': 'redario', 'Piquenique': 'redario', 'Praça': 'praca', 'Praça de jogos': 'jogos', 'Pet place': 'pet', 'Estacionamento': 'estacionamento' };
function goSpot(s) {
  if (SPOT_PLACE[s.nome]) { goPlace(SPOT_PLACE[s.nome]); return; }
  const dx = LOT_W / 2 - s.x, dz = LOT_D / 2 - s.z, d = Math.hypot(dx, dz) || 1;
  goWalk(s.x + dx / d * 18, s.z + dz / d * 18, s.x, s.z);
}

// ---------- modo ----------
function setMode(m) {
  if (mode !== m) {
    mode = m;
    const msg = {
      aerea: IS_TOUCH ? 'Arraste para girar · pinça para zoom · toque num bloco ou área' : 'Arraste para girar · roda para zoom · clique num bloco ou área',
      planta: 'Toque num bloco ou área para descer até lá',
      passeio: IS_TOUCH ? 'Arraste para olhar · toque no chão para andar · joystick para caminhar' : 'Arraste para olhar · clique no chão ou use WASD/setas · Shift corre',
    }[m];
    if (!PARAMS.has('preview')) toast(msg);
    if (scene.fog) { scene.fog.near = m === 'passeio' ? 110 : 380; scene.fog.far = m === 'passeio' ? 520 : 1600; }
  }
  document.body.classList.toggle('walk', m === 'passeio');
  document.querySelectorAll('.modes button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === m)));
  buildLabels();
  invalidate();
}
function toast(msg, ms = 4200) {
  const h = $('hint');
  h.textContent = msg; h.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => h.classList.remove('on'), ms);
}
function setNight(on) {
  night = on;
  setNightTarget(on);
  $('bNight').setAttribute('aria-pressed', String(on));
  if (mode === 'passeio') assignLampLights(shadowAt); else assignLampLights(controls.target);
  invalidate();
}

// ---------- ícones e miniaturas ----------
const ICONS = {
  gate: '<path d="M3 21V4M21 21V4M3 7h18M3 21h18M7.5 7v14M12 7v14M16.5 7v14"/>',
  car: '<path d="M3 17v-4l2.5-6h13L21 13v4H3Z"/><path d="M3 13h18"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  pool: '<path d="M8 16V6a2 2 0 0 0-2-2M16 16V6a2 2 0 0 0-2-2M8 9h8M8 13h8"/><path d="M2 19.5c2.5 0 2.5-1.5 5-1.5s2.5 1.5 5 1.5 2.5-1.5 5-1.5 2.5 1.5 5 1.5"/>',
  party: '<path d="M12 3a5 5 0 0 1 5 5c0 3.5-3 6-5 6s-5-2.5-5-6a5 5 0 0 1 5-5Z"/><path d="m12 14-1 2h2l-1-2M12 16c0 2 2 2.5 0 5"/>',
  slide: '<path d="M4 21V4M9 21V4M4 8h5M4 12h5M4 16h5M9 6c4 0 5 13 11 13v2"/>',
  gym: '<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>',
  tree: '<circle cx="12" cy="9" r="6"/><path d="M12 15v6M9 21h6M12 12l-2.5-2.5M12 13l3-3"/>',
  ping: '<circle cx="10" cy="10" r="6"/><path d="m14.2 14.2 5.8 5.8"/><circle cx="19" cy="5.5" r="1.6"/>',
  paw: '<circle cx="6.5" cy="10" r="1.8"/><circle cx="10" cy="6" r="1.8"/><circle cx="14.5" cy="6" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M12.2 11.5c-3 0-5.5 3.5-5.5 5.5 0 2 2 2.5 3.5 2 1-.3 1.4-.6 2-.6s1 .3 2 .6c1.5.5 3.5 0 3.5-2 0-2-2.5-5.5-5.5-5.5Z"/>',
  hammock: '<path d="M3 4v17M21 4v17M3 8c4 8 14 8 18 0M3 8c4 5 14 5 18 0"/>',
  bike: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="m6 16 4-7h6l2 7M10 9l2.5 7H6M14 6h3"/>',
  bldg: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M11 21v-3h2v3"/>',
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10M10 20v-6h4v6"/>',
  road: '<path d="M7 3 4 21M17 3l3 18M12 4v2.5M12 10.5v3M12 17.5V20"/>',
};
const svgIcon = (k) => `<svg class="i" viewBox="0 0 24 24">${ICONS[k]}</svg>`;
const cleanName = (n) => n.replace('-', '');
function buildThumbs() {
  const box = $('thumbs');
  box.innerHTML = '';
  for (const p of PLACES) {
    const b = document.createElement('button');
    b.className = 'thumb'; b.dataset.id = p.id; b.title = cleanName(p.nome);
    b.innerHTML = `${svgIcon(p.icon)}<span>${p.nome.replace('-', '&shy;')}</span>`;
    b.addEventListener('click', () => goPlace(p.id));
    box.appendChild(b);
  }
  const a = document.createElement('a');
  a.className = 'thumb link'; a.href = '../index.html'; a.title = 'Ver o apartamento tipo por dentro';
  a.innerHTML = `${svgIcon('home')}<span>Apartamento</span>`;
  box.appendChild(a);
}
let currentPlace = null;
function updateThumbs() {
  let cur = null;
  if (mode === 'passeio' && !tween) {
    let bd = 10;
    for (const p of PLACES) {
      const d = Math.min(Math.hypot(p.pos[0] - walk.x, p.pos[1] - walk.z), Math.hypot(p.look[0] - walk.x, p.look[1] - walk.z));
      if (d < bd) { bd = d; cur = p.id; }
    }
  }
  if (cur === currentPlace) return;
  currentPlace = cur;
  document.querySelectorAll('.thumb[data-id]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.id === cur)));
  const act = document.querySelector('.thumb[aria-current="true"]');
  if (act) act.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}

// ---------- minimapa (norte para cima, 1 unidade = 1 m) ----------
const SVGNS = 'http://www.w3.org/2000/svg';
let miniMarker, lastHere = '', lastVB = '';
function buildMinimap() {
  const svg = $('miniSvg');
  svg.innerHTML = '';
  svg.setAttribute('viewBox', '-5 -5 92 140');
  const el = (tag, attrs, text) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text) e.textContent = text; svg.appendChild(e); return e; };
  const rect = (x0, z0, x1, z1, fill, extra = {}) => el('rect', { x: x0, y: z0, width: x1 - x0, height: z1 - z0, fill, ...extra });
  if (BAIRRO) {
    // entorno: quadras, lagoa e ruas (o mapa acompanha o visitante quando ele sai do terreno)
    for (const [green, p] of BAIRRO.blocks) el('path', { d: p.map((r) => 'M' + decRing(r).join(' ') + 'Z').join(''), fill: green ? '#a9c48f' : '#ddd3c2', 'fill-rule': 'evenodd' });
    for (const p of BAIRRO.water) el('path', { d: p.map((r) => 'M' + decRing(r).join(' ') + 'Z').join(''), fill: '#7ec3e6', 'fill-rule': 'evenodd' });
    for (const [w, d, r] of BAIRRO.lines) el('polyline', { points: decRing(r).join(' '), fill: 'none', stroke: d ? '#b9a07c' : '#8f8b86', 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  } else rect(-5, -5, 87, 135, '#9a9690');
  rect(0, 0, 82, 130, '#7ea258', { rx: 1.5 });
  for (const p of [[2, 34, 5, 75], [2, 89, 5, 127], [0, 89, 2, 91], [2, 34, 32, 36], [77, 3, 79, 106], [75, 106, 77, 127], [75, 105, 79, 107], [58, 5, 79, 7], [58, 5, 60, 75], [38, 89, 43, 125]]) rect(...p, '#d9cfbf');
  rect(1, 75, 80, 89, '#6b6b6b'); rect(41, 31, 58, 75, '#6b6b6b');           // estacionamento
  rect(0, 69.5, 1, 76, '#6b6b6b');                                            // portão
  rect(31, 1, 52, 31, '#b9ad98');                                            // área técnica
  rect(1, 2, 23, 9, '#e9e2d6'); rect(5, 11, 13, 18, '#5a6f8f'); rect(15, 11, 20, 18, '#e9e2d6');
  rect(2, 19, 10, 34, '#e7e1d6'); rect(3, 20, 9, 33, '#4fb3d9');               // piscina
  rect(10, 19, 15, 34, '#c49a6c'); rect(15.3, 25.8, 26.3, 33.2, '#f4f1ea'); rect(21, 11, 30, 19, '#e2a15a');
  rect(53, 8, 58, 31, '#cfc6b6'); rect(38, 104, 43, 110, '#c8754e'); rect(38, 117, 43, 124, '#c8754e'); rect(77, 110, 81, 123, '#d8c59a');
  rect(1.2, 83, 5.2, 87.5, '#f4f1ea');                                       // guarita
  for (const b of BUILDINGS) {
    const r = bRect(b);
    rect(r.x0, r.z0, r.x1, r.z1, '#cf6b4c', { stroke: '#7c3a26', 'stroke-width': .5, rx: .6 });
    const halves = b.dir === 'h'
      ? [[(r.x0 * 3 + r.x1) / 4, (r.z0 + r.z1) / 2], [(r.x0 + r.x1 * 3) / 4, (r.z0 + r.z1) / 2]]
      : [[(r.x0 + r.x1) / 2, (r.z0 * 3 + r.z1) / 4], [(r.x0 + r.x1) / 2, (r.z0 + r.z1 * 3) / 4]];
    b.blocks.forEach((n, i) => el('text', { x: halves[i][0], y: halves[i][1] + 1.6, 'font-size': 4.6, 'text-anchor': 'middle', fill: '#fff', 'font-family': 'system-ui,sans-serif', 'font-weight': 700 }, n));
  }
  miniMarker = document.createElementNS(SVGNS, 'g');
  miniMarker.innerHTML = '<path d="M0 0 L-5 -10 A11 11 0 0 1 5 -10 Z" fill="rgba(255,190,120,.55)"/><circle r="2.2" fill="#e0874f" stroke="#fff" stroke-width=".8"/>';
  svg.appendChild(miniMarker);
}
function updateMinimap() {
  if (!miniMarker) return;
  let x, z, yaw;
  if (mode === 'passeio' && !tween) { x = walk.x; z = walk.z; yaw = walk.yaw; }
  else if (mode === 'passeio') { x = camera.position.x; z = camera.position.z; yaw = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y; }
  else { x = controls.target.x; z = controls.target.z; const d = camera.position.clone().sub(controls.target); yaw = Math.atan2(d.x, d.z); }
  miniMarker.setAttribute('transform', `translate(${x.toFixed(2)} ${z.toFixed(2)}) rotate(${(-yaw * 180 / Math.PI).toFixed(1)})`);
  const out = BAIRRO && mode === 'passeio' && (x < -8 || x > LOT_W + 8 || z < -8 || z > LOT_D + 8);
  const vb = out ? `${(x - 60).toFixed(1)} ${(z - 91).toFixed(1)} 120 183` : '-5 -5 92 140';
  if (vb !== lastVB) { lastVB = vb; $('miniSvg').setAttribute('viewBox', vb); }
  const here = mode === 'passeio' ? placeName(x, z) : 'Vista geral';
  if (here !== lastHere) { lastHere = here; $('here').textContent = here; }
}
function miniClick(ev) {
  const svg = $('miniSvg'), pt = svg.createSVGPoint();
  pt.x = ev.clientX; pt.y = ev.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const free = freeNear(p.x, p.y);
  if (!free) return;
  if (mode === 'passeio' && Math.hypot(free[0] - walk.x, free[1] - walk.z) < 25) { walkTarget = free; markInput(); invalidate(); return; }
  const from = mode === 'passeio' ? [walk.x, walk.z] : [LOT_W / 2, LOT_D / 2];
  const dx = free[0] - from[0], dz = free[1] - from[1];
  goWalk(free[0], free[1], 0, 0, false, Math.hypot(dx, dz) > 1 ? Math.atan2(-dx, -dz) : 0);
}

// ---------- rótulos (vista aérea / planta) ----------
let labelEls = [];
function buildLabels() {
  const box = $('labels');
  box.innerHTML = ''; labelEls = [];
  if (mode === 'passeio' || !mode || PARAMS.has('preview')) return;
  const add = (html, cls, x, y, z, prio, onClick) => {
    const d = document.createElement('div');
    d.className = cls; d.innerHTML = html;
    d.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    box.appendChild(d);
    labelEls.push({ el: d, x, y, z, prio, w: d.offsetWidth, h: d.offsetHeight });
  };
  for (const b of BUILDINGS) {
    const r = bRect(b), h = b.floors * FLOOR_H + 2.6;
    const halves = b.dir === 'h'
      ? [[(r.x0 * 3 + r.x1) / 4, (r.z0 + r.z1) / 2], [(r.x0 + r.x1 * 3) / 4, (r.z0 + r.z1) / 2]]
      : [[(r.x0 + r.x1) / 2, (r.z0 * 3 + r.z1) / 4], [(r.x0 + r.x1) / 2, (r.z0 + r.z1 * 3) / 4]];
    b.blocks.forEach((n, i) => add('Bloco ' + n, 'lab blk', halves[i][0], h, halves[i][1], 2, () => goBlock(b, i)));
  }
  for (const s of SPOTS) add(s.nome, 'lab', s.x, 2.2, s.z, 1, () => goSpot(s));
}
const _pv = new THREE.Vector3();
function updateOverlays() {
  if (!labelEls.length) return;
  const w = innerWidth, h = innerHeight, placed = [];
  for (const L of labelEls) {
    _pv.set(L.x, L.y, L.z);
    L.d = _pv.distanceToSquared(camera.position);
    _pv.project(camera);
    L.sx = (_pv.x + 1) / 2 * w; L.sy = (1 - _pv.y) / 2 * h;
    L.ok = !tween && _pv.z < 1 && L.sx - L.w / 2 > 4 && L.sx + L.w / 2 < w - 4 && L.sy > 100 && L.sy < h - 110;
  }
  const order = [...labelEls].sort((a, b) => b.prio - a.prio || a.d - b.d);
  for (const L of order) {
    let vis = L.ok;
    if (vis) for (const P of placed) if (Math.abs(P.sx - L.sx) < (P.w + L.w) / 2 + 4 && Math.abs(P.sy - L.sy) < (P.h + L.h) / 2 + 3) { vis = false; break; }
    L.el.style.display = vis ? '' : 'none';
    if (vis) { placed.push(L); L.el.style.left = L.sx.toFixed(1) + 'px'; L.el.style.top = L.sy.toFixed(1) + 'px'; }
  }
}

// ---------- toque no chão / nos prédios ----------
const _ray = new THREE.Raycaster();
function rayBox(o, d, x0, y0, z0, x1, y1, z1) {
  let tmin = 0, tmax = Infinity;
  for (const [oo, dd, a, b] of [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]]) {
    if (Math.abs(dd) < 1e-9) { if (oo < a || oo > b) return null; continue; }
    let t1 = (a - oo) / dd, t2 = (b - oo) / dd;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}
function pickAt(cx, cy) {
  const r = renderer.domElement.getBoundingClientRect();
  camera.updateMatrixWorld();
  _ray.setFromCamera(new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera);
  const o = _ray.ray.origin, d = _ray.ray.direction;
  let best = null, bt = Infinity;
  for (const b of BUILDINGS) {
    const q = bRect(b), t = rayBox(o, d, q.x0, 0, q.z0, q.x1, b.floors * FLOOR_H + 1.5, q.z1);
    if (t !== null && t < bt) { bt = t; best = b; }
  }
  const tg = d.y < -1e-4 ? -o.y / d.y : Infinity;
  if (best && bt < tg) { const p = o.clone().addScaledVector(d, bt); return { building: best, x: p.x, z: p.z, dist: bt }; }
  if (tg === Infinity) return null;
  const p = o.clone().addScaledVector(d, tg);
  return { x: p.x, z: p.z, dist: tg };
}
function onTap(cx, cy) {
  if (tween) return;
  const hit = pickAt(cx, cy);
  if (!hit) return;
  if (mode === 'passeio') {
    let tx = hit.x, tz = hit.z;
    if (hit.building) { const dx = tx - walk.x, dz = tz - walk.z, d = Math.hypot(dx, dz) || 1; tx -= dx / d * .9; tz -= dz / d * .9; }
    const f = freeNear(clamp(tx, XMIN + 1, XMAX - 1), clamp(tz, ZMIN + 1, ZMAX - 1));
    if (f) { walkTarget = f; markInput(); invalidate(); }
    return;
  }
  if (hit.building) {
    const b = hit.building, r = bRect(b);
    goBlock(b, b.dir === 'h' ? (hit.x < (r.x0 + r.x1) / 2 ? 0 : 1) : (hit.z < (r.z0 + r.z1) / 2 ? 0 : 1));
    return;
  }
  if (hit.x < XMIN || hit.x > XMAX || hit.z < ZMIN || hit.z > ZMAX) return;
  // desce até o ponto tocado, olhando na direção em que a câmera já olhava
  const fw = new THREE.Vector3(); camera.getWorldDirection(fw);
  if (Math.abs(fw.y) > .95) fw.set(0, 1, 0).applyQuaternion(camera.quaternion);
  goWalk(hit.x, hit.z, 0, 0, false, Math.atan2(-fw.x, -fw.z));
}

// ---------- botões ----------
function initButtons() {
  document.querySelectorAll('.modes button').forEach((b) => b.addEventListener('click', () => {
    const m = b.dataset.mode;
    if (m === 'aerea') goAerea();
    else if (m === 'planta') goPlanta();
    else if (mode !== 'passeio') { if (hasWalked) goWalk(walk.x, walk.z, 0, 0, false, walk.yaw); else goPlace('portaria'); }
  }));
  $('bNight').addEventListener('click', () => setNight(!night));
  const openInfo = () => $('modal').classList.add('on');
  $('bInfo').addEventListener('click', openInfo); $('bInfo2').addEventListener('click', openInfo);
  $('mClose').addEventListener('click', () => $('modal').classList.remove('on'));
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') $('modal').classList.remove('on'); });
  const fsOk = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  if (!fsOk) $('bFull').style.display = 'none';
  $('bFull').addEventListener('click', () => {
    const d = document, el = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
  });
  $('miniSvg').addEventListener('click', miniClick);
  initWalkInput(renderer.domElement, {
    isWalking: () => mode === 'passeio',
    busy: () => !!tween,
    changed: () => { if (mode === 'passeio' && !tween) applyWalkCamera(camera); invalidate(); },
    tap: onTap,
    toggleNight: () => setNight(!night),
  });
}

// ---------- loop ----------
let frames = 0, fpsT = performance.now();
function render() {
  renderer.render(scene, camera);
  updateOverlays(); updateMinimap(); updateThumbs();
  if (PARAMS.has('debug')) {
    frames++;
    const now = performance.now();
    if (now - fpsT > 1000) { $('fps').textContent = `${frames} fps · ${renderer.info.render.calls} draws · ${(renderer.info.render.triangles / 1000).toFixed(0)}k tris`; frames = 0; fpsT = now; }
  }
}
function loop() {
  requestAnimationFrame(loop);
  const raw = clock.getDelta(), dt = Math.min(raw, .05);
  let active = PARAMS.has('debug');
  if (tween) { stepTween(); active = true; }
  if (controls.enabled) {
    const idle = performance.now() - lastInput;
    controls.autoRotate = mode === 'aerea' && !PARAMS.has('preview') && idle > 9000 && idle < 70000;
    if (controls.update(dt)) active = true;
  }
  if (mode === 'passeio' && !tween && stepWalk(Math.min(raw, .1))) { applyWalkCamera(camera); followShadow(); active = true; }
  if (updateSky(Math.min(raw, .1), camera, renderer)) active = true;
  if (active || needsRender) { render(); needsRender = false; }
}
function onResize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (mode === 'planta' && !tween) goPlanta(true);
  buildLabels();
  invalidate();
}

// ---------- inicialização ----------
function boot() {
  initScene();
  if (PARAMS.has('preview')) document.body.classList.add('preview');
  if (IS_TOUCH) document.body.classList.add('touch');
  if (PARAMS.has('debug')) $('fps').style.display = 'block';
  buildThumbs(); buildMinimap(); initButtons();
  if (PARAMS.has('noite')) { night = true; setNightTarget(true); $('bNight').setAttribute('aria-pressed', 'true'); }
  const modo = PARAMS.get('modo'), local = PARAMS.get('local');
  if (local) goPlace(local, true);
  else if (modo === 'planta') goPlanta(true);
  else if (modo === 'passeio') goPlace('portaria', true);
  else goAerea(true);
  updateSky(0, camera, renderer, true);
  addEventListener('resize', onResize);
  if (PARAMS.has('debug')) window.__condo = { goWalk, goPlace, goBlock, goAerea, goPlanta, setNight, walk, blocked, freeNear, COLL, LAMPS, PLACES, camera, renderer, scene, onTap, rect: (i) => bRect(BUILDINGS[i]), blockDoors: () => BUILDINGS.flatMap((b) => b.blocks.map((n, i) => { const d = blockDoor(b, i); return [n, d.x, d.z]; })), get mode() { return mode; }, get tod() { return tod; }, get walkTarget() { return walkTarget; }, get tween() { return tween; } };
  // compila os shaders sem travar a tela de carregamento (quando o navegador permite)
  const go = () => { loop(); requestAnimationFrame(() => requestAnimationFrame(() => { $('loader').classList.add('off'); window.__ready = true; })); };
  const c = renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera));
  c.then(go, go);
}

function start() {
  try { boot(); }
  catch (err) {
    console.error(err);
    window.__errors && window.__errors.push(String(err && err.stack || err));
    const l = $('loader');
    l.querySelector('b').textContent = 'Não foi possível carregar o 3D neste aparelho.';
    l.querySelector('small').textContent = 'Tente abrir em outro navegador (Chrome/Safari atualizados). Detalhe: ' + (err && err.message);
    l.querySelector('.sp').style.display = 'none';
  }
}
// deixa a tela de carregamento aparecer antes de montar o condomínio (pode levar alguns segundos)
requestAnimationFrame(() => setTimeout(start, 30));
