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
// Gardens (área privativa descoberta, 15,10 m²) das unidades térreas, conforme o memorial:
// nos blocos 01, 02, 07–10 e 13–16 as quatro unidades têm garden; nos demais, só estas
const GARDENS = { '03': [3, 4], '04': [1, 2], '05': [1, 2], '11': [1, 2], '06': [3, 4], '12': [3, 4] };
// número da unidade (01–04) de cada apartamento da fileira, na ordem do eixo do prédio (como no masterplan)
const UNIT_NUM = { h: [[4, 3, 2, 1], [1, 2, 3, 4]], v: [[1, 2, 3, 4], [4, 3, 2, 1]] };
function hasGarden(b, row, u) {
  return (GARDENS[b.blocks[u < 2 ? 0 : 1]] || [1, 2, 3, 4]).includes(UNIT_NUM[b.dir][row][u]);
}
function genBuilding(b, R) {
  const r = bRect(b), HD = b.dir === 'h', F = b.floors, HT = F * FLOOR_H;
  const LB = (a0, y0, c0, a1, y1, c1, mat, o) => HD ? B(r.x0 + a0, y0, r.z0 + c0, r.x0 + a1, y1, r.z0 + c1, mat, o) : B(r.x0 + c0, y0, r.z0 + a0, r.x0 + c1, y1, r.z0 + a1, mat, o);
  const toLot = (a, c) => HD ? [r.x0 + a, r.z0 + c] : [r.x0 + c, r.z0 + a];
  const ROWS = [[0, ROW], [ROW + COR, BWID]];
  // Faixa entre as fileiras: um núcleo fechado de escada por bloco (cobre as portas dos 4 apartamentos),
  // um vão aberto no meio (janelas de serviço frente a frente) e as pontas abertas, que são a entrada.
  const CORES = [[4, 11.2], [BLEN - 11.2, BLEN - 4]];
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
      for (const [outer, row] of [[FACES[0], 0], [FACES[3], 1]]) {
        const litSala = R() < .35, porta = k === 0 && hasGarden(b, row, u);
        for (const [a0, a1, sala] of [[.7, 1.9, 0], [3.0, 4.55, 1], [5.7, 6.9, 0]]) {
          const [p0, p1] = span(a0, a1);
          win(outer, p0, p1, yb + (sala && porta ? .15 : 1), yb + 2.2, sala ? litSala : R() < .3);
        }
      }
      for (const inner of [FACES[1], FACES[2]]) { const [s0, s1] = span(.37, 1.38); win(inner, s0, s1, yb + 1.5, yb + 2.1, false); }
    }
  }
  // faixa central: piso das entradas, cascalho no vão do meio e núcleos de escada
  const mid = ROW + COR / 2, NH = HT + .35;
  const stripFlat = (a0, a1, mat, top) => { const [x0, z0] = toLot(a0, ROW), [x1, z1] = toLot(a1, ROW + COR); flat(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), mat, top); };
  stripFlat(-2.6, CORES[0][0], M.paving, .06); stripFlat(CORES[1][1], BLEN + 2.6, M.paving, .06);
  stripFlat(CORES[0][1], CORES[1][0], M.gravel, .08);
  // janela numa parede transversal do núcleo (a constante), voltada para s = ±1
  const AT = (a, s, d0, d1) => s > 0 ? [a + d0, a + d1] : [a - d1, a - d0];
  const winT = (a, s, w, y0, y1, mat) => {
    const c0 = mid - w / 2, c1 = mid + w / 2;
    let [p, q] = AT(a, s, 0, .07); LB(p, y0 - .06, c0 - .06, q, y1 + .06, c1 + .06, M.frame, NC);
    [p, q] = AT(a, s, .07, .075); LB(p, y0 + .04, c0 + .04, q, y1 - .04, c1 - .04, mat, NC);
    [p, q] = AT(a, s, .07, .085); LB(p, y0, mid - .025, q, y1, mid + .025, M.frame, NC);
    [p, q] = AT(a, s, 0, .13); LB(p, y0 - .1, c0 - .1, q, y0 - .04, c1 + .1, M.white, NC);
  };
  CORES.forEach(([a0, a1], i) => {
    LB(a0, 0, ROW, a1, NH, ROW + COR, M.wallGray);
    LB(a0 - .05, NH, ROW, a1 + .05, NH + .1, ROW + COR, M.roof, NC);
    // janelão da escada em cada andar, nas duas paredes de ponta do núcleo
    const out = i === 0 ? [a0, -1] : [a1, 1], inn = i === 0 ? [a1, 1] : [a0, -1];
    for (let k = 0; k < F; k++) {
      winT(inn[0], inn[1], 1.6, k * FLOOR_H + .9, k * FLOOR_H + 2.3, M.glassLit);
      if (k > 0) winT(out[0], out[1], 1.6, k * FLOOR_H + .9, k * FLOOR_H + 2.3, M.glassLit);
    }
    // entrada do bloco: porta de vidro, marquise com luminária e placa
    const [e, s1] = out;
    let [p, q] = AT(e, s1, 0, .06); LB(p, 0, mid - .7, q, 2.3, mid + .7, M.darkMetal, NC);
    [p, q] = AT(e, s1, .06, .07); LB(p, .05, mid - .62, q, 2.22, mid + .62, M.glass, NC);
    [p, q] = AT(e, s1, .07, .1); LB(p, 1.0, mid - .5, q, 1.04, mid + .5, M.metal, NC);
    [p, q] = AT(e, s1, 0, 1.4); LB(p, 2.55, ROW + .12, q, 2.7, ROW + COR - .12, M.concrete, NC);
    [p, q] = AT(e, s1, .55, .85); LB(p, 2.5, mid - .15, q, 2.55, mid + .15, M.bulb, NC);
    const [lx, lz] = toLot((p + q) / 2, mid); LAMPS.push({ x: lx, y: 2.45, z: lz, small: true });
    const [sx, sz] = toLot(e + s1 * .03, mid);
    SIGN('BLOCO ' + b.blocks[i], sx, 3.15, sz, 1.9, .48, HD ? (s1 > 0 ? 'px' : 'nx') : (s1 > 0 ? 'pz' : 'nz'));
  });
  // cobertura: cada fileira com platibanda própria e divisão entre os apartamentos (como no masterplan)
  const roofCream = C('#d6cbb2', .95), PH = .8;
  for (const [c0, c1] of ROWS) {
    LB(0, HT, c0, BLEN, HT + .12, c1, roofCream, NC);
    LB(-.02, HT, c0 - .02, BLEN + .02, HT + PH, c0 + .18, M.wall); LB(-.02, HT, c1 - .18, BLEN + .02, HT + PH, c1 + .02, M.wall);
    LB(-.02, HT, c0, .18, HT + PH, c1, M.wall); LB(BLEN - .18, HT, c0, BLEN + .02, HT + PH, c1, M.wall);
    LB(-.05, HT + PH, c0 - .05, BLEN + .05, HT + PH + .07, c0 + .21, M.wallDark, NC); LB(-.05, HT + PH, c1 - .21, BLEN + .05, HT + PH + .07, c1 + .05, M.wallDark, NC);
    LB(-.05, HT + PH, c0 + .21, .21, HT + PH + .07, c1 - .21, M.wallDark, NC); LB(BLEN - .21, HT + PH, c0 + .21, BLEN + .05, HT + PH + .07, c1 - .21, M.wallDark, NC);
    for (const a of [UNIT, 2 * UNIT, 3 * UNIT]) LB(a - .08, HT, c0 + .18, a + .08, HT + .45, c1 - .18, M.wall, NC);
  }
  // gardens do térreo: calçadinha junto à parede, grama até 1,90 m, mureta com gradil na borda e nas divisas
  const GD = 2.0, PAV = .6;
  ROWS.forEach(([c0, c1], row) => {
    const cf = row === 0 ? c0 : c1, out = row === 0 ? -1 : 1;
    const band = (d0, d1) => out < 0 ? [cf - d1, cf - d0] : [cf + d0, cf + d1];
    { const [q0, q1] = band(0, PAV); LB(0, 0, q0, BLEN, .07, q1, M.paving, NC); }
    { const [q0, q1] = band(0, 3.3), [x0, z0] = toLot(-.5, q0), [x1, z1] = toLot(BLEN + .5, q1); occ(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)); }
    const fence = (a0, a1, e0, e1) => {   // mureta de 30 cm + gradil até 1,10 m
      LB(a0, 0, e0, a1, .3, e1, M.wall, NC);
      const m = (e0 + e1) / 2, w = Math.abs(a1 - a0) > Math.abs(e1 - e0);
      if (w) LB(a0, .3, m - .01, a1, 1.1, m + .01, M.railing, NC); else LB((a0 + a1) / 2 - .01, .3, e0, (a0 + a1) / 2 + .01, 1.1, e1, M.railing, NC);
    };
    for (let u = 0; u < 4; u++) {
      if (!hasGarden(b, row, u)) continue;
      const a0 = u * UNIT, a1 = a0 + UNIT, [g0, g1] = band(0, GD), [e0, e1] = band(GD - .08, GD + .08);
      fence(a0, a1, e0, e1);
      fence(a0 - .07, a0 + .07, g0, g1);
      if (u === 3 || !hasGarden(b, row, u + 1)) fence(a1 - .07, a1 + .07, g0, g1);
      const [x0, z0] = toLot(a0, g0), [x1, z1] = toLot(a1, g1); addColl(x0, z0, x1, z1);
      // umas plantas em alguns gardens
      for (let i = 0; i < 2; i++) if (R() < .45) {
        const [px, pz] = toLot(a0 + .6 + R() * (UNIT - 1.2), cf + out * (GD - .45));
        SP(px, .3, pz, .3 + R() * .2, R() < .25 ? M.leafPink : M.leafDark, { ico: true, sy: .8 });
      }
    }
  });
  // arandelas nas pontas da faixa de entrada
  for (const a of [-.12, BLEN + .02]) for (const c of [ROW - .45, ROW + COR + .3]) {
    LB(a, 2.1, c, a + .1, 2.35, c + .15, M.bulb, NC);
    const [lx, lz] = toLot(a, c); LAMPS.push({ x: lx, y: 2.1, z: lz, small: true });
  }
  // colisão: fileiras e núcleos
  for (const [c0, c1] of ROWS) { const [ax, az] = toLot(0, c0), [bx, bz] = toLot(BLEN, c1); addColl(ax, az, bx, bz); }
  { const [ax, az] = toLot(CORES[0][0], ROW), [bx, bz] = toLot(CORES[1][1], ROW + COR); addColl(ax, az, bx, bz); }   // núcleos + vão do meio
}

// ---------- caminhos principais ----------
function genPaths() {
  const P = (x0, z0, x1, z1) => { flat(x0, z0, x1, z1, M.paving, .05); occ(x0, z0, x1, z1); };
  P(2, 34, 5, 75); P(2, 89, 5, 127); P(0, 89, 2, 91);
  P(2, 34, 32, 36);
  P(77, 3, 79, 106); P(75, 106, 77, 127);
  P(58, 5, 79, 7); P(58, 5, 60, 75);
  P(75, 105, 79, 107); P(38, 89, 43, 125);
}
