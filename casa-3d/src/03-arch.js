// ============================================================
// 03 · ARQUITETURA — pisos, paredes, portas, janelas, teto
// ============================================================
const ARCH = {};              // grupos: floors, inner, ext{N,S,W,E}, ceiling
const DOORS = [];

function WALL(x1, z1, x2, z2, openings = []) {
  const alongX = (x2 - x1) >= (z2 - z1);
  const a1 = alongX ? x1 : z1, a2 = alongX ? x2 : z2;
  const ops = openings.slice().sort((p, q) => p.a - q.a);
  const seg = (s1, s2, y1, y2) => {
    if (s2 - s1 < 1e-4 || y2 - y1 < 1e-4) return;
    if (alongX) B(s1, y1, z1, s2, y2, z2, M.wall); else B(x1, y1, s1, x2, y2, s2, M.wall);
    if (y1 < .01) alongX ? addColl(s1, z1, s2, z2) : addColl(x1, s1, x2, s2);
  };
  let c = a1;
  for (const o of ops) { seg(c, o.a, 0, H); seg(o.a, o.b, 0, o.y1); seg(o.a, o.b, o.y2, H); c = o.b; }
  seg(c, a2, 0, H);
}

function FLOOR(x1, z1, x2, z2, mat, room) {
  const g = new THREE.PlaneGeometry(x2 - x1, z2 - z1);
  g.rotateX(-Math.PI / 2);
  g.translate((x1 + x2) / 2, .002, (z1 + z2) / 2);
  projectUV(g, mat);
  const m = addMesh(g, mat, { cast: false });
  m.userData.floor = room;
  return m;
}

// Batente + guarnição de porta (atravessa a parede)
function DOOR_FRAME(axis, wallC, a1, a2) {
  const p1 = wallC - T / 2 - .012, p2 = wallC + T / 2 + .012;
  const box = (s1, y1, s2, y2) => axis === 'z' ? B(p1, y1, s1, p2, y2, s2, M.trim, { cast: false }) : B(s1, y1, p1, s2, y2, p2, M.trim, { cast: false });
  box(a1 - .045, 0, a1 + .012, DOOR_H + .045);
  box(a2 - .012, 0, a2 + .045, DOOR_H + .045);
  box(a1 - .045, DOOR_H - .005, a2 + .045, DOOR_H + .045);
  // soleira
  if (axis === 'z') B(wallC - T / 2, 0, a1, wallC + T / 2, .006, a2, M.threshold, { cast: false });
  else B(a1, 0, wallC - T / 2, a2, .006, wallC + T / 2, M.threshold, { cast: false });
}

// Folha de porta com pivô animado.
// axis: eixo ao longo do qual a parede corre ('x' ou 'z'); hinge: coordenada da dobradiça;
// far: coordenada do batente oposto; swing: +1/-1 lado (perpendicular) para onde abre.
function DOOR({ axis, wallC, hinge, far, swing, open = true, name }) {
  DOOR_FRAME(axis, wallC, Math.min(hinge, far), Math.max(hinge, far));
  const L = Math.abs(far - hinge) - .012;
  const dirA = Math.sign(far - hinge);
  const d = axis === 'x' ? { x: dirA, z: 0 } : { x: 0, z: dirA };
  const s = axis === 'x' ? { x: 0, z: swing } : { x: swing, z: 0 };
  const perp = wallC + swing * (T / 2 - .004);
  const pivot = new THREE.Group();
  if (axis === 'x') pivot.position.set(hinge + dirA * .006, 0, perp); else pivot.position.set(perp, 0, hinge + dirA * .006);
  const th0 = Math.atan2(-d.z, d.x);
  pivot.rotation.y = th0;
  const lz = { x: Math.sin(th0), z: Math.cos(th0) };
  const zSign = (lz.x * s.x + lz.z * s.z) > 0 ? -1 : 1;     // folha fica para dentro da parede
  const openAng = (lz.x * s.x + lz.z * s.z) > 0 ? -Math.PI / 2 * .96 : Math.PI / 2 * .96;
  const t = .036;
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(L, DOOR_H - .012, t), M.doorLeaf);
  leaf.position.set(L / 2, (DOOR_H - .012) / 2 + .006, zSign * t / 2);
  leaf.castShadow = leaf.receiveShadow = true;
  pivot.add(leaf);
  for (const side of [-1, 1]) {   // maçanetas
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .012, 16), M.steel);
    rose.rotation.x = Math.PI / 2;
    rose.position.set(L - .07, 1.02, zSign * t / 2 + side * (t / 2 + .006));
    const lever = new THREE.Mesh(new THREE.BoxGeometry(.13, .018, .018), M.steel);
    lever.position.set(L - .115, 1.02, zSign * t / 2 + side * (t / 2 + .03));
    pivot.add(rose, lever);
  }
  CUR.add(pivot);
  const door = { pivot, name, openAng, angle: open ? openAng : 0, isOpen: open };
  door.apply = (v) => { pivot.rotation.y = th0 + v; };
  door.apply(door.angle);
  pivot.traverse((o) => { o.userData.door = door; });
  DOORS.push(door);
  return door;
}

// Porta de correr (trilho aparente). Desliza pelo lado do ambiente indicado por `side`,
// no sentido `park` do eixo da parede. Não encosta na parede oposta do vão.
function SLIDE_DOOR({ wallC, a1, a2, side, park = 1, name, open = true }) {
  const faceX = wallC + side * (T / 2);
  const t = .038, gap = .016, h = DOOR_H + .06;
  const xa = faceX + side * gap, xb = xa + side * t;
  const lo = Math.min(xa, xb), hi = Math.max(xa, xb);
  const w = (a2 - a1) + .10;                 // folha com sobreposição no vão
  const z0 = a1 - .05;                       // borda da folha fechada
  const travel = park > 0 ? w - .02 : -(w - .02);

  // acabamento do vão no lado oposto (sem batente de encosto) + soleira
  const far = wallC - side * (T / 2);
  for (const [s1, s2, y1, y2] of [[a1 - .045, a1, 0, DOOR_H + .045], [a2, a2 + .045, 0, DOOR_H + .045], [a1 - .045, a2 + .045, DOOR_H, DOOR_H + .045]])
    B(far, y1, s1, far - side * .012, y2, s2, M.trim, { cast: false });
  B(wallC - T / 2, 0, a1, wallC + T / 2, .006, a2, M.threshold, { cast: false });

  // testeira + trilho
  const rz1 = Math.min(z0, z0 + travel) - .08, rz2 = Math.max(z0 + w, z0 + w + travel) + .08;
  B(faceX, h + .06, rz1, faceX + side * .075, h + .16, rz2, M.trim);
  B(lo - .004, h + .015, rz1 + .04, hi + .004, h + .055, rz2 - .04, M.blackMetal, { cast: false });

  const g = new THREE.Group();
  CUR.add(g);
  within(g, () => {
    B(lo, .02, z0, hi, h, z0 + w, M.doorLeaf);
    // puxador vertical de madeira na borda de fechamento
    const pz = park > 0 ? z0 + .06 : z0 + w - .09;
    const pull = side < 0 ? lo : hi;
    B(pull, .92, pz, pull + side * .022, 1.38, pz + .032, M.oak);
    // roldanas
    for (const z of [z0 + .10, z0 + w - .10]) CY((lo + hi) / 2, h, z, .018, h + .04, M.blackMetal, { seg: 10, cast: false });
  });

  const door = { pivot: g, name, openAng: travel, angle: open ? travel : 0, isOpen: open, speed: .95, slide: true };
  door.apply = (v) => { g.position.z = v; };
  door.apply(door.angle);
  g.traverse((o) => { o.userData.door = door; });
  DOORS.push(door);
  return door;
}

// Janela de correr com 2 folhas. wall: 'N'|'S'. a1..a2 ao longo de X.
function WINDOW(wall, a1, a2, y1, y2) {
  const zc = wall === 'N' ? -T / 2 : D_IN + T / 2;
  const inward = wall === 'N' ? 1 : -1;
  const f = .045, dz = .03;
  const fb = (x1, yy1, x2, yy2, off = 0) => B(x1, yy1, zc - dz + off, x2, yy2, zc + dz + off, M.frame, { cast: false });
  fb(a1, y1, a2, y1 + f); fb(a1, y2 - f, a2, y2);
  fb(a1, y1, a1 + f, y2); fb(a2 - f, y1, a2, y2);
  const mid = (a1 + a2) / 2;
  fb(mid - .02, y1, mid + .02, y2);
  for (const [p1, p2, off] of [[a1 + f, mid + .02, -.012], [mid - .02, a2 - f, .012]]) {
    const g = new THREE.PlaneGeometry(p2 - p1, y2 - y1 - 2 * f);
    g.translate((p1 + p2) / 2, (y1 + y2) / 2, zc + off);
    addMesh(g, M.glass, { cast: false, receive: false });
  }
  // peitoril
  const zi = wall === 'N' ? 0 : D_IN;
  B(a1 - .03, y1 - .02, Math.min(zc, zi + inward * .035), a2 + .03, y1, Math.max(zc, zi + inward * .035), M.trim, { cast: false });
}

// Cortina de voil pregueado (parede norte, olhando +z)
function SHEER(x1, x2, y1, y2, z) {
  const w = x2 - x1, segs = Math.max(8, Math.round(w * 40));
  const g = new THREE.PlaneGeometry(w, y2 - y1, segs, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) + w / 2) * 34) * .022);
  g.computeVertexNormals();
  g.translate((x1 + x2) / 2, (y1 + y2) / 2, z);
  addMesh(g, M.sheer, { cast: false });
}
function BLIND(x1, x2, y1, y2, z1, z2) { B(x1, y1, z1, x2, y2, z2, M.blinds, { cast: false }); }

// Sanca com fita de LED (fica no grupo do teto)
function COVE(x1, z1, x2, z2, band = .22) {
  const y1 = H - .09, y2 = H;
  B(x1, y1, z1, x2, y2, z1 + band, M.ceiling, { cast: false });
  B(x1, y1, z2 - band, x2, y2, z2, M.ceiling, { cast: false });
  B(x1, y1, z1 + band, x1 + band, y2, z2 - band, M.ceiling, { cast: false });
  B(x2 - band, y1, z1 + band, x2, y2, z2 - band, M.ceiling, { cast: false });
  const e = .012, yl = y1 - .002;
  B(x1 + band, yl, z1 + band - e, x2 - band, y1 + .02, z1 + band, M.led, { cast: false });
  B(x1 + band, yl, z2 - band, x2 - band, y1 + .02, z2 - band + e, M.led, { cast: false });
  B(x1 + band - e, yl, z1 + band, x1 + band, y1 + .02, z2 - band, M.led, { cast: false });
  B(x2 - band, yl, z1 + band, x2 - band + e, y1 + .02, z2 - band, M.led, { cast: false });
}

function buildArchitecture(house) {
  ARCH.floors = G(0, 0, 0, 0, house);
  ARCH.inner = G(0, 0, 0, 0, house);
  ARCH.ceiling = G(0, 0, 0, 0, house);
  ARCH.ext = { N: G(0, 0, 0, 0, house), S: G(0, 0, 0, 0, house), W: G(0, 0, 0, 0, house), E: G(0, 0, 0, 0, house) };
  ARCH.doors = G(0, 0, 0, 0, house);

  // laje de piso (corte)
  within(ARCH.inner, () => B(-T, -.22, -T, W_IN + T, 0, D_IN + T, M.slab, { cast: false }));

  within(ARCH.floors, () => {
    FLOOR(0, 0, 2.40, 3.00, M.floorWood, 'infantil');
    FLOOR(2.50, 0, 4.90, 3.10, M.floorWood, 'sala');
    FLOOR(5.00, 0, 7.40, 3.00, M.floorWood, 'casal');
    FLOOR(0, 3.10, 5.30, 4.60, M.floorTile, 'cozinha');
    FLOOR(5.40, 3.10, 7.40, 4.60, M.floorTile, 'banheiro');
  });

  // soleira de transição sala/cozinha
  within(ARCH.inner, () => B(2.50, 0, 3.085, 4.90, .005, 3.115, M.threshold, { cast: false }));

  // ---------- paredes externas ----------
  const win = (a, b, y1 = 1.00, y2 = 2.20) => ({ a, b, y1, y2 });
  within(ARCH.ext.N, () => {
    WALL(-T, -T, W_IN + T, 0, [win(.60, 1.80), win(2.90, 4.45), win(5.60, 6.80)]);
    WINDOW('N', .60, 1.80, 1.00, 2.20); WINDOW('N', 2.90, 4.45, 1.00, 2.20); WINDOW('N', 5.60, 6.80, 1.00, 2.20);
    // cortineiros + voil (sala e casal), persiana (infantil)
    B(2.50, 2.32, 0, 4.90, 2.50, .15, M.oak, { cast: false });
    SHEER(2.56, 3.30, .03, 2.31, .075); SHEER(4.05, 4.86, .03, 2.31, .075);
    B(5.00, 2.32, 0, 7.40, 2.50, .15, M.oak, { cast: false });
    SHEER(5.06, 5.75, .03, 2.31, .075); SHEER(6.62, 7.36, .03, 2.31, .075);
    B(.94, 2.22, 0, 1.86, 2.30, .10, M.oak, { cast: false });
    BLIND(.96, 1.84, 1.62, 2.22, .045, .06);
  });
  within(ARCH.ext.S, () => {
    WALL(-T, D_IN, W_IN + T, D_IN + T, [win(.27, 1.28, 1.10, 2.20), { a: 4.30, b: 5.10, y1: 0, y2: DOOR_H }]);
    WINDOW('S', .27, 1.28, 1.10, 2.20);
    BLIND(.25, 1.30, 1.55, 2.22, D_IN - .06, D_IN - .045);
  });
  within(ARCH.ext.W, () => WALL(-T, 0, 0, D_IN));
  within(ARCH.ext.E, () => WALL(W_IN, 0, W_IN + T, D_IN));

  // ---------- paredes internas ----------
  within(ARCH.inner, () => {
    WALL(2.40, 0, 2.50, 3.10, [{ a: .97, b: 1.72, y1: 0, y2: DOOR_H }]);        // infantil | sala
    WALL(0, 3.00, 2.40, 3.10);                                                   // infantil | cozinha
    WALL(4.90, 0, 5.00, 3.10, [{ a: 2.15, b: 2.90, y1: 0, y2: DOOR_H }]);       // sala | casal
    WALL(5.00, 3.00, W_IN, 3.10);                                                // casal | banheiro/entrada
    WALL(5.30, 3.10, 5.40, D_IN, [{ a: 3.20, b: 3.90, y1: 0, y2: DOOR_H }]);    // entrada | banheiro
    B(0, 0, 4.05, .20, H, D_IN, M.wall); addColl(0, 4.05, .20, D_IN);           // shaft
  });

  // ---------- portas ----------
  within(ARCH.doors, () => {
    SLIDE_DOOR({ wallC: 2.45, a1: .97, a2: 1.72, side: -1, park: 1, name: 'infantil' });
    DOOR({ axis: 'z', wallC: 4.95, hinge: 2.90, far: 2.15, swing: +1, name: 'casal' });
    DOOR({ axis: 'z', wallC: 5.35, hinge: 3.20, far: 3.90, swing: +1, name: 'banheiro' });
    DOOR({ axis: 'x', wallC: D_IN + T / 2, hinge: 5.10, far: 4.30, swing: -1, open: false, name: 'entrada' });
  });

  // ---------- teto ----------
  within(ARCH.ceiling, () => {
    B(-T, H, -T, W_IN + T, H + .1, D_IN + T, M.ceiling, { receive: true });
    COVE(2.50, 0, 4.90, 3.10);
    COVE(5.00, 0, 7.40, 3.00);
    B(.60, H - .02, 3.82, 4.10, H, 3.88, M.led, { cast: false });              // perfil LED cozinha
    B(5.95, H - .04, 1.20, 6.45, H, 1.70, M.led, { cast: false });   // plafon casal
    for (const [x, z] of [[5.95, 3.55], [6.75, 3.55], [6.9, 4.2]]) CY(x, H - .012, z, .045, H, M.led, { cast: false });
    B(6.00, H - .012, 4.25, 6.22, H, 4.47, M.white, { cast: false });           // exaustor
  });
}
