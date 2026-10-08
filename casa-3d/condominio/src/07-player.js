// ============================================================
// 07 · PASSEIO — caminhar com colisão, olhar, correr e tocar para andar
// ============================================================
const walk = { x: 0, z: 0, yaw: 0, pitch: -.05, fov: 70 };
const keys = {};
const joy = { x: 0, y: 0, active: false };
let walkTarget = null, lastInput = performance.now();
const R_PLAYER = .3;

function blocked(x, z) {
  if (x < XMIN || x > XMAX || z < ZMIN || z > ZMAX) return true;
  // quadras do entorno (casas, condomínios fechados, lagoa): só ruas e calçadas são caminháveis
  if (BLOCK_POLYS.length && (inBlock(x, z) || inBlock(x + R_PLAYER, z) || inBlock(x - R_PLAYER, z) || inBlock(x, z + R_PLAYER) || inBlock(x, z - R_PLAYER))) return true;
  const r2 = R_PLAYER * R_PLAYER;
  for (const c of COLL) {
    if (x < c[0] - .4 || x > c[2] + .4 || z < c[1] - .4 || z > c[3] + .4) continue;
    const dx = x - clamp(x, c[0], c[2]), dz = z - clamp(z, c[1], c[3]);
    if (dx * dx + dz * dz < r2) return true;
  }
  return false;
}
function freeNear(x, z, far = 70) {
  if (!blocked(x, z)) return [x, z];
  for (let r = .3; r <= 3; r += .3) for (let a = 0; a < 6.28; a += .45) {
    const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    if (!blocked(px, pz)) return [px, pz];
  }
  // tocou dentro de uma quadra (casas, lagoa): leva para a calçada ou rua mais próxima
  for (let r = 4; r <= far; r += 2) {
    const n = Math.ceil(Math.PI * r);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (!blocked(px, pz)) return [px, pz];
    }
  }
  return null;
}
// em subpassos de no máx. 20 cm, para não atravessar grades finas quando o fps cai
function tryMove(dx, dz) {
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .2));
  let moved = false;
  for (let i = 0; i < n; i++) {
    let m = false;
    if (dx && !blocked(walk.x + dx / n, walk.z)) { walk.x += dx / n; m = true; }
    if (dz && !blocked(walk.x, walk.z + dz / n)) { walk.z += dz / n; m = true; }
    if (!m) break;
    moved = true;
  }
  return moved;
}
function applyWalkCamera(cam) {
  cam.position.set(walk.x, EYE, walk.z);
  cam.rotation.set(walk.pitch, walk.yaw, 0, 'YXZ');
  if (Math.abs(cam.fov - walk.fov) > .01) { cam.fov = walk.fov; cam.updateProjectionMatrix(); }
}
function stepWalk(dt) {
  let f = 0, s = 0, turn = 0, changed = false;
  if (keys.KeyW || keys.ArrowUp) f += 1;
  if (keys.KeyS || keys.ArrowDown) f -= 1;
  if (keys.KeyA) s -= 1;
  if (keys.KeyD) s += 1;
  if (keys.ArrowLeft || keys.KeyQ) turn += 1;
  if (keys.ArrowRight || keys.KeyE) turn -= 1;
  let run = keys.ShiftLeft || keys.ShiftRight;
  if (joy.active) { f += -joy.y; turn += -joy.x * .9; if (Math.hypot(joy.x, joy.y) > .92) run = true; }
  if (f || s) {
    walkTarget = null;
    const sp = (run ? 7 : 3.2) * dt, sn = Math.sin(walk.yaw), cs = Math.cos(walk.yaw);
    tryMove((-sn * f + cs * s) * sp, (-cs * f - sn * s) * sp);
    changed = true; lastInput = performance.now();
  }
  if (turn) { walk.yaw += turn * 1.6 * dt; changed = true; lastInput = performance.now(); }
  if (walkTarget) {
    const dx = walkTarget[0] - walk.x, dz = walkTarget[1] - walk.z, d = Math.hypot(dx, dz);
    if (d < .05) walkTarget = null;
    else {
      const step = Math.min(d, 4.5 * dt * clamp(d, .4, 1));
      if (!tryMove(dx / d * step, dz / d * step)) walkTarget = null;
    }
    changed = true;
  }
  return changed;
}

// ---------- entrada (arrastar, pinça, roda, teclado, joystick, toque) ----------
function initWalkInput(canvas, ctx) {
  const pointers = new Map();
  let pinch0 = 0, fov0 = 70;
  canvas.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() });
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); fov0 = walk.fov; }
    lastInput = performance.now();
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (!ctx.isWalking() || ctx.busy()) return;
    if (pointers.size === 1) {
      const k = .0042 * (walk.fov / 70) * (IS_TOUCH ? 1.25 : 1);
      walk.yaw += dx * k; walk.pitch = clamp(walk.pitch + dy * k, -1.2, 1.1);
      walkTarget = null; ctx.changed(); lastInput = performance.now();
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0 > 0) { walk.fov = clamp(fov0 * pinch0 / d, 35, 90); ctx.changed(); }
    }
  });
  const up = (e) => {
    const p = pointers.get(e.pointerId); pointers.delete(e.pointerId);
    if (!p || pointers.size) return;
    if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 8 && performance.now() - p.t0 < 400) ctx.tap(e.clientX, e.clientY);
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', (e) => pointers.delete(e.pointerId));
  canvas.addEventListener('wheel', (e) => {
    if (!ctx.isWalking()) return;
    e.preventDefault(); walk.fov = clamp(walk.fov + Math.sign(e.deltaY) * 4, 35, 90); ctx.changed();
  }, { passive: false });
  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input,textarea')) return;
    if (e.code === 'KeyN' && !e.repeat) { ctx.toggleNight(); return; }
    if (e.code === 'Escape') { document.getElementById('modal').classList.remove('on'); return; }
    if (!ctx.isWalking()) return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
      keys[e.code] = true; e.preventDefault(); ctx.changed();
    }
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  // joystick
  const jb = document.getElementById('joy'), knob = jb.querySelector('i');
  let jid = null;
  const jmove = (e) => {
    const r = jb.getBoundingClientRect(), R = r.width / 2;
    let x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    joy.x = Math.abs(x) < .15 ? 0 : x; joy.y = Math.abs(y) < .15 ? 0 : y;
    knob.style.transform = `translate(${x * R * .6}px,${y * R * .6}px)`;
    lastInput = performance.now(); ctx.changed();
  };
  jb.addEventListener('pointerdown', (e) => { jid = e.pointerId; jb.setPointerCapture(jid); joy.active = true; jmove(e); });
  jb.addEventListener('pointermove', (e) => { if (e.pointerId === jid) jmove(e); });
  const jend = () => { jid = null; joy.active = false; joy.x = joy.y = 0; knob.style.transform = ''; };
  jb.addEventListener('pointerup', jend); jb.addEventListener('pointercancel', jend);
}
