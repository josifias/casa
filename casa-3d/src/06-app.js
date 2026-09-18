// ============================================================
// 06 · APP — cena, luzes, fusão de geometrias, câmeras e passeio
// ============================================================
let renderer, scene, camera, controls, DECOR, backdrop, ground;
let MIRROR = 1;
let mode = 'maquete';
let night = false;
let needsRender = true;
let tween = null;
let lastInput = performance.now();
const root = new THREE.Group();
const house = new THREE.Group();
const LIGHTS = { fills: [] };
const walk = { x: 0, z: 0, yaw: 0, pitch: -.08, fov: 72 };
const keys = {};
const joy = { x: 0, y: 0, active: false };
const clock = new THREE.Clock();

function toWorld(lx, ly, lz) { return new THREE.Vector3(MIRROR * (lx - CX), ly, lz - CZ); }
function toLocal(wx, wz) { return [MIRROR * wx + CX, wz + CZ]; }
function invalidate() { needsRender = true; }
function markInput() { lastInput = performance.now(); }

// ---------- fusão de geometrias estáticas (menos draw calls) ----------
function mergeGroup(group) {
  group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert();
  const buckets = new Map(), victims = [];
  group.traverse((o) => {
    if (!o.isMesh || o.userData.door || o.userData.floor) return;
    const key = o.material.uuid + '|' + o.castShadow + '|' + o.receiveShadow;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, receive: o.receiveShadow, geoms: [] });
    buckets.get(key).geoms.push(g);
    victims.push(o);
  });
  for (const o of victims) { o.parent.remove(o); o.geometry.dispose(); }
  const prune = (node) => { for (const c of [...node.children]) { prune(c); if (c.isGroup && !c.children.length) node.remove(c); } };
  prune(group);
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geoms, false);
    b.geoms.forEach((g) => g.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = b.cast; mesh.receiveShadow = b.receive;
    group.add(mesh);
  }
}

// ---------- cena ----------
function initScene() {
  renderer = new THREE.WebGLRenderer({ antialias: !LOW_END, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, LOW_END ? 1.25 : IS_TOUCH ? 1.5 : 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  document.getElementById('app').appendChild(renderer.domElement);
  MAX_ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .55;

  camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, .03, 200);
  camera.rotation.order = 'YXZ';
  scene.add(root);
  house.position.set(-CX, 0, -CZ);
  root.add(house);

  TX = makeTextures();
  makeMaterials();
  DECOR = G(0, 0, 0, 0, house);
  STYLE.tour = G(0, 0, 0, 0, house); STYLE.tour.userData.style = 'tour';
  STYLE.fotos = G(0, 0, 0, 0, house); STYLE.fotos.userData.style = 'fotos';
  CUR = DECOR;
  buildArchitecture(house);
  within(DECOR, () => { buildSala(); buildEntrada(); buildCozinha(); buildServico(); buildBanheiro(); buildCasal(); buildInfantil(); });
  for (const g of [DECOR, STYLE.tour, STYLE.fotos, ARCH.inner, ARCH.ceiling, ...Object.values(ARCH.ext)]) mergeGroup(g);

  // luzes
  LIGHTS.hemi = new THREE.HemisphereLight('#fff4e6', '#a8927a', .6);
  scene.add(LIGHTS.hemi);
  const sun = LIGHTS.sun = new THREE.DirectionalLight('#fff0da', 2.3);
  sun.position.set(-3.2, 9, -7.5);
  sun.castShadow = true;
  const S = IS_TOUCH ? 1024 : 2048;
  sun.shadow.mapSize.set(S, S);
  Object.assign(sun.shadow.camera, { left: -6.5, right: 6.5, top: 6.5, bottom: -6.5, near: 1, far: 30 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .025;
  scene.add(sun, sun.target);
  const fills = [[3.70, 2.25, 1.60], [6.20, 2.25, 1.40], [1.40, 2.25, 1.40], [2.60, 2.25, 3.85], [6.30, 2.25, 3.85], [4.55, 1.45, 1.85]];
  for (const [x, y, z] of fills) {
    const l = new THREE.PointLight('#ffd9a8', 0, 5.5, 2);
    l.userData.local = [x, y, z];
    house.add(l); l.position.set(x, y, z);
    LIGHTS.fills.push(l);
  }

  // paisagem vista das janelas
  TX.view.repeat.set(3, 1);
  const bd = new THREE.CylinderGeometry(28, 28, 34, 48, 1, true);
  bd.translate(0, 5, 0);
  backdrop = new THREE.Mesh(bd, M.view);
  backdrop.visible = false;
  scene.add(backdrop);

  ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .16 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.221; ground.receiveShadow = true;
  scene.add(ground);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .085;
  controls.rotateSpeed = .7; controls.zoomSpeed = .9;
  controls.addEventListener('change', invalidate);
  controls.addEventListener('start', markInput);
}

// ---------- dia / noite ----------
function setNight(on) {
  night = on;
  document.body.classList.toggle('night', on);
  LIGHTS.hemi.intensity = on ? .08 : .6;
  LIGHTS.sun.intensity = on ? 0 : 2.3;
  scene.environmentIntensity = on ? .12 : .55;
  for (const l of LIGHTS.fills) l.intensity = on ? 2.6 : 0;
  M.led.emissiveIntensity = on ? 2.4 : .5;
  M.bulb.emissiveIntensity = on ? 3 : .35;
  M.shade.emissiveIntensity = on ? 1.1 : 0;
  M.view.color.set(on ? '#2c3650' : '#ffffff');
  renderer.toneMappingExposure = on ? 1.1 : .92;
  renderer.shadowMap.needsUpdate = true;
  invalidate();
}

// ---------- espelhamento ----------
function setMirror(m) {
  if (m === MIRROR) return;
  MIRROR = m;
  root.scale.x = m;
  camera.position.x *= -1; controls.target.x *= -1;
  walk.x *= -1; walk.yaw *= -1;
  if (mode === 'passeio') applyWalkCamera(); else camera.lookAt(controls.target);
  renderer.shadowMap.needsUpdate = true;
  invalidate();
}

// ---------- visibilidade por modo ----------
function setCeiling(on) {
  if (ARCH.ceiling.visible !== on) { ARCH.ceiling.visible = on; renderer.shadowMap.needsUpdate = true; }
  backdrop.visible = on;
  ground.visible = !on;
}
function updateCutaway() {
  const all = mode !== 'maquete';
  const [lx, lz] = toLocal(camera.position.x, camera.position.z);
  const vis = { N: all || lz >= 0, S: all || lz <= D_IN, W: all || lx >= 0, E: all || lx <= W_IN };
  if (MIRROR === -1) { /* W/E já estão em coordenadas locais */ }
  for (const k of ['N', 'S', 'W', 'E']) if (ARCH.ext[k].visible !== vis[k]) { ARCH.ext[k].visible = vis[k]; renderer.shadowMap.needsUpdate = true; }
}

// ---------- câmera: poses e transições ----------
const _dummy = new THREE.Object3D();
function poseLookAt(pos, target) { _dummy.position.copy(pos); _dummy.up.set(0, 1, 0); _dummy.lookAt(target); return _dummy.quaternion.clone(); }
function flyTo(pos, quat, fov, dur, onDone) {
  tween = { t0: performance.now(), dur: dur * 1000, p0: camera.position.clone(), q0: camera.quaternion.clone(), f0: camera.fov, p1: pos, q1: quat, f1: fov, onDone };
}
function stepTween() {
  const t = clamp((performance.now() - tween.t0) / tween.dur, 0, 1), e = ease(t);
  camera.position.lerpVectors(tween.p0, tween.p1, e);
  camera.quaternion.slerpQuaternions(tween.q0, tween.q1, e);
  camera.fov = lerp(tween.f0, tween.f1, e);
  camera.updateProjectionMatrix();
  if (t >= 1) { const cb = tween.onDone; tween = null; cb && cb(); }
}

function maquetePose() {
  const portrait = innerWidth / innerHeight < 1;
  const preview = PARAMS.has('preview');
  const target = preview ? new THREE.Vector3(0, .2, .35) : new THREE.Vector3(0, .5, .2);
  const sph = portrait ? new THREE.Spherical(21, .66, 1.95) : new THREE.Spherical(preview ? 8.6 : 11.2, .72, 2.62);
  return { target, pos: new THREE.Vector3().setFromSpherical(sph).add(target), fov: 40 };
}
function plantaPose() {
  const aspect = innerWidth / innerHeight, portrait = aspect < 1;
  const fov = 35, t = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const needW = (portrait ? 5.4 : 8.1) * 1.12, needH = (portrait ? 8.1 : 5.4) * 1.62;
  const d = Math.max(needH / (2 * t), needW / (2 * t * aspect));
  const theta = portrait ? Math.PI / 2 : 0;
  const target = new THREE.Vector3(0, 0, 0);
  const pos = new THREE.Vector3().setFromSpherical(new THREE.Spherical(d, .0008, theta)).add(target);
  return { target, pos, fov, theta, d };
}

function configControls(m) {
  controls.enabled = m !== 'passeio';
  if (m === 'maquete') {
    Object.assign(controls, { enableRotate: true, enablePan: true, screenSpacePanning: false, minPolarAngle: .12, maxPolarAngle: 1.3, minDistance: 3.5, maxDistance: 30, minAzimuthAngle: -Infinity, maxAzimuthAngle: Infinity });
  } else if (m === 'planta') {
    const p = plantaPose();
    Object.assign(controls, { enableRotate: false, enablePan: true, screenSpacePanning: true, minPolarAngle: 0, maxPolarAngle: .001, minDistance: 3, maxDistance: p.d * 1.6, minAzimuthAngle: p.theta, maxAzimuthAngle: p.theta });
  }
}

function goMaquete(instant = false) {
  const p = maquetePose();
  setMode('maquete');
  controls.enabled = false;
  const done = () => { setCeiling(false); controls.target.copy(p.target); configControls('maquete'); controls.update(); invalidate(); };
  setCeiling(false); walkTarget = null;
  if (instant) { camera.position.copy(p.pos); camera.fov = p.fov; camera.updateProjectionMatrix(); camera.lookAt(p.target); done(); }
  else flyTo(p.pos, poseLookAt(p.pos, p.target), p.fov, 1.2, done);
}
function goPlanta(instant = false) {
  const p = plantaPose();
  setMode('planta');
  controls.enabled = false;
  const done = () => { controls.target.copy(p.target); configControls('planta'); controls.update(); invalidate(); };
  setCeiling(false); walkTarget = null;
  for (const k in ARCH.ext) ARCH.ext[k].visible = true;
  const q = poseLookAt(p.pos, p.target);
  if (instant) { camera.position.copy(p.pos); camera.quaternion.copy(q); camera.fov = p.fov; camera.updateProjectionMatrix(); done(); }
  else flyTo(p.pos, q, p.fov, 1.1, done);
}
function goView(id, instant = false) {
  const v = VIEWS.find((x) => x.id === id) || VIEWS[0];
  const pw = toWorld(v.pos[0], EYE, v.pos[1]), tw = toWorld(v.look[0], 0, v.look[1]);
  const yaw = Math.atan2(-(tw.x - pw.x), -(tw.z - pw.z)), pitch = -.08, fov = (v.fov || 70) + (IS_TOUCH && innerWidth < innerHeight ? 8 : 0);
  const wasWalking = mode === 'passeio';
  setMode('passeio');
  controls.enabled = false; walkTarget = null;
  const done = () => { walk.x = pw.x; walk.z = pw.z; walk.yaw = yaw; walk.pitch = pitch; walk.fov = fov; setCeiling(true); for (const k in ARCH.ext) ARCH.ext[k].visible = true; renderer.shadowMap.needsUpdate = true; applyWalkCamera(); markInput(); invalidate(); };
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
  if (instant) { done(); return; }
  if (!wasWalking) setCeiling(false);
  const dist = camera.position.distanceTo(pw);
  flyTo(pw, q, fov, clamp(.6 + dist * .08, .7, 1.6), done);
}

// ---------- passeio ----------
const R_PLAYER = .2;
let walkTarget = null;
function blocked(wx, wz) {
  const [lx, lz] = toLocal(wx, wz);
  if (lx < R_PLAYER || lx > W_IN - R_PLAYER || lz < R_PLAYER || lz > D_IN - R_PLAYER) return true;
  const r2 = R_PLAYER * R_PLAYER;
  for (const c of COLL) {
    if (c[4] && c[4] !== CURRENT_STYLE) continue;
    const dx = lx - clamp(lx, c[0], c[2]), dz = lz - clamp(lz, c[1], c[3]);
    if (dx * dx + dz * dz < r2) return true;
  }
  return false;
}
function freeNear(wx, wz) {
  if (!blocked(wx, wz)) return [wx, wz];
  for (let r = .05; r <= .6; r += .05) for (let a = 0; a < 6.28; a += .5) {
    const x = wx + Math.cos(a) * r, z = wz + Math.sin(a) * r;
    if (!blocked(x, z)) return [x, z];
  }
  return null;
}
function applyWalkCamera() {
  camera.position.set(walk.x, EYE, walk.z);
  camera.rotation.set(walk.pitch, walk.yaw, 0, 'YXZ');
  if (Math.abs(camera.fov - walk.fov) > .01) { camera.fov = walk.fov; camera.updateProjectionMatrix(); }
}
function stepWalk(dt) {
  let f = 0, s = 0, turn = 0, changed = false;
  if (keys.KeyW || keys.ArrowUp) f += 1;
  if (keys.KeyS || keys.ArrowDown) f -= 1;
  if (keys.KeyA) s -= 1;
  if (keys.KeyD) s += 1;
  if (keys.ArrowLeft || keys.KeyQ) turn += 1;
  if (keys.ArrowRight || keys.KeyE) turn -= 1;
  if (joy.active) { f += -joy.y; turn += -joy.x * .9; }
  if (f || s) {
    walkTarget = null;
    const sp = 1.4 * dt, sn = Math.sin(walk.yaw), cs = Math.cos(walk.yaw);
    const dx = (-sn * f + cs * s) * sp, dz = (-cs * f - sn * s) * sp;
    if (!blocked(walk.x + dx, walk.z)) walk.x += dx;
    if (!blocked(walk.x, walk.z + dz)) walk.z += dz;
    changed = true; markInput();
  }
  if (turn) { walk.yaw += turn * 1.5 * dt; changed = true; markInput(); }
  if (walkTarget) {
    const dx = walkTarget[0] - walk.x, dz = walkTarget[1] - walk.z, d = Math.hypot(dx, dz);
    const step = Math.min(d, 2.2 * dt * clamp(d * 2, .35, 1));
    if (d < .01) walkTarget = null; else { walk.x += dx / d * step; walk.z += dz / d * step; }
    changed = true;
  }
  const idle = performance.now() - lastInput;
  if (idle > 12000 && idle < 70000 && !PARAMS.has('preview')) { walk.yaw += .05 * dt; changed = true; }
  if (changed) applyWalkCamera();
  return changed;
}

// ---------- portas ----------
function stepDoors(dt) {
  let moving = false;
  for (const d of DOORS) {
    const target = d.isOpen ? d.openAng : 0;
    if (Math.abs(d.angle - target) > 1e-3) {
      const sp = (d.speed || 2.6) * dt;
      d.angle += clamp(target - d.angle, -sp, sp);
      d.apply(d.angle);
      moving = true;
    }
  }
  return moving;
}
