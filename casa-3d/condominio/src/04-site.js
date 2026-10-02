// ============================================================
// 04 · TERRENO — chão, ruas, vizinhança, muro, portaria e prédios
// ============================================================
const flat = (x0, z0, x1, z1, mat, top = .05) => B(x0, 0, z0, x1, top, z1, mat, { cast: false });

function genGround() {
  const far = new THREE.PlaneGeometry(2400, 2400); far.rotateX(-Math.PI / 2); far.translate(41, -.06, 65);
  addMesh(far, C('#5d7a43', 1), { cast: false });
  const g = new THREE.PlaneGeometry(XMAX - XMIN + 4, ZMAX - ZMIN + 4);
  g.rotateX(-Math.PI / 2); g.translate((XMIN + XMAX) / 2, 0, (ZMIN + ZMAX) / 2);
  projectUV(g, M.grass); addMesh(g, M.grass, { cast: false });
}

function genStreets() {
  // pistas
  flat(-11, ZMIN - 2, -3, ZMAX + 2, M.asphalt, .02);
  flat(XMIN - 2, -11, XMAX + 2, -3, M.asphalt, .021);
  flat(XMIN - 2, 133, XMAX + 2, 141, M.asphalt, .021);
  flat(85, ZMIN - 2, 97, ZMAX + 2, M.dirt, .02);
  // calçadas elevadas (entre os cruzamentos)
  const sw = (x0, z0, x1, z1) => flat(x0, z0, x1, z1, M.sidewalk, .15);
  sw(-3, -3, 0, 133); sw(82, -3, 85, 133); sw(0, -3, 82, 0); sw(0, 130, 82, 133);
  sw(-14, -3, -11, 133); sw(97, -3, 100, 133); sw(-3, -14, 85, -11); sw(-3, 141, 85, 144);
  // faixas centrais tracejadas e faixa de pedestres na portaria
  const yl = C('#e3bf3a', .7), wh = C('#f2f2ee', .7);
  for (let z = ZMIN; z < ZMAX; z += 4) if (z < -12 || (z > -3 && z < 131) || z > 142) B(-7.08, 0, z, -6.92, .03, z + 2.2, yl, { cast: false });
  for (let x = XMIN; x < XMAX; x += 4) if (x < -12 || (x > -3 && x < 83) || x > 98) { B(x, 0, -7.08, x + 2.2, .03, -6.92, yl, { cast: false }); B(x, 0, 136.92, x + 2.2, .03, 137.08, yl, { cast: false }); }
  for (let x = -10.6; x < -3.4; x += 1) B(x, 0, 87.6, x + .5, .03, 90.6, wh, { cast: false });
  flat(-3, 76, 0, 82, M.asphalt, .16);   // rebaixo da calçada no portão de veículos
}

// ---------- casas vizinhas (contexto) ----------
const HOUSE_COLORS = ['#e8dcc4', '#f2efe6', '#e9c46a', '#8fb3d9', '#a7c7a0', '#d9a7a0', '#cfc8bc', '#f0d9b5'];
const _houseMats = new Map();
function houseMat(color) { if (!_houseMats.has(color)) _houseMats.set(color, std({ map: TX.plaster, color, roughness: .95 })); return _houseMats.get(color); }
function house(x0, z0, x1, z1, front, floors, color, R) {
  const h = floors * 2.9;
  B(x0, 0, z0, x1, h, z1, houseMat(color));
  B(x0 - .05, h, z0 - .05, x1 + .05, h + .5, z1 + .05, M.wallDark);
  const alongX = front === 'n' || front === 's';
  const f = front === 'n' ? z0 : front === 's' ? z1 : front === 'w' ? x0 : x1, s = front === 'n' || front === 'w' ? -1 : 1;
  const a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1, mid = (a0 + a1) / 2;
  const P = (b0, y0, b1, y1, d, mat) => alongX ? B(b0, y0, f, b1, y1, f + s * d, mat, { cast: false }) : B(f, y0, b0, f + s * d, y1, b1, mat, { cast: false });
  for (let k = 0; k < floors; k++) {
    const yb = k * 2.9;
    for (let a = a0 + 1; a + 1.2 < a1 - .5; a += 2.4) {
      if (k === 0 && Math.abs(a + .6 - mid) < 1.3) continue;
      P(a - .06, yb + .94, a + 1.26, yb + 2.26, .05, M.frame);
      P(a, yb + 1, a + 1.2, yb + 2.2, .06, R() < .3 ? M.glassLit : M.glass);
    }
  }
  P(mid - .5, 0, mid + .5, 2.1, .06, M.door);
}
function genNeighbors(R) {
  const ring = (from, to, make) => {
    let p = from;
    while (p < to - 6) {
      const w = 7 + R() * 5, d = 7 + R() * 4, fl = R() < .55 ? 1 : 2;
      if (p + w > to) break;
      make(p, p + w, d, fl, HOUSE_COLORS[R() * HOUSE_COLORS.length | 0]);
      p += w + 1 + R() * 3;
    }
  };
  ring(0, 130, (a0, a1, d, fl, c) => house(-15 - d, a0, -15, a1, 'e', fl, c, R));
  ring(0, 130, (a0, a1, d, fl, c) => house(101, a0, 101 + d, a1, 'w', fl, c, R));
  ring(0, 82, (a0, a1, d, fl, c) => house(a0, -15 - d, a1, -15, 's', fl, c, R));
  ring(0, 82, (a0, a1, d, fl, c) => house(a0, 145, a1, 145 + d, 'n', fl, c, R));
}

// ---------- muro com cantos chanfrados ----------
function wallSeg(xa, za, xb, zb, h, mat, t = .2) {
  const len = Math.hypot(xb - xa, zb - za), ang = Math.atan2(zb - za, xb - xa);
  const g = new THREE.BoxGeometry(len, h, t);
  g.rotateY(-ang); g.translate((xa + xb) / 2, h / 2, (za + zb) / 2);
  projectUV(g, mat); addMesh(g, mat);
  const n = Math.ceil(len / .5);
  for (let i = 0; i <= n; i++) { const x = lerp(xa, xb, i / n), z = lerp(za, zb, i / n); addColl(x - .2, z - .2, x + .2, z + .2); }
}
function genWall() {
  const H = 2.4, c = 4;
  // fachada (rua da esquerda): mureta + gradil, com portões
  for (const [za, zb] of [[c, 76], [82, 89], [91, 130 - c]]) {
    wallSeg(0, za, 0, zb, 1.0, M.muro);
    const g = new THREE.BoxGeometry(.03, 1.4, zb - za); g.translate(0, 1.7, (za + zb) / 2); projectUV(g, M.bars); addMesh(g, M.bars, { cast: false });
  }
  wallSeg(82, c, 82, 130 - c, H, M.muro);
  wallSeg(c, 0, 82 - c, 0, H, M.muro);
  wallSeg(c, 130, 82 - c, 130, H, M.muro);
  wallSeg(0, c, c, 0, H, M.muro); wallSeg(82 - c, 0, 82, c, H, M.muro);
  wallSeg(0, 130 - c, c, 130, H, M.muro); wallSeg(82 - c, 130, 82, 130 - c, H, M.muro);
  // portão de veículos aberto (correu para dentro) e portão de pedestres
  B(.3, 0, 69.5, .36, 2.3, 75.8, M.bars, { cast: false });
  B(.3, 0, 89, 1.5, 2.1, 89.04, M.bars, { cast: false });
}

// ---------- guarita com eclusa ----------
function genGuarita() {
  flat(.2, 82, 6.5, 89, M.paving, .06); occ(.2, 82, 6.5, 89);
  B(1.2, 0, 83, 5.2, 2.8, 87.5, M.white);
  addColl(1.2, 83, 5.2, 87.5);
  for (const [a, b] of [[1.6, 2.9], [3.4, 4.7]]) { B(a, 1, 82.94, b, 2.1, 83, M.frame, { cast: false }); B(a + .05, 1.05, 82.92, b - .05, 2.05, 82.95, M.glassLit, { cast: false }); }
  B(1.14, 1, 84, 1.2, 2.1, 86.5, M.frame, { cast: false }); B(1.12, 1.05, 84.05, 1.15, 2.05, 86.45, M.glassLit, { cast: false });
  B(5.2, 0, 85, 5.26, 2.1, 85.9, M.door, { cast: false });
  B(0, 2.8, 82.3, 6.6, 3.05, 88.2, M.wallDark);
  SIGN('PORTARIA', 3.2, 2.45, 82.93, 2.2, .45, 'nz', '#3c3c40');
  SIGN('VIVA VIDA SUL', -.12, 1.45, 85.5, 3.2, .8, 'nx', '#7a3d24', '#f6e7d2');
  for (const z of [82.6, 87.9]) { B(6.2, 2.55, z - .12, 6.45, 2.8, z + .12, M.bulb, { cast: false }); LAMPS.push({ x: 6.3, y: 2.5, z, small: true }); }
}

// ---------- prédios ----------
// Fileira norte (c 0..4,8) e sul (c 7,6..12,4) com 4 apartamentos de 7,6 m; circulação no meio.
function genBuilding(b, R) {
  const r = bRect(b), HD = b.dir === 'h', F = b.floors, HT = F * FLOOR_H;
  const LB = (a0, y0, c0, a1, y1, c1, mat, o) => HD ? B(r.x0 + a0, y0, r.z0 + c0, r.x0 + a1, y1, r.z0 + c1, mat, o) : B(r.x0 + c0, y0, r.z0 + a0, r.x0 + c1, y1, r.z0 + a1, mat, o);
  const toLot = (a, c) => HD ? [r.x0 + a, r.z0 + c] : [r.x0 + c, r.z0 + a];
  const ROWS = [[0, ROW], [ROW + COR, BWID]];
  const cores = [UNIT - 1.5, 3 * UNIT - 1.5];
  const NC = { cast: false };

  for (const [c0, c1] of ROWS) {
    LB(0, 0, c0, BLEN, HT, c1, M.wall);
    LB(-.03, 0, c0 - .03, BLEN + .03, .45, c1 + .03, M.wallDark, NC);
  }
  // faces: [c da face, sentido para fora, é fachada externa]
  const FACES = [[0, -1, true], [ROW, 1, false], [ROW + COR, -1, false], [BWID, 1, true]];
  const P = (a0, y0, a1, y1, face, d, mat, d0 = 0) => { const [c, s] = face; LB(a0, y0, c + s * d0, a1, y1, c + s * d, mat, NC); };
  for (const face of FACES) {
    for (const a of [0, UNIT, 2 * UNIT, 3 * UNIT, BLEN]) P(Math.max(-.02, a - .25), .45, Math.min(BLEN + .02, a + .25), HT, face, .06, M.wallGray);
    if (face[2]) for (let k = 1; k < F; k++) P(0, k * FLOOR_H - .06, BLEN, k * FLOOR_H + .06, face, .04, M.wallGray);
  }
  // janela de correr: moldura, vidro, montante central e peitoril
  const win = (face, a0, a1, y0, y1, lit) => {
    P(a0 - .06, y0 - .06, a1 + .06, y1 + .06, face, .07, M.frame);
    P(a0 + .04, y0 + .04, a1 - .04, y1 - .04, face, .075, lit ? M.glassLit : M.glass, .07);
    P((a0 + a1) / 2 - .025, y0, (a0 + a1) / 2 + .025, y1, face, .085, M.frame, .07);
    P(a0 - .1, y0 - .1, a1 + .1, y0 - .04, face, .13, M.white);
  };
  for (let k = 0; k < F; k++) {
    const yb = k * FLOOR_H;
    for (let u = 0; u < 4; u++) {
      const ua = u * UNIT, mir = u % 2 === 1;
      const span = (a0, a1) => mir ? [ua + UNIT - a1, ua + UNIT - a0] : [ua + a0, ua + a1];
      for (const outer of [FACES[0], FACES[3]]) {
        const litSala = R() < .35;
        for (const [a0, a1, sala] of [[.7, 1.9, 0], [3.0, 4.55, 1], [5.7, 6.9, 0]]) { const [p0, p1] = span(a0, a1); win(outer, p0, p1, yb + 1, yb + 2.2, sala ? litSala : R() < .3); }
      }
      for (const inner of [FACES[1], FACES[2]]) {
        const [s0, s1] = span(.37, 1.38); win(inner, s0, s1, yb + 1.5, yb + 2.1, false);
        const [d0, d1] = span(4.4, 5.2);
        P(d0 - .06, yb, d1 + .06, yb + 2.16, inner, .05, M.frame); P(d0, yb, d1, yb + 2.1, inner, .07, M.door, .05);
      }
    }
  }
  // circulação: piso, passarelas, guarda-corpos e núcleos de escada
  const [cx0, cz0] = toLot(-2.6, ROW), [cx1, cz1] = toLot(BLEN + 2.6, ROW + COR);
  flat(Math.min(cx0, cx1), Math.min(cz0, cz1), Math.max(cx0, cx1), Math.max(cz0, cz1), M.paving, .06);
  const runs = [[0, cores[0]], [cores[0] + 3, cores[1]], [cores[1] + 3, BLEN]];
  for (let k = 1; k < F; k++) {
    const y = k * FLOOR_H;
    for (const [a0, a1] of runs) {
      LB(a0, y - .2, ROW, a1, y, ROW + 1, M.concrete, NC); LB(a0, y - .2, ROW + COR - 1, a1, y, ROW + COR, M.concrete, NC);
      LB(a0, y, ROW + .98, a1, y + 1.05, ROW + 1.0, M.railing, NC); LB(a0, y, ROW + COR - 1.0, a1, y + 1.05, ROW + COR - .98, M.railing, NC);
    }
    for (const a of [0, BLEN - .02]) { LB(a, y, ROW, a + .02, y + 1.05, ROW + 1, M.railing, NC); LB(a, y, ROW + COR - 1, a + .02, y + 1.05, ROW + COR, M.railing, NC); }
  }
  for (const c0 of cores) {
    LB(c0, 0, ROW, c0 + 3, HT + 2.4, ROW + COR, M.wallGray);
    LB(c0 + .3, HT + 2.4, ROW + .2, c0 + 2.7, HT + 3.3, ROW + COR - .2, M.white);
    for (const a of [c0 - .01, c0 + 3]) for (let k = 0; k < F; k++) LB(a, k * FLOOR_H + 1, ROW + .6, a + .01, k * FLOOR_H + 2.4, ROW + COR - .6, M.cobogo, NC);
  }
  // cobertura e platibanda
  LB(0, HT, 0, BLEN, HT + .15, BWID, M.roof, NC);
  LB(-.02, HT, -.02, BLEN + .02, HT + .9, .15, M.wallDark); LB(-.02, HT, BWID - .15, BLEN + .02, HT + .9, BWID + .02, M.wallDark);
  LB(-.02, HT, 0, .15, HT + .9, BWID, M.wallDark); LB(BLEN - .15, HT, 0, BLEN + .02, HT + .9, BWID, M.wallDark);
  // jardins privativos do térreo (cerca viva + divisórias entre apartamentos)
  for (const [h0, h1, p0, p1] of [[-1.6, -1.1, -1.1, 0], [BWID + 1.1, BWID + 1.6, BWID, BWID + 1.1]]) {
    LB(0, 0, h0, BLEN, .85, h1, M.hedge);
    const [ax, az] = toLot(0, h0), [bx, bz] = toLot(BLEN, h1); addColl(ax, az, bx, bz);
    for (let a = UNIT; a < BLEN - .1; a += UNIT) LB(a - .1, 0, p0, a + .1, .85, p1, M.hedge, NC);
  }
  // placas dos blocos e arandelas nas entradas da circulação
  const mid = ROW + COR / 2;
  const [s0x, s0z] = toLot(-.03, mid), [s1x, s1z] = toLot(BLEN + .03, mid);
  SIGN('BLOCO ' + b.blocks[0], s0x, 2.45, s0z, 2.2, .55, HD ? 'nx' : 'nz');
  SIGN('BLOCO ' + b.blocks[1], s1x, 2.45, s1z, 2.2, .55, HD ? 'px' : 'pz');
  for (const a of [-.12, BLEN + .02]) for (const c of [ROW - .45, ROW + COR + .3]) {
    LB(a, 2.1, c, a + .1, 2.35, c + .15, M.bulb, NC);
    const [lx, lz] = toLot(a, c); LAMPS.push({ x: lx, y: 2.1, z: lz, small: true });
  }
  // colisão: fileiras e núcleos
  for (const [c0, c1] of ROWS) { const [ax, az] = toLot(0, c0), [bx, bz] = toLot(BLEN, c1); addColl(ax, az, bx, bz); }
  for (const c0 of cores) { const [ax, az] = toLot(c0, ROW), [bx, bz] = toLot(c0 + 3, ROW + COR); addColl(ax, az, bx, bz); }
}

// ---------- caminhos principais ----------
function genPaths() {
  const P = (x0, z0, x1, z1) => { flat(x0, z0, x1, z1, M.paving, .05); occ(x0, z0, x1, z1); };
  P(2, 34, 5, 75); P(2, 89, 5, 127); P(0, 89, 2, 91);
  P(2, 34, 32, 36); P(2, 53, 41, 55);
  P(77, 3, 79, 106); P(75, 106, 77, 127);
  P(58, 5, 79, 7); P(58, 5, 60, 75);
  P(1, 106, 77, 108); P(38, 89, 43, 125); P(1, 125, 79, 127);
}
