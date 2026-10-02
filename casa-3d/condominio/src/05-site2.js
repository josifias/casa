// ============================================================
// 05 · TERRENO (2) — lazer, estacionamento, praças, postes e árvores
// ============================================================
const OCC = [];                       // áreas ocupadas (árvores evitam)
const occ = (x0, z0, x1, z1, pad = 0) => OCC.push([x0 - pad, z0 - pad, x1 + pad, z1 + pad]);
const NC = { cast: false };

// caixa orientada ao longo de um segmento (pranchas, escorregador, rampas)
function OB(p0, p1, w, t, mat, o = {}) {
  const a = new THREE.Vector3(...p0), b = new THREE.Vector3(...p1), d = b.clone().sub(a), len = d.length();
  const g = new THREE.BoxGeometry(len, t, w);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize());
  g.applyQuaternion(q); const m = a.add(b).multiplyScalar(.5); g.translate(m.x, m.y, m.z);
  projectUV(g, mat); return addMesh(g, mat, o);
}

// ---------- carros: perfil lateral extrudado (hatch, sedã e SUV compacto) ----------
// Referencial do carro: x = comprimento (frente em +x), y = altura, z = largura.
const CAR_PAINT = ['#f1f1ee', '#f1f1ee', '#e9e9e6', '#c4c7cb', '#b4b8bd', '#7c8086', '#55595e', '#1c1e21', '#2a2c30', '#9e1f1f', '#1f3d73', '#8b7b66'];
const CAR_TYPES = {
  hatch: {
    L: 3.94, W: 1.72, r: .3, sill: .25, wf: 1.19, wr: -1.3, belt: .95, roofY: 1.44,
    body: [[1.9, .25], [1.96, .4], [1.97, .6], [1.9, .74], [1.55, .84], [1.08, .9], [-1, .94], [-1.7, .97], [-1.9, .93], [-1.95, .78], [-1.97, .42], [-1.9, .25]],
    cabin: [[1.14, .82], [.28, 1.36], [.08, 1.42], [-1.15, 1.44], [-1.42, 1.4], [-1.84, 1], [-1.84, .82]],
    roof: [.12, -1.2], A: [[1, .93], [.16, 1.39]], B: [[-.33, .95], [-.38, 1.4]], Cp: [[-1.72, .98], [-1.34, 1.36]], tC: .2,
    head: [.6, .72], tail: [.74, .9], seams: [1, -.25, -1.22],
  },
  sedan: {
    L: 4.42, W: 1.74, r: .31, sill: .26, wf: 1.38, wr: -1.27, belt: .97, roofY: 1.45,
    body: [[2.14, .26], [2.2, .42], [2.21, .6], [2.13, .74], [1.7, .85], [1.22, .92], [-1.2, .97], [-2.05, 1], [-2.18, .96], [-2.2, .8], [-2.21, .44], [-2.14, .26]],
    cabin: [[1.28, .84], [.42, 1.37], [.2, 1.43], [-.8, 1.45], [-1.05, 1.4], [-1.45, 1], [-1.45, .84]],
    roof: [.25, -.85], A: [[1.14, .95], [.28, 1.39]], B: [[-.2, .97], [-.25, 1.41]], Cp: [[-1.32, .99], [-.99, 1.37]], tC: .16,
    head: [.6, .72], tail: [.78, .92], seams: [1.15, -.15, -1.22],
  },
  suv: {
    L: 4.28, W: 1.8, r: .36, sill: .36, wf: 1.3, wr: -1.32, belt: 1.1, roofY: 1.64,
    body: [[2.07, .36], [2.13, .52], [2.14, .78], [2.05, .94], [1.6, 1.04], [1.18, 1.08], [-1.3, 1.12], [-1.95, 1.13], [-2.1, 1.08], [-2.13, .9], [-2.14, .5], [-2.07, .36]],
    cabin: [[1.24, 1], [.52, 1.56], [.3, 1.62], [-1.6, 1.64], [-1.9, 1.58], [-2.04, 1.15], [-2.04, 1]],
    roof: [.35, -1.65], A: [[1.12, 1.1], [.38, 1.57]], B: [[-.35, 1.12], [-.39, 1.59]], Cp: [[-1.9, 1.13], [-1.79, 1.55]], tC: .2,
    head: [.78, .9], tail: [.92, 1.06], seams: [1.1, -.3, -1.2],
  },
};
const CAR_BEV = .05, _carGeo = {};
// x da frente/traseira da carroceria numa altura y (para encaixar faróis, grade e placas)
function carFaceX(pts, y, front) {
  let best = front ? -9 : 9;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    if (y0 === y1 || (y - y0) * (y - y1) > 0) continue;
    const x = x0 + (x1 - x0) * (y - y0) / (y1 - y0);
    best = front ? Math.max(best, x) : Math.min(best, x);
  }
  return best + (front ? CAR_BEV : -CAR_BEV);
}
// altura do topo da carroceria (linha de cintura) num x
function carTopY(pts, x) {
  let best = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    if (x0 === x1 || (x - x0) * (x - x1) > 0) continue;
    best = Math.max(best, y0 + (y1 - y0) * (x - x0) / (x1 - x0));
  }
  return best + CAR_BEV;
}
function carGeo(type) {
  if (_carGeo[type]) return _carGeo[type];
  const T = CAR_TYPES[type], ra = T.r + .1, b = T.body, Wc = T.W - .26;
  const ext = (shape, depth, bev) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: depth - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 8 });
    g.translate(0, 0, -(depth - 2 * bev) / 2);
    return g;
  };
  // carroceria: contorno lateral com as caixas de roda recortadas
  const s = new THREE.Shape();
  s.moveTo(...b[b.length - 1]);
  for (const wx of [T.wr, T.wf]) { s.lineTo(wx - ra, T.sill); s.lineTo(wx - ra, T.r); s.absarc(wx, T.r, ra, Math.PI, 0, true); s.lineTo(wx + ra, T.sill); }
  for (const p of b.slice(0, -1)) s.lineTo(...p);
  const body = ext(s, T.W, CAR_BEV);
  // pontas arredondadas vistas de cima (a carroceria afina perto do para-choque)
  const xs = b.map((p) => p[0]), xF = Math.max(...xs) + CAR_BEV, xR = Math.min(...xs) - CAR_BEV, bp = body.attributes.position;
  for (let i = 0; i < bp.count; i++) { const d = Math.min(xF - bp.getX(i), bp.getX(i) - xR); if (d < .5) bp.setZ(i, bp.getZ(i) * (1 - .09 * (1 - d / .5) ** 2)); }
  // cabine afinando para cima, cortada na horizontal: vidros embaixo, teto pintado em cima
  const yc = T.roofY - .06;
  const cabinPart = (above) => {
    const pts = [], c = T.cabin;
    for (let i = 0; i < c.length; i++) {
      const a = c[i], d = c[(i + 1) % c.length], ia = above ? a[1] >= yc : a[1] <= yc, id = above ? d[1] >= yc : d[1] <= yc;
      if (ia) pts.push(a);
      if (ia !== id) pts.push([a[0] + (d[0] - a[0]) * (yc - a[1]) / (d[1] - a[1]), yc]);
    }
    const sh = new THREE.Shape(); sh.moveTo(...pts[0]); for (const q of pts.slice(1)) sh.lineTo(...q);
    const g = ext(sh, Wc, .04), cp = g.attributes.position;
    for (let i = 0; i < cp.count; i++) cp.setZ(i, cp.getZ(i) * (1 - .14 * clamp((cp.getY(i) - T.belt) / (T.roofY - T.belt), 0, 1)));
    return toCreasedNormals(g, .6);
  };
  // monta as peças uma vez, com a pintura num material provisório, e funde por material:
  // cada carro estacionado vira só ~10 malhas que compartilham estas geometrias
  const tpl = new THREE.Group();
  within(tpl, () => carParts(type, T, Wc, ra, toCreasedNormals(body, .6), cabinPart(false), cabinPart(true)));
  mergeGroup(tpl);
  return (_carGeo[type] = { T, parts: tpl.children });
}
const CAR_SLOT = new THREE.MeshStandardMaterial();   // lugar da cor da pintura no molde
function carParts(type, T, Wc, ra, body, cabin, roof) {
  const pm = CAR_SLOT, LT = { cast: false, seg: 1 };
  {
    addMesh(body, pm); addMesh(cabin, M.carGlass); addMesh(roof, pm);
    const zAt = (y) => Wc / 2 * (1 - .14 * clamp((y - T.belt) / (T.roofY - T.belt), 0, 1)) + .02;
    for (const s of [-1, 1]) {
      // colunas A (cor do carro), B (preta) e C (cor do carro) e friso preto na base dos vidros
      const P = ([a, c], w, t, mat) => OB([a[0], a[1], s * zAt(a[1])], [c[0], c[1], s * zAt(c[1])], w, t, mat, NC);
      P(T.A, .03, .08, pm); P(T.B, .03, .1, M.black); P(T.Cp, .03, T.tC, pm);
      const xa = T.A[0][0] - .05, xc = T.Cp[0][0] + .05;
      OB([xa, carTopY(T.body, xa) + .012, s * (Wc / 2 + .02)], [xc, carTopY(T.body, xc) + .012, s * (Wc / 2 + .02)], .03, .025, M.black, NC);
      // retrovisor
      RB(T.A[0][0] - .2, T.belt - .02, s * (T.W / 2 - .04), T.A[0][0] - .08, T.belt + .1, s * (T.W / 2 + .11), .025, pm, LT);
      // linhas das portas e maçanetas
      for (const x of T.seams) {
        let y0 = T.sill + .03;
        for (const wx of [T.wf, T.wr]) { const dx = Math.abs(x - wx), rr = ra - CAR_BEV; if (dx < rr) y0 = T.r + Math.sqrt(rr * rr - dx * dx) + .03; }
        B(x - .006, y0, s * (T.W / 2 - .01), x + .006, carTopY(T.body, x) - .04, s * (T.W / 2 + .004), M.black, NC);
      }
      for (const x of [T.seams[1] + .22, T.seams[2] + .22]) B(x - .08, T.belt - .13, s * (T.W / 2 - .01), x + .08, T.belt - .095, s * (T.W / 2 + .018), M.darkMetal, NC);
      // faróis e lanternas (contornam a quina)
      const fx = carFaceX(T.body, (T.head[0] + T.head[1]) / 2, true), rx = carFaceX(T.body, (T.tail[0] + T.tail[1]) / 2, false);
      RB(fx - .16, T.head[0], s * .4, fx + .008, T.head[1], s * (T.W / 2 * .92 - .01), .03, M.headlight, LT);
      RB(rx - .008, T.tail[0], s * .46, rx + .14, T.tail[1], s * (T.W / 2 * .92 - .01), .03, M.taillight, LT);
      // rodas: pneu, roda e cubo
      for (const wx of [T.wf, T.wr]) {
        const zc = s * (T.W / 2 - .14);
        const tire = new THREE.CylinderGeometry(T.r, T.r, .21, 20); tire.rotateX(Math.PI / 2); tire.translate(wx, T.r, zc); addMesh(tire, M.tire);
        const rim = new THREE.CylinderGeometry(T.r * .62, T.r * .62, .02, 16); rim.rotateX(Math.PI / 2); rim.translate(wx, T.r, zc + s * .1); addMesh(rim, M.metal, NC);
        const hub = new THREE.CylinderGeometry(T.r * .16, T.r * .16, .03, 10); hub.rotateX(Math.PI / 2); hub.translate(wx, T.r, zc + s * .112); addMesh(hub, M.darkMetal, NC);
      }
    }
    // grade e placas (sem texto)
    const gy = T.head[0] - .1, gx = carFaceX(T.body, gy, true);
    B(gx - .08, gy - .07, -.42, gx + .012, gy + .07, .42, M.black, NC);
    const py = T.sill + .1, px = carFaceX(T.body, py + .055, true);
    B(px - .03, py, -.25, px + .012, py + .11, .25, M.plate, NC);
    const qy = T.tail[0] - .22, qx = carFaceX(T.body, qy + .055, false);
    B(qx - .012, qy, -.25, qx + .03, qy + .11, .25, M.plate, NC);
    if (type === 'suv') {
      // rack de teto e moldura plástica preta na parte de baixo
      const hz = Wc * .43 - .1;
      for (const s of [-1, 1]) B(T.roof[1] + .1, T.roofY + .035, s * hz - .025, T.roof[0] - .12, T.roofY + .08, s * hz + .025, M.black);
      for (const s of [-1, 1]) B(T.wr + ra - .04, T.sill - .05, s * (T.W / 2 - .02), T.wf - ra + .04, T.sill + .1, s * (T.W / 2 + .012), M.black, NC);
    }
    // sombra difusa embaixo do carro
    const sh = new THREE.PlaneGeometry(T.L + .55, T.W + .5); sh.rotateX(-Math.PI / 2); sh.translate(0, .052, 0);
    addMesh(sh, M.carShadow, { cast: false, receive: false });
  }
}
function car(cx, cz, alongX, paint, flip, type = 'hatch', R = Math.random) {
  const { T, parts } = carGeo(type), pm = C(paint, .26, .5);
  const ry = (alongX ? 0 : Math.PI / 2) + (flip ? Math.PI : 0) + (R() - .5) * .05;
  const g = G(cx + (R() - .5) * .14, 0, cz + (R() - .5) * .14, ry);
  for (const p of parts) addMesh(p.geometry, p.material === CAR_SLOT ? pm : p.material, { cast: p.castShadow, receive: p.receiveShadow, parent: g });
  const hx = alongX ? T.L / 2 : T.W / 2, hz = alongX ? T.W / 2 : T.L / 2;
  addColl(cx - hx, cz - hz, cx + hx, cz + hz);
}
// ---------- móveis e objetos ----------
function bike(x, z, mat) {
  for (const u of [.35, 1.35]) { const w = new THREE.TorusGeometry(.31, .025, 6, 18); w.translate(x + u, .33, z); addMesh(w, M.black, NC); }
  rod([x + .35, .33, z], [x + .8, .55, z], .02, mat, NC); rod([x + .8, .55, z], [x + 1.3, .62, z], .02, mat, NC);
  rod([x + .8, .55, z], [x + .78, .88, z], .02, mat, NC); rod([x + 1.35, .33, z], [x + 1.28, .95, z], .02, mat, NC);
  B(x + .66, .88, z - .07, x + .92, .92, z + .07, M.black, NC); B(x + 1.25, .95, z - .25, x + 1.3, .99, z + .25, M.black, NC);
}
function lounger(x, z, y = 0) {
  B(x, y + .2, z, x + 1.5, y + .3, z + .7, M.lounger, { receive: true });
  OB([x + 1.5, y + .3, z + .35], [x + 1.95, y + .78, z + .35], .7, .08, M.lounger);
  for (const [dx, dz] of [[.05, .05], [.05, .55], [1.35, .05], [1.35, .55]]) B(x + dx, y, z + dz, x + dx + .1, y + .2, z + dz + .1, M.white);
  addColl(x, z, x + 1.9, z + .7);
}
function umbrella(x, z, y = 0) {
  CY(x, y, z, .04, y + 2.3, M.metal, { seg: 8 });
  CY(x, y + 2.05, z, 1.35, y + 2.45, M.white, { rTop: .08, seg: 8, open: false });
  CY(x, y, z, .3, y + .08, M.concrete, { seg: 12 });
}
function picnic(x, z) {
  B(x - 1, .72, z - .45, x + 1, .78, z + .45, M.cloth);
  for (const dx of [-.85, .75]) B(x + dx, 0, z - .35, x + dx + .1, .72, z + .35, M.wood);
  for (const s of [-1, 1]) B(x - 1, .42, z + s * .65, x + 1, .48, z + s * .95, M.wood);
  addColl(x - 1, z - .95, x + 1, z + .95);
}
function hammock(x, z) {
  for (const u of [0, 3]) CY(x + u, 0, z, .08, 2.0, M.wood, { seg: 8 });
  const yAt = (t) => 1.3 - Math.sin(t * Math.PI) * .5;
  for (let i = 0; i < 6; i++) { const t0 = i / 6, t1 = (i + 1) / 6; OB([x + .15 + t0 * 2.7, yAt(t0), z], [x + .15 + t1 * 2.7, yAt(t1), z], .85, .03, M.hammock); }
  for (const u of [0, 3]) rod([x + u, 1.95, z], [x + (u ? 2.85 : .15), 1.3, z], .01, M.wood, NC);
  addColl(x - .1, z - .1, x + .1, z + .1); addColl(x + 2.9, z - .1, x + 3.1, z + .1);
}
function bench(x0, z0, x1, z1) {
  B(x0, .42, z0, x1, .5, z1, M.wood);
  const long = x1 - x0 > z1 - z0;
  for (const t of [.1, .9]) {
    if (long) { const x = lerp(x0, x1, t); B(x - .06, 0, z0, x + .06, .42, z1, M.concrete); }
    else { const z = lerp(z0, z1, t); B(x0, 0, z - .06, x1, .42, z + .06, M.concrete); }
  }
  addColl(x0, z0, x1, z1);
}
function pingpong(x, z) {
  B(x - .76, .7, z - 1.37, x + .76, .76, z + 1.37, M.pingpong);
  for (const dz of [-1, 1]) B(x - .5, 0, z + dz * .9 - .06, x + .5, .7, z + dz * .9 + .06, M.concrete);
  B(x - .85, .76, z - .01, x + .85, .92, z + .01, M.net, NC);
  addColl(x - .8, z - 1.4, x + .8, z + 1.4);
}
function pergola(x0, z0, x1, z1) {
  const h = 2.6;
  for (const x of [x0, x1 - .2]) for (const z of [z0, z1 - .2]) { B(x, 0, z, x + .2, h, z + .2, M.wood); addColl(x, z, x + .2, z + .2); }
  B(x0, h, z0, x0 + .2, h + .2, z1, M.wood); B(x1 - .2, h, z0, x1, h + .2, z1, M.wood);
  for (let z = z0 + .3; z < z1 - .2; z += .5) B(x0 - .2, h + .2, z, x1 + .2, h + .32, z + .12, M.wood);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  CY(cx, h - .5, cz, .14, h - .2, M.bulb, { seg: 10, cast: false });
  LAMPS.push({ x: cx, y: h - .5, z: cz });
}
function tableSet(x, z) {
  CY(x, .72, z, .55, .77, M.white, { seg: 20 }); CY(x, 0, z, .05, .72, M.metal, { seg: 8 });
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2, cx = x + Math.cos(a) * .85, cz = z + Math.sin(a) * .85;
    const g = G(cx, 0, cz, -a + Math.PI / 2);
    within(g, () => { B(-.22, .42, -.2, .22, .48, .2, M.wood); B(-.22, .48, .17, .22, .9, .21, M.wood); for (const [lx, lz] of [[-.18, -.16], [.15, -.16], [-.18, .13], [.15, .13]]) B(lx, 0, lz, lx + .03, .42, lz + .03, M.metal); });
  }
  addColl(x - .6, z - .6, x + .6, z + .6);
}

// ---------- lazer ----------
function genLeisure() {
  // casa de bombas, apoio/área técnica e caixa d'água
  B(1, 0, 2, 5, 2.6, 8, M.concrete); B(.9, 2.6, 1.9, 5.1, 2.8, 8.1, M.roof); B(5, 0, 5, 5.06, 2.1, 5.9, M.door, NC);
  B(6, 0, 2, 23, 3.2, 9, M.white); B(5.9, 3.2, 1.9, 23.1, 3.45, 9.1, M.wallDark);
  for (let x = 7; x <= 21.5; x += 2) if (![9, 14, 19].some((d) => Math.abs(d - x) < .9)) { B(x, 1.6, 9, x + .9, 2.3, 9.05, M.frame, NC); B(x + .05, 1.65, 9.03, x + .85, 2.25, 9.07, M.glass, NC); }
  for (const x of [9, 14, 19]) B(x, 0, 9, x + .9, 2.1, 9.06, M.door, NC);
  for (const [x, z] of [[24.3, 2.3], [29.3, 2.3], [24.3, 8.3], [29.3, 8.3]]) B(x, 0, z, x + .4, 5.5, z + .4, M.concrete);
  CY(27, 5.5, 5.5, 2.9, 9.5, C('#8ea3b6', .5, .3), { seg: 24 }); CY(27, 9.5, 5.5, 2.95, 9.7, M.wallDark, { seg: 24 });
  addColl(1, 2, 30, 9); occ(1, 1, 30, 9.5);
  for (const [x0, z0, x1, z1] of [[6, 9, 23, 11], [13, 9, 15, 19], [15, 20, 31, 21]]) { flat(x0, z0, x1, z1, M.paving); occ(x0, z0, x1, z1); }

  // espaço fitness
  flat(5, 11, 13, 18, M.rubber, .04);
  B(5, 0, 11, 5.2, 2.6, 18, M.blue); addColl(5, 11, 5.2, 18);
  SIGN('FITWALL', 5.22, 1.7, 14.5, 3.2, .8, 'px', '#2c56aa');
  for (const x of [8, 10.4]) { B(x, 0, 12.4, x + .1, 2.3, 12.5, M.metal); addColl(x, 12.4, x + .1, 12.5); }
  B(8, 2.2, 12.42, 10.5, 2.27, 12.48, M.metal);
  B(8.4, 0, 15, 9.2, .6, 15.8, M.wood); B(9.6, 0, 15.1, 10.3, .45, 15.8, M.wood); addColl(8.4, 15, 10.3, 15.8);
  for (const x of [11.2, 11.8]) { B(x, 1, 13, x + .06, 1.06, 16, M.metal); for (const z of [13, 15.9]) B(x, 0, z, x + .06, 1, z + .06, M.metal); }
  occ(5, 11, 13, 18);

  // piscina com prainha + solarium
  const edge = C('#ecebe5', .6);
  for (const [x0, z0, x1, z1] of [[2, 19, 10, 20], [2, 33, 10, 34], [2, 20, 3, 33], [9, 20, 10, 33]]) flat(x0, z0, x1, z1, edge, .2);
  B(3, 0, 20, 9, .04, 33, M.pooltile, { cast: false });
  B(3, 0, 20, 9, .05, 23, C('#8fd3ee', .3), { cast: false });   // prainha (mais clara, rasa)
  const water = new THREE.PlaneGeometry(6, 13); water.rotateX(-Math.PI / 2); water.translate(6, .15, 26.5);
  projectUV(water, M.water); addMesh(water, M.water, { cast: false, receive: false }).userData.keep = true;
  addColl(3, 20, 9, 33);
  flat(10, 19, 15, 34, M.deck, .14);
  for (const z of [21, 23.5, 26, 28.5, 31]) lounger(10.3, z, .14);
  umbrella(13.6, 22.4, .14); umbrella(13.6, 29.6, .14);
  occ(2, 19, 15, 34);

  // apoio do salão
  B(15, 0, 11, 20, 2.8, 18, M.white); B(14.9, 2.8, 10.9, 20.1, 3.0, 18.1, M.wallDark);
  for (const x of [15.6, 18.4]) { B(x, 1.4, 18, x + .9, 2.1, 18.05, M.frame, NC); B(x + .05, 1.45, 18.03, x + .85, 2.05, 18.07, M.glass, NC); }
  B(17, 0, 18, 17.9, 2.1, 18.06, M.door, NC);
  addColl(15, 11, 20, 18); occ(15, 11, 20, 18);

  // playground
  flat(21, 11, 30, 19, M.rubber, .04);
  const red = C('#d6382f', .5), yel = C('#f2c230', .5), blu = C('#3474cc', .5), pur = C('#8d55c0', .5), grn = C('#55a855', .5);
  for (const [x, z] of [[23, 13], [25.75, 13], [23, 15.75], [25.75, 15.75]]) { B(x, 0, z, x + .25, 1.3, z + .25, red); B(x, 1.4, z, x + .25, 2.6, z + .25, yel); addColl(x, z, x + .25, z + .25); }
  B(23, 1.2, 13, 26, 1.4, 16, blu);
  const roof = new THREE.ConeGeometry(2.3, 1.1, 4); roof.rotateY(Math.PI / 4); roof.translate(24.5, 3.15, 14.5); addMesh(roof, pur);
  OB([26, 1.32, 14.5], [29.2, .2, 14.5], .62, .06, yel);
  for (const s of [-.33, .33]) OB([26, 1.5, 14.5 + s], [29.2, .38, 14.5 + s], .05, .2, yel);
  for (let h = .3; h < 1.3; h += .3) B(22.55, h, 14.1, 22.9, h + .05, 14.9, grn);
  for (const z of [14.05, 14.9]) B(22.55, 0, z, 22.9, 1.6, z + .05, grn);
  for (const z of [15.8, 18.5]) { B(21.3, 0, z, 21.45, 2.3, z + .15, red); addColl(21.3, z, 21.45, z + .15); }
  B(21.3, 2.2, 15.8, 21.45, 2.35, 18.65, red);
  for (const z of [16.6, 17.6]) { B(21.05, .45, z, 21.7, .5, z + .5, M.black); rod([21.38, .5, z + .25], [21.38, 2.2, z + .25], .012, M.metal, NC); }
  OB([26.5, .3, 17.3], [29.5, .7, 17.3], .35, .08, blu); B(27.8, 0, 17.1, 28.2, .45, 17.5, red); addColl(26.5, 17.1, 29.5, 17.5);
  for (const [x0, z0, x1, z1] of [[20, 10, 30, 10.03], [20, 18.97, 24, 19], [26, 18.97, 30, 19], [20, 10, 20.03, 19], [29.97, 10, 30, 19]]) { B(x0, 0, z0, x1, 1, z1, M.railing, NC); addColl(x0, z0, x1, z1); }
  occ(20, 10, 30, 19);

  // salão de festas (vidro + pilares)
  flat(16, 21, 30, 33, M.terracotta, .08);
  const pil = [];
  for (let x = 16; x <= 30.01; x += 3.5) pil.push([x, 21], [x, 33]);
  for (let z = 24.5; z < 33; z += 3.5) pil.push([16, z], [30, z]);
  for (const [x, z] of pil) { B(x - .15, 0, z - .15, x + .15, 2.9, z + .15, M.white); }
  B(16, 0, 20.98, 30, 2.9, 21.02, M.clearGlass, NC); B(15.98, 0, 21, 16.02, 2.9, 33, M.clearGlass, NC); B(29.98, 0, 21, 30.02, 2.9, 33, M.clearGlass, NC);
  B(16, 0, 32.98, 24, 2.9, 33.02, M.clearGlass, NC); B(26, 0, 32.98, 30, 2.9, 33.02, M.clearGlass, NC); B(24, 2.2, 32.98, 26, 2.9, 33.02, M.clearGlass, NC);
  B(15.6, 2.9, 20.6, 30.4, 3.2, 33.4, M.white); B(15.58, 3.0, 20.58, 30.42, 3.25, 33.42, M.wallDark, NC);
  B(18, 0, 21.3, 28, .92, 21.9, M.white); B(18, .92, 21.3, 28, .96, 21.9, C('#2b2b2e', .3));
  for (const x of [19.5, 23.5, 27]) for (const z of [25.3, 29.6]) tableSet(x, z);
  for (const [x, z] of [[19.5, 25.3], [27, 25.3], [19.5, 29.6], [27, 29.6]]) { CY(x, 2.75, z, .25, 2.9, M.bulb, { seg: 12, cast: false }); LAMPS.push({ x, y: 2.6, z, small: true }); }
  for (const [x0, z0, x1, z1] of [[16, 20.9, 30, 21.1], [15.9, 21, 16.1, 33], [29.9, 21, 30.1, 33], [16, 32.9, 24, 33.1], [26, 32.9, 30, 33.1]]) addColl(x0, z0, x1, z1);
  SIGN('SALÃO DE FESTAS', 25, 2.6, 33.05, 2.6, .45, 'pz', '#3c3c40');
  occ(15.5, 20.5, 30.5, 33.5);
}

// ---------- área técnica, bicicletário, redário e piquenique ----------
function genTech(R) {
  flat(31, 1, 52, 31, M.gravel, .04);
  for (const [x0, z0, x1, z1] of [[31, 1, 31.03, 31], [51.97, 1, 52, 31], [31, 30.97, 40, 31], [42, 30.97, 52, 31]]) { B(x0, 0, z0, x1, 2, z1, M.chain, NC); addColl(x0, z0, x1, z1); }
  for (const [x, z] of [[31, 1], [31, 31], [52, 1], [52, 31], [40, 31], [42, 31]]) CY(x, 0, z, .05, 2.05, M.metal, { seg: 8 });
  for (const x0 of [34, 43]) { B(x0, 0, 5, x0 + 7, 2.4, 12, M.concrete); B(x0 + .3, 2.36, 5.3, x0 + 6.7, 2.41, 11.7, M.water, NC); addColl(x0, 5, x0 + 7, 12); }
  CY(42, 1.4, 8.5, .15, 1.41, M.metal); rod([41, 1.4, 8.5], [43, 1.4, 8.5], .15, M.metal);
  B(34, 0, 17, 40, 2.8, 23, M.concrete); B(33.9, 2.8, 16.9, 40.1, 3.0, 23.1, M.roof); B(36, 0, 23, 36.9, 2.1, 23.06, M.door, NC);
  addColl(34, 17, 40, 23);
  occ(31, 1, 52, 31);

  flat(53, 8, 58, 31, M.paving);
  B(53, 0, 8, 53.2, 2.4, 31, M.blue); addColl(53, 8, 53.2, 31);
  SIGN('BIKE', 53.22, 1.6, 19.5, 2.4, .8, 'px', '#2c56aa');
  const cols = [C('#d6382f', .4, .3), C('#3474cc', .4, .3), C('#f2c230', .4, .3), C('#55a855', .4, .3), C('#232427', .4, .3)];
  for (let z = 9.2; z < 30.5; z += 1.15) if (R() < .75) bike(54.25, z, cols[R() * cols.length | 0]);
  for (const z of [12, 20, 28]) { B(53, 2.4, z - .15, 53.35, 2.6, z + .15, M.bulb, NC); LAMPS.push({ x: 53.3, y: 2.3, z, small: true }); }
  occ(53, 8, 58, 31);

  hammock(56, 2.6); hammock(60.6, 2.6);
  for (let x = 55.3; x < 66.5; x += 1.1) SP(x, .5 + R() * .3, 1.0, .55 + R() * .25, R() < .7 ? M.leafPink : M.leafDark, { ico: true, sy: .8 });
  picnic(70.2, 2.7); picnic(73.8, 2.7);
  occ(55, .5, 76, 4.5);
}

// ---------- estacionamento ----------
function genParking(R) {
  const pick = () => CAR_PAINT[R() * CAR_PAINT.length | 0];
  const kind = () => { const r = R(); return r < .45 ? 'hatch' : r < .7 ? 'sedan' : 'suv'; };
  flat(1, 75, 80, 89, M.asphalt, .03); flat(41, 31, 58, 75, M.asphalt, .031);
  const line = (x0, z0, x1, z1) => B(x0, 0, z0, x1, .045, z1, C('#f2f2ee', .7), NC);
  for (let x = 8; x <= 39; x += 3) line(x - .05, 75, x + .05, 80);
  for (let x = 8; x <= 78; x += 3) line(x - .05, 84.5, x + .05, 89);
  for (let z = 32; z <= 75; z += 3) { line(41, z - .05, 46, z + .05); line(53, z - .05, 58, z + .05); }
  for (const z of [65, 68]) B(41.1, 0, z + .1, 45.9, .042, z + 2.9, C('#2c5fb8', .7), NC);
  for (let x = 8; x + 3 <= 39; x += 3) if (R() < .7) car(x + 1.5, 77.5, false, pick(), R() < .5, kind(), R);
  for (let x = 8; x + 3 <= 78; x += 3) if (R() < .65) car(x + 1.5, 86.7, false, pick(), R() < .5, kind(), R);
  for (let z = 32; z + 3 <= 75; z += 3) {
    if (R() < .7) car(43.6, z + 1.5, true, pick(), R() < .6, kind(), R);
    if (R() < .7) car(55.4, z + 1.5, true, pick(), R() < .4, kind(), R);
  }
  occ(1, 75, 80, 89); occ(41, 31, 58, 75);
}

// ---------- praças e pet place ----------
function genPracas() {
  flat(38, 104, 43, 110, M.terracotta, .07);
  pergola(38.2, 104.2, 42.8, 109.8);
  bench(38.3, 105.2, 38.8, 108.8); bench(42.2, 105.2, 42.7, 108.8);
  flat(38, 117, 43, 124, M.terracotta, .07);
  pingpong(40.5, 120.5);
  bench(38.2, 118.5, 38.6, 122.5); bench(42.4, 118.5, 42.8, 122.5);
  occ(38, 104, 43, 110); occ(38, 117, 43, 124);
  // pet place
  for (const [x0, z0, x1, z1] of [[77, 110, 77.03, 115.5], [77, 117, 77.03, 123], [77, 110, 81, 110.03], [77, 122.97, 81, 123]]) { B(x0, 0, z0, x1, 1.1, z1, M.railing, NC); addColl(x0, z0, x1, z1); }
  B(80.8, 0, 110, 81, 1.6, 123, M.blue);
  SIGN('PET PLACE', 80.78, 1.0, 116.5, 2.8, .7, 'nx', '#2c56aa');
  flat(78, 117.5, 80.5, 121.5, C('#d8c79e', 1), .03);
  OB([78.3, .05, 111.5], [79.9, .9, 111.5], .9, .06, M.wood); OB([79.9, .9, 111.5], [79.9, .05, 113.4], .9, .06, M.wood);
  const tun = new THREE.CylinderGeometry(.45, .45, 2, 16, 1, true, 0, Math.PI); tun.rotateX(Math.PI / 2); tun.rotateZ(Math.PI / 2); tun.translate(79.2, 0, 119.5);
  addMesh(tun, C('#d6382f', .5));
  for (const x of [78.3, 79.8]) B(x, 0, 115.9, x + .06, .6, 116, C('#f2c230', .5));
  B(78.3, .5, 115.9, 79.86, .56, 116, C('#f2c230', .5));
  occ(77, 110, 81, 123);
}

// ---------- postes ----------
function genLamps() {
  for (const z of [40, 50, 58, 68, 93, 102, 112, 121]) LAMP(5.5, z + .5);
  for (const x of [10, 22, 34, 46, 58, 70]) LAMP(x + .5, 127.6);
  for (const z of [10, 22, 34, 46, 58, 70, 82, 94]) LAMP(79.6, z + .5);
  for (const x of [10, 22, 34]) LAMP(x + .5, 73.5);
  for (const z of [35, 49, 57, 70]) LAMP(40.5, z + .5);
  LAMP(60.2, 40.5); LAMP(5.5, 36.5); LAMP(32.6, 33.6); LAMP(15.5, 18.6); LAMP(67.5, 3.5); LAMP(49.5, 25.5); LAMP(78.5, 114.5);
  for (let z = 4; z < 128; z += 12) if (z < 72 || z > 94) LAMP(-1.4, z, 5.2);
  for (let z = 4; z < 128; z += 12) LAMP(83.4, z, 5.2);
  for (let x = 6; x < 80; x += 12) { LAMP(x, -1.4, 5.2); LAMP(x, 131.4, 5.2); }
}

// ---------- árvores ----------
function freeForTree(x, z, r = 3) {
  for (const b of BUILDINGS) { const q = bRect(b); if (x > q.x0 - r && x < q.x1 + r && z > q.z0 - r && z < q.z1 + r) return false; }
  for (const o of OCC) if (x > o[0] - .6 && x < o[2] + .6 && z > o[1] - .6 && z < o[3] + .6) return false;
  for (const c of COLL) if (x > c[0] - .8 && x < c[2] + .8 && z > c[1] - .8 && z < c[3] + .8) return false;
  for (const l of LAMPS) if (Math.hypot(l.x - x, l.z - z) < 2.2) return false;
  return true;
}
function tree(x, z, kind, R, force = false) {
  if (!force && !freeForTree(x, z)) return false;
  const s = .85 + R() * .4;
  if (kind === 'palm') {
    const h = (6 + R() * 2.5) * s; let px = x, pz = z, py = 0;
    const lean = [(R() - .5) * .25, (R() - .5) * .25];
    for (let i = 0; i < 4; i++) { const nx = px + lean[0] * (i + 1) * .5, nz = pz + lean[1] * (i + 1) * .5, ny = py + h / 4; rod([px, py, pz], [nx, ny, nz], .2 - i * .02, M.palmTrunk, { seg: 8, r2: .18 - i * .02 }); px = nx; pz = nz; py = ny; }
    for (let i = 0; i < 9; i++) {
      const g = G(px, py, pz, i / 9 * Math.PI * 2 + R() * .3); g.rotation.z = -.45 - R() * .25;
      SP(1.3 * s, 0, 0, .95 * s, M.leafPalm, { ico: true, sx: 1.7, sy: .14, sz: .42, parent: g });
    }
    SP(px, py - .1, pz, .3, M.palmTrunk, { ico: true });
  } else {
    const th = (kind === 'mango' ? 1.9 : kind === 'ipe' ? 2.8 : 2.3) * s;
    CY(x, 0, z, .2 * s, th + .4, M.trunk, { rTop: .13 * s, seg: 8 });
    const mat = kind === 'ipe' ? M.leafYellow : kind === 'mango' ? M.leafDark : (R() < .5 ? M.leaf : M.leafDark);
    const rad = (kind === 'mango' ? 2.5 : kind === 'ipe' ? 2.1 : 1.7) * s, n = kind === 'mango' ? 8 : 6;
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, d = R() * rad * .7;
      SP(x + Math.cos(a) * d, th + rad * .55 + (R() - .3) * rad * (kind === 'ipe' ? .35 : .6), z + Math.sin(a) * d, rad * (.55 + R() * .35), i === 0 && kind === 'ipe' ? M.leaf : mat, { ico: true, detail: 1, sy: kind === 'ipe' ? .7 : .9 });
    }
  }
  addColl(x - .25, z - .25, x + .25, z + .25);
  return true;
}
function genTrees(R) {
  let flip = false;
  const perim = (x, z) => { flip = !flip; tree(x, z, flip ? 'ipe' : 'oak', R); };
  for (let z = 37; z <= 126; z += 5) perim(1.1, z);
  for (let x = 7; x <= 78; x += 5) perim(x, 128.6);
  for (let z = 10; z <= 126; z += 5) perim(80.6, z);
  for (const z of [21, 26, 31]) tree(1.1, z, 'palm', R, true);
  for (let z = 3; z < LOT_D - 2; z += 6) for (let x = 3; x < LOT_W - 2; x += 6) {
    const px = x + R() * 4 - 2, pz = z + R() * 4 - 2, r = R();
    tree(px, pz, r < .35 ? 'oak' : r < .55 ? 'mango' : r < .78 ? 'ipe' : 'palm', R);
  }
  // árvores de calçada lá fora
  for (let z = 4; z < 130; z += 9) { tree(-12.5, z, 'oak', R, true); tree(98.5, z + 2, 'ipe', R, true); }
  for (let x = 3; x < 82; x += 9) { tree(x, -12.5, 'ipe', R, true); tree(x + 3, 142.5, 'oak', R, true); }
  // arbustos soltos nos gramados
  for (let i = 0; i < 160; i++) {
    const x = 2 + R() * 78, z = 2 + R() * 126;
    if (freeForTree(x, z, 1.5)) SP(x, .35, z, .45 + R() * .35, R() < .2 ? M.leafPink : M.leafDark, { ico: true, sy: .75 });
  }
}

// ---------- montagem completa ----------
function generateSite() {
  const R = rng(2024);
  genGround(); genStreets(); genNeighbors(R); genWall(); genPaths();
  genParking(R); genGuarita(); genLeisure(); genTech(R); genPracas();
  for (const b of BUILDINGS) genBuilding(b, R);
  genLamps(); genTrees(R);
}
