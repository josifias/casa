// ============================================================
// 07 · INTERFACE — modos, miniaturas, minimapa, rótulos, entrada, loop
// ============================================================
const $ = (id) => document.getElementById(id);
const ICONS = {
  door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M4 21h16M14.5 12.5v.01"/>',
  sofa: '<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3v-5ZM5 18v2M19 18v2"/>',
  stove: '<rect x="4" y="8" width="16" height="13" rx="1"/><path d="M4 12h16M8 4.5v1.5M12 3.5v2.5M16 4.5v1.5"/><rect x="7" y="14.5" width="10" height="4" rx=".5"/>',
  wash: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4.5"/><path d="M7 6h2M13 6h4"/>',
  bath: '<path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2ZM6 12V5a2 2 0 0 1 3.5-1.3M7 19l-1 2M17 19l1 2"/>',
  bed: '<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.6"/>',
  kids: '<path d="M4 3v18M16 3v18M4 8h12M4 15h12M18 6h3M18 10h3M18 14h3M19.5 4v14"/><circle cx="8" cy="12" r="1.4"/>',
};
const svgIcon = (k) => `<svg class="i" viewBox="0 0 24 24">${ICONS[k]}</svg>`;

function toast(msg, ms = 4200) {
  const h = $('hint');
  h.textContent = msg; h.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => h.classList.remove('on'), ms);
}

function setMode(m) {
  if (mode !== m) {
    mode = m;
    const msg = {
      maquete: IS_TOUCH ? 'Arraste para girar · pinça para zoom · toque num cômodo' : 'Arraste para girar · roda para zoom · clique num cômodo',
      planta: 'Toque num cômodo para entrar',
      passeio: IS_TOUCH ? 'Arraste para olhar · toque no chão para andar' : 'Arraste para olhar · clique no chão ou use WASD/setas',
    }[m];
    if (!PARAMS.has('preview')) toast(msg);
  }
  document.body.classList.toggle('walk', m === 'passeio');
  document.querySelectorAll('.modes button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === m)));
  buildLabels();
  invalidate();
}

// ---------- miniaturas ----------
let currentRoom = null;
function buildThumbs() {
  const box = $('thumbs');
  box.innerHTML = '';
  for (const v of VIEWS) {
    const b = document.createElement('button');
    b.className = 'thumb'; b.dataset.id = v.id;
    b.innerHTML = `${svgIcon(v.icon)}<span>${v.nome}</span>`;
    b.addEventListener('click', () => goView(v.id));
    box.appendChild(b);
  }
}
function updateThumbs() {
  let room = null;
  if (mode === 'passeio' && !tween) room = roomAt(...toLocal(walk.x, walk.z));
  if (room === currentRoom) return;
  currentRoom = room;
  document.querySelectorAll('.thumb').forEach((b) => b.setAttribute('aria-current', String(b.dataset.id === room)));
  const act = document.querySelector('.thumb[aria-current="true"]');
  if (act) act.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}

// ---------- minimapa (orientação do mundo, norte para cima) ----------
const SVGNS = 'http://www.w3.org/2000/svg';
let miniMarker;
function buildMinimap() {
  const svg = $('miniSvg');
  svg.innerHTML = '';
  const el = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; };
  const wx = (lx) => MIRROR * (lx - CX) + CX;
  el('rect', { x: -T, y: -T, width: W_IN + 2 * T, height: D_IN + 2 * T, fill: '#3a332c', rx: .04 });
  const fills = { infantil: '#d8b995', sala: '#d8b995', casal: '#d8b995', cozinha: '#e7e1d8', banheiro: '#e7e1d8' };
  for (const [id, r] of Object.entries(ROOMS)) {
    const x1 = Math.min(wx(r.rect[0]), wx(r.rect[2]));
    el('rect', { x: x1, y: r.rect[1], width: r.rect[2] - r.rect[0], height: r.rect[3] - r.rect[1], fill: fills[id] });
    const t = el('text', { x: x1 + (r.rect[2] - r.rect[0]) / 2, y: r.rect[1] + (r.rect[3] - r.rect[1]) / 2 + .12, 'font-size': .34, 'text-anchor': 'middle', fill: '#4a3d31', 'font-family': 'system-ui,sans-serif', 'font-weight': 600 });
    t.textContent = r.short;
  }
  // vãos de porta
  for (const [lx1, lz1, lx2, lz2] of [[2.40, .97, 2.50, 1.72], [4.90, 2.15, 5.00, 2.90], [5.30, 3.20, 5.40, 3.90], [4.30, 4.60, 5.10, 4.70], [2.50, 3.00, 4.90, 3.10]]) {
    const a = wx(lx1), b = wx(lx2);
    el('rect', { x: Math.min(a, b), y: lz1, width: Math.abs(b - a), height: lz2 - lz1, fill: lz1 >= 4.6 ? '#9a5a32' : '#d8b995' });
  }
  miniMarker = document.createElementNS(SVGNS, 'g');
  miniMarker.innerHTML = '<path d="M0 0 L-0.75 -1.5 A1.7 1.7 0 0 1 0.75 -1.5 Z" fill="rgba(224,135,79,.45)"/><circle r="0.17" fill="#e0874f" stroke="#fff" stroke-width="0.06"/>';
  svg.appendChild(miniMarker);
}
function updateMinimap() {
  if (!miniMarker) return;
  let x, z, yaw;
  if (mode === 'passeio') { x = camera.position.x; z = camera.position.z; const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ'); yaw = e.y; }
  else { x = controls.target.x; z = controls.target.z; const d = camera.position.clone().sub(controls.target); yaw = Math.atan2(d.x, d.z); }
  miniMarker.setAttribute('transform', `translate(${(x + CX).toFixed(3)} ${(z + CZ).toFixed(3)}) rotate(${(-yaw * 180 / Math.PI).toFixed(1)})`);
}
function miniClick(ev) {
  const svg = $('miniSvg'), pt = svg.createSVGPoint();
  pt.x = ev.clientX; pt.y = ev.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const w = [p.x - CX, p.y - CZ];
  const free = freeNear(w[0], w[1]);
  if (!free) return;
  const [lx, lz] = toLocal(free[0], free[1]);
  const room = roomAt(lx, lz);
  if (mode !== 'passeio') { goView(room); return; }
  walkTarget = free; markInput(); invalidate();
}

// ---------- rótulos (maquete/planta) e hotspots (passeio) ----------
let labelEls = [], hotEls = [];
const ROOM_VIEW = { infantil: 'infantil', sala: 'sala', casal: 'casal', cozinha: 'cozinha', banheiro: 'banheiro' };
function buildLabels() {
  const box = $('labels');
  box.innerHTML = ''; labelEls = []; hotEls = [];
  if (mode === 'passeio') {
    for (const v of VIEWS) {
      const d = document.createElement('div');
      d.className = 'hot'; d.innerHTML = `<span>${v.nome}</span>`;
      d.addEventListener('click', (e) => { e.stopPropagation(); goView(v.id); });
      box.appendChild(d); hotEls.push({ el: d, v });
    }
  } else {
    for (const [id, r] of Object.entries(ROOMS)) {
      const d = document.createElement('div');
      d.className = 'lab';
      d.innerHTML = mode === 'planta' ? `${r.nome}<small>${r.dims} · ${r.area}</small>` : r.short;
      d.addEventListener('click', (e) => { e.stopPropagation(); goView(ROOM_VIEW[id]); });
      box.appendChild(d); labelEls.push({ el: d, r });
    }
  }
}
const _v = new THREE.Vector3(), _ray = new THREE.Raycaster();
let occluders = [];
function updateOverlays() {
  const w = innerWidth, h = innerHeight;
  const place = (el, v) => { el.style.left = ((v.x + 1) / 2 * w).toFixed(1) + 'px'; el.style.top = ((1 - v.y) / 2 * h).toFixed(1) + 'px'; };
  for (const { el, r } of labelEls) {
    const c = toWorld((r.rect[0] + r.rect[2]) / 2, mode === 'planta' ? .1 : 1.0, (r.rect[1] + r.rect[3]) / 2);
    _v.copy(c).project(camera);
    const vis = !tween && _v.z < 1;
    el.style.display = vis ? '' : 'none';
    if (vis) place(el, _v);
  }
  if (!hotEls.length) return;
  const [lx, lz] = toLocal(camera.position.x, camera.position.z);
  const here = roomAt(lx, lz);
  for (const { el, v } of hotEls) {
    const p = toWorld(v.pos[0], .02, v.pos[1]);
    const dist = p.distanceTo(camera.position);
    let vis = !tween && v.id !== here && dist < 6.5 && dist > .7;
    if (vis) { _v.copy(p).project(camera); vis = _v.z < 1 && Math.abs(_v.x) < 1.1 && Math.abs(_v.y) < 1.1; }
    if (vis) {
      _ray.set(camera.position, p.clone().sub(camera.position).normalize());
      _ray.far = dist - .1;
      vis = _ray.intersectObjects(occluders, false).length === 0;
    }
    el.style.display = vis ? '' : 'none';
    if (vis) { place(el, _v); const s = clamp(1.25 - dist * .09, .55, 1.1); el.style.transform = `scale(${s.toFixed(2)})`; }
  }
}

// ---------- entrada de ponteiro / toque ----------
const pointers = new Map();
let pinch0 = 0, fov0 = 70;
function screenRay(x, y) {
  const r = renderer.domElement.getBoundingClientRect();
  camera.updateMatrixWorld();
  _ray.setFromCamera(new THREE.Vector2((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1), camera);
  _ray.far = 60;
  return _ray;
}
function onTap(x, y) {
  const ray = screenRay(x, y);
  const doorHit = ray.intersectObjects(ARCH.doors.children, true)[0];
  const floorHit = ray.intersectObjects(ARCH.floors.children, false)[0];
  const wallHit = ray.intersectObjects(occluders, false)[0];
  if (doorHit && (!floorHit || doorHit.distance < floorHit.distance) && (!wallHit || doorHit.distance <= wallHit.distance + .05) && doorHit.distance < 8) {
    const d = doorHit.object.userData.door; d.isOpen = !d.isOpen; markInput(); invalidate(); return;
  }
  if (!floorHit || (wallHit && wallHit.distance < floorHit.distance - .05)) return;
  const [lx, lz] = toLocal(floorHit.point.x, floorHit.point.z);
  if (mode !== 'passeio') { goView(roomAt(lx, lz)); return; }
  const free = freeNear(floorHit.point.x, floorHit.point.z);
  if (free) { walkTarget = free; markInput(); invalidate(); }
}
function initInput() {
  const cv = renderer.domElement;
  cv.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() });
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); fov0 = walk.fov; }
    markInput();
  });
  cv.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (mode !== 'passeio' || tween) return;
    if (pointers.size === 1) {
      const k = .0042 * (walk.fov / 70) * (IS_TOUCH ? 1.25 : 1);
      walk.yaw += dx * k; walk.pitch = clamp(walk.pitch + dy * k, -1.25, 1.1);
      walkTarget = null; applyWalkCamera(); invalidate(); markInput();
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0 > 0) { walk.fov = clamp(fov0 * pinch0 / d, 35, 90); applyWalkCamera(); invalidate(); }
    }
  });
  const up = (e) => {
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (!p || pointers.size) return;
    if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 8 && performance.now() - p.t0 < 400) onTap(e.clientX, e.clientY);
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', (e) => pointers.delete(e.pointerId));
  cv.addEventListener('wheel', (e) => {
    if (mode !== 'passeio') return;
    e.preventDefault();
    walk.fov = clamp(walk.fov + Math.sign(e.deltaY) * 4, 35, 90); applyWalkCamera(); invalidate(); markInput();
  }, { passive: false });

  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input,textarea')) return;
    if (e.code === 'Escape') { $('modal').classList.remove('on'); return; }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      if (mode !== 'passeio') return;
      keys[e.code] = true; e.preventDefault();
    }
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  // joystick
  const jb = $('joy'), knob = jb.querySelector('i');
  let jid = null;
  const jmove = (e) => {
    const r = jb.getBoundingClientRect(), R = r.width / 2;
    let x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    joy.x = Math.abs(x) < .15 ? 0 : x; joy.y = Math.abs(y) < .15 ? 0 : y;
    knob.style.transform = `translate(${x * R * .6}px,${y * R * .6}px)`;
    markInput(); invalidate();
  };
  jb.addEventListener('pointerdown', (e) => { jid = e.pointerId; jb.setPointerCapture(jid); joy.active = true; jmove(e); });
  jb.addEventListener('pointermove', (e) => { if (e.pointerId === jid) jmove(e); });
  const jend = () => { jid = null; joy.active = false; joy.x = joy.y = 0; knob.style.transform = ''; };
  jb.addEventListener('pointerup', jend); jb.addEventListener('pointercancel', jend);

  $('miniSvg').addEventListener('click', miniClick);
}

// ---------- botões ----------
function initButtons() {
  document.querySelectorAll('.modes button').forEach((b) => b.addEventListener('click', () => {
    const m = b.dataset.mode;
    if (m === 'maquete') goMaquete(); else if (m === 'planta') goPlanta(); else goView(mode === 'passeio' ? (roomAt(...toLocal(walk.x, walk.z))) : 'entrada');
  }));
  const setStyleLbl = () => { $('bStyleLbl').textContent = 'Estilo: ' + THEMES[CURRENT_STYLE].label; };
  $('bStyle').addEventListener('click', () => {
    applyTheme(CURRENT_STYLE === 'tour' ? 'fotos' : 'tour');
    setStyleLbl(); toast('Estilo: ' + THEMES[CURRENT_STYLE].label, 2200);
    if (mode === 'passeio' && blocked(walk.x, walk.z)) { const f = freeNear(walk.x, walk.z); if (f) { walk.x = f[0]; walk.z = f[1]; applyWalkCamera(); } }
    renderer.shadowMap.needsUpdate = true; invalidate();
  });
  setStyleLbl();
  $('bNight').addEventListener('click', () => { setNight(!night); $('bNight').setAttribute('aria-pressed', String(night)); });
  $('bMirror').addEventListener('click', () => {
    setMirror(-MIRROR); $('bMirror').setAttribute('aria-pressed', String(MIRROR === -1)); buildMinimap();
    toast(MIRROR === -1 ? 'Planta espelhada' : 'Planta original', 2000);
  });
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
}

// ---------- loop ----------
let frames = 0, fpsT = performance.now();
function render() {
  renderer.render(scene, camera);
  updateOverlays(); updateMinimap(); updateThumbs();
  if (PARAMS.has('debug')) {
    frames++;
    const now = performance.now();
    if (now - fpsT > 1000) { $('fps').textContent = `${frames} fps · ${renderer.info.render.calls} draws · ${renderer.info.render.triangles} tris`; frames = 0; fpsT = now; }
  }
}
function loop() {
  requestAnimationFrame(loop);
  const raw = clock.getDelta(), dt = Math.min(raw, .05);
  let active = PARAMS.has('debug');
  if (tween) { stepTween(); active = true; }
  if (controls.enabled && controls.update()) active = true;
  if (mode === 'passeio' && !tween && stepWalk(dt)) active = true;
  if (stepDoors(Math.min(raw, .25))) { active = true; renderer.shadowMap.needsUpdate = true; }
  if (active || needsRender) {
    if (mode === 'maquete') updateCutaway();
    render();
    needsRender = false;
  }
}

function onResize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (mode === 'planta' && !tween) goPlanta(true);
  invalidate();
}

// ---------- inicialização ----------
function boot() {
  initScene();
  occluders = [ARCH.inner, ...Object.values(ARCH.ext)].flatMap((g) => g.children.filter((c) => c.isMesh && c.material === M.wall));
  if (PARAMS.get('estilo') === 'fotos') applyTheme('fotos'); else applyTheme('tour');
  if (PARAMS.has('espelho')) { setMirror(-1); $('bMirror').setAttribute('aria-pressed', 'true'); }
  if (PARAMS.has('noite')) { setNight(true); $('bNight').setAttribute('aria-pressed', 'true'); }
  if (PARAMS.has('preview')) document.body.classList.add('preview');
  if (IS_TOUCH) document.body.classList.add('touch');
  if (PARAMS.has('debug')) $('fps').style.display = 'block';
  buildThumbs(); buildMinimap(); initInput(); initButtons();
  const modo = PARAMS.get('modo'), comodo = PARAMS.get('comodo');
  if (comodo) goView(comodo, true);
  else if (modo === 'planta') goPlanta(true);
  else if (modo === 'passeio') goView('entrada', true);
  else goMaquete(true);
  addEventListener('resize', onResize);
  renderer.compile(scene, camera);
  loop();
  if (PARAMS.has('debug')) window.__casa = { applyWalkCamera, goView, goMaquete, goPlanta, setNight, applyTheme, setMirror, DOORS, walk, blocked, COLL, get mode() { return mode; }, get walkTarget() { return walkTarget; } };
  requestAnimationFrame(() => requestAnimationFrame(() => { $('loader').classList.add('off'); window.__ready = true; }));
}

try { boot(); }
catch (err) {
  console.error(err);
  const l = $('loader');
  l.querySelector('b').textContent = 'Não foi possível carregar o 3D neste aparelho.';
  l.querySelector('small').textContent = 'Tente abrir em outro navegador (Chrome/Safari atualizados). Detalhe: ' + (err && err.message);
  l.querySelector('.sp').style.display = 'none';
}
