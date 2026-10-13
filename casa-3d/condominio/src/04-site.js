// ============================================================
// 04 · TERRENO — chão, ruas, vizinhança, muro, portaria e prédios
// ============================================================
const flat = (x0, z0, x1, z1, mat, top = .05) => B(x0, 0, z0, x1, top, z1, mat, { cast: false });

function genGround() {
  const far = new THREE.PlaneGeometry(2400, 2400); far.rotateX(-Math.PI / 2); far.translate(41, -.06, 65);
  addMesh(far, C('#5d7a43', 1), { cast: false });
  // com o entorno real, o gramado fica só dentro do terreno (ruas e quadras vêm do bairro.js)
  const [gx0, gz0, gx1, gz1] = BAIRRO ? [0, 0, LOT_W, LOT_D] : [XMIN - 2, ZMIN - 2, XMAX + 2, ZMAX + 2];
  const g = new THREE.PlaneGeometry(gx1 - gx0, gz1 - gz0);
  g.rotateX(-Math.PI / 2); g.translate((gx0 + gx1) / 2, 0, (gz0 + gz1) / 2);
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
// núcleos de escada de todos os blocos (preenchida em genBuilding; usada para entrar e subir)
const CORE_LIST = [];
// portas de vidro dos térreos com garden (zona logo em frente à metade aberta → entra no apartamento)
const GARDEN_DOORS = [];
// planta do núcleo, a partir da porta de entrada (s ao longo do prédio, t na largura de 2,80 m):
// hall da entrada s 0–1,6 · escada s 1,6–5,6 (lado t 1,2–2,8) · galeria t 0–1,2 · hall do fundo s 5,6–7,2
const CORE_ST0 = 1.6, CORE_ST1 = 5.6, CORE_GAL = 1.2, CORE_DOOR = [.7, 2.1];
const unitTag = (b, row, k, u) => `${b.id}:${row}:${k}:${u}`;
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
    // faixa escura da base só na casca externa (por dentro fica o piso dos apartamentos do térreo)
    LB(-.03, 0, c0 - .03, BLEN + .03, .45, c0, M.wallDark, NC); LB(-.03, 0, c1, BLEN + .03, .45, c1 + .03, M.wallDark, NC);
    LB(-.03, 0, c0, 0, .45, c1, M.wallDark, NC); LB(BLEN, 0, c0, BLEN + .03, .45, c1, M.wallDark, NC);
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
  // porta de vidro da sala no térreo com garden: uma folha recolhida sobre a outra (metade aberta, escura)
  const doorG = (face, a0, a1, y0, y1, openLow) => {
    const m = (a0 + a1) / 2, [o0, o1] = openLow ? [a0 + .04, m] : [m, a1 - .04], [g0, g1] = openLow ? [m, a1 - .04] : [a0 + .04, m];
    P(a0 - .06, y0 - .02, a1 + .06, y0 + .04, face, .07, M.frame); P(a0 - .06, y1 - .04, a1 + .06, y1 + .06, face, .07, M.frame);
    P(a0 - .06, y0 + .04, a0 + .04, y1 - .04, face, .07, M.frame); P(a1 - .04, y0 + .04, a1 + .06, y1 - .04, face, .07, M.frame);
    P(g0, y0 + .04, g1, y1 - .04, face, .075, M.glass, .07);
    P(m - .025, y0, m + .025, y1, face, .085, M.frame, .07);
    P(o0, y0 + .04, o1, y1 - .04, face, .012, C('#26231f', .9));
  };
  for (let k = 0; k < F; k++) {
    const yb = k * FLOOR_H;
    for (let u = 0; u < 4; u++) {
      const ua = u * UNIT, mir = u % 2 === 1;
      const span = (a0, a1) => mir ? [ua + UNIT - a1, ua + UNIT - a0] : [ua + a0, ua + a1];
      for (const [outer, row] of [[FACES[0], 0], [FACES[3], 1]]) {
        TAG = unitTag(b, row, k, u);   // janelas da unidade (somem quando o visitante está dentro dela)
        const litSala = R() < .35, porta = k === 0 && hasGarden(b, row, u);
        for (const [a0, a1, sala] of [[.7, 1.9, 0], [3.0, 4.55, 1], [5.7, 6.9, 0]]) {
          const [p0, p1] = span(a0, a1);
          if (sala && porta) doorG(outer, p0, p1, yb + .15, yb + 2.2, !mir);
          else win(outer, p0, p1, yb + 1, yb + 2.2, sala ? litSala : R() < .3);
        }
      }
      [FACES[1], FACES[2]].forEach((inner, row) => { TAG = unitTag(b, row, k, u); const [s0, s1] = span(.37, 1.38); win(inner, s0, s1, yb + 1.5, yb + 2.1, false); });
      TAG = null;
    }
  }
  // faixa central: piso das entradas, cascalho no vão do meio e núcleos de escada
  const mid = ROW + COR / 2, NH = HT + .35;
  const stripFlat = (a0, a1, mat, top) => { const [x0, z0] = toLot(a0, ROW), [x1, z1] = toLot(a1, ROW + COR); flat(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), mat, top); };
  stripFlat(-2.6, CORES[0][0], M.paving, .06); stripFlat(CORES[1][1], BLEN + 2.6, M.paving, .06);
  stripFlat(CORES[0][1], CORES[1][0], M.gravel, .08);
  // janela numa parede transversal do núcleo (a constante), voltada para s = ±1
  const AT = (a, s, d0, d1) => s > 0 ? [a + d0, a + d1] : [a - d1, a - d0];
  // janelão da escada: moldura vazada e vidro transparente (de dentro do hall dá para ver lá fora)
  const winT = (a, s, w, y0, y1) => {
    const c0 = mid - w / 2, c1 = mid + w / 2;
    let [p, q] = AT(a, s, 0, .07);
    LB(p, y0 - .06, c0 - .06, q, y0 + .04, c1 + .06, M.frame, NC); LB(p, y1 - .04, c0 - .06, q, y1 + .06, c1 + .06, M.frame, NC);
    LB(p, y0 + .04, c0 - .06, q, y1 - .04, c0 + .04, M.frame, NC); LB(p, y0 + .04, c1 - .04, q, y1 - .04, c1 + .06, M.frame, NC);
    [p, q] = AT(a, s, .03, .036); LB(p, y0 + .04, c0 + .04, q, y1 - .04, c1 - .04, M.clearGlass, NC);
    [p, q] = AT(a, s, 0, .07); LB(p, y0 + .04, mid - .025, q, y1 - .04, mid + .025, M.frame, NC);
    [p, q] = AT(a, s, 0, .13); LB(p, y0 - .1, c0 - .1, q, y0 - .04, c1 + .1, M.white, NC);
  };
  // ---------- interior do núcleo: halls, galeria, escada, portas numeradas ----------
  function genCore(i, a0, a1) {
    const L = a1 - a0, aOf = (s) => i === 0 ? a0 + s : a1 - s;
    const S = (s0, y0, t0, s1, y1, t1, mat, o = NC) => LB(aOf(s0), y0, ROW + t0, aOf(s1), y1, ROW + t1, mat, o);
    const CAST = {}, W = .15, floorMat = C('#d9d3c9', .55), stairMat = C('#c9c3b8', .8);
    const toW = (s, t) => toLot(aOf(s), ROW + t);
    const toCore = (x, z) => { const a = HD ? x - r.x0 : z - r.z0, c = HD ? z - r.z0 : x - r.x0; return [i === 0 ? a - a0 : a1 - a, c - ROW]; };
    // paredes das pontas, com a porta (térreo) e os janelões de cada andar
    const endWall = (sA, sB, holes) => {
      const ys = [...new Set([0, NH, ...holes.flatMap((h) => [h[2], h[3]])])].sort((x, y) => x - y);
      for (let j = 0; j + 1 < ys.length; j++) {
        const y0 = ys[j], y1 = ys[j + 1], h = holes.find((q) => q[2] <= y0 && q[3] >= y1);
        if (h) { S(sA, y0, 0, sB, y1, h[0], M.wallGray, CAST); S(sA, y0, h[1], sB, y1, COR, M.wallGray, CAST); }
        else S(sA, y0, 0, sB, y1, COR, M.wallGray, CAST);
      }
    };
    const win = (k) => [.6, 2.2, k * FLOOR_H + .9, k * FLOOR_H + 2.3];
    endWall(0, W, [[CORE_DOOR[0], CORE_DOOR[1], 0, 2.3], ...Array.from({ length: F - 1 }, (_, k) => win(k + 1))]);
    endWall(L - W, L, Array.from({ length: F }, (_, k) => win(k)));
    S(0, HT, 0, L, NH, .12, M.wallGray, CAST); S(0, HT, COR - .12, L, NH, COR, M.wallGray, CAST);
    S(W, HT - .2, 0, L - W, HT, COR, M.white, CAST);                                   // forro do último andar
    const doors = [];
    for (let k = 0; k < F; k++) {
      const y = k * FLOOR_H, ceil = (k + 1) * FLOOR_H - .2;
      // pisos: hall da entrada, galeria e hall do fundo (no térreo também embaixo da escada)
      const parts = [[W, 0, CORE_ST0, COR], [CORE_ST0, 0, CORE_ST1, CORE_GAL], [CORE_ST1, 0, L - W, COR]];
      if (k === 0) parts.push([CORE_ST0, CORE_GAL, CORE_ST1, COR]);
      for (const [s0, t0, s1, t1] of parts) {
        if (k > 0) S(s0, y - .2, t0, s1, y - .02, t1, M.white, CAST);
        S(s0, k > 0 ? y - .02 : 0, t0, s1, y + .02, t1, floorMat, { cast: false });
      }
      // guarda-corpo da galeria (e nas bordas do vão da escada no térreo e no último andar)
      S(CORE_ST0, y + .02, CORE_GAL - .01, CORE_ST1, y + .95, CORE_GAL + .01, M.railing);
      S(CORE_ST0, y + .95, CORE_GAL - .03, CORE_ST1, y + 1.0, CORE_GAL + .03, M.darkMetal);
      for (const sp of [CORE_ST0, (CORE_ST0 + CORE_ST1) / 2, CORE_ST1]) S(sp - .02, y + .02, CORE_GAL - .02, sp + .02, y + .98, CORE_GAL + .02, M.darkMetal);
      const edge = k === F - 1 ? CORE_ST0 : k === 0 ? CORE_ST1 : null;
      if (edge) { S(edge - .01, y + .02, CORE_GAL, edge + .01, y + .95, COR, M.railing); S(edge - .03, y + .95, CORE_GAL, edge + .03, y + 1.0, COR, M.darkMetal); }
      // luminárias e placa do andar
      for (const sc of [.8, L - .8]) S(sc - .25, ceil - .03, 1.15, sc + .25, ceil, 1.65, M.bulb);
      { const [px, pz] = toW((CORE_ST0 + CORE_ST1) / 2, .012); SIGN(k === 0 ? 'TÉRREO' : `${k + 1}º PAVIMENTO`, px, y + 1.75, pz, .9, .22, HD ? 'pz' : 'px', '#2b2b2e', '#ffffff'); }
      // portas dos 4 apartamentos do andar, com o número
      for (const [s0, s1, uIdx] of [[.4, 1.2, i === 0 ? 0 : 3], [6.0, 6.8, i === 0 ? 1 : 2]]) for (const row of [0, 1]) {
        const tw = row === 0 ? [0, .03] : [COR - .03, COR], tl = row === 0 ? [.03, .06] : [COR - .06, COR - .03];
        S(s0 - .06, y + .02, tw[0], s1 + .06, y + 2.18, tw[1], M.frame);
        S(s0, y + .03, tl[0], s1, y + 2.12, tl[1], M.door);
        const kn = uIdx % 2 ? s0 + .1 : s1 - .1;
        S(kn - .05, y + 1.0, row === 0 ? .06 : COR - .09, kn + .05, y + 1.04, row === 0 ? .09 : COR - .06, M.metal);
        const num = (k + 1) * 100 + UNIT_NUM[b.dir][row][uIdx];
        const [px, pz] = toW((s0 + s1) / 2, row === 0 ? .065 : COR - .065);
        SIGN(String(num), px, y + 2.36, pz, .4, .1, HD ? (row === 0 ? 'pz' : 'nz') : (row === 0 ? 'px' : 'nx'), '#2b2b2e', '#ffffff');
        doors.push({ k, s0, s1, row, u: uIdx, num });
      }
      // lance da escada até o próximo andar: 16 degraus de 17,5 cm (sobe do hall da entrada ao hall do fundo)
      if (k < F - 1) {
        for (let j = 0; j < 16; j++) {
          const sa = CORE_ST0 + j * .25, top = y + (j + 1) * .175;
          S(sa, top - .32, CORE_GAL + .04, sa + .25, top, COR, stairMat, CAST);
        }
        for (const tr of [COR - .07, CORE_GAL + .08]) {
          const [x0, z0] = toW(CORE_ST0, tr), [x1, z1] = toW(CORE_ST1, tr);
          rod([x0, y + .92, z0], [x1, y + FLOOR_H + .92, z1], .022, M.darkMetal, NC);
        }
        for (const sp of [CORE_ST0 + .15, (CORE_ST0 + CORE_ST1) / 2, CORE_ST1 - .15]) {
          const top = y + FLOOR_H * (sp - CORE_ST0) / (CORE_ST1 - CORE_ST0), [x, z] = toW(sp, CORE_GAL + .08);
          rod([x, top, z], [x, top + .92, z], .015, M.darkMetal, NC);
        }
      }
    }
    CORE_LIST.push({ b, i, block: b.blocks[i], L, F, toW, toCore, doors, out: toW(-2.2, COR / 2) });
  }

  CORES.forEach(([a0, a1], i) => {
    genCore(i, a0, a1);
    LB(a0 - .05, NH, ROW, a1 + .05, NH + .1, ROW + COR, M.roof);
    // janelão da escada em cada andar, nas duas paredes de ponta do núcleo
    const out = i === 0 ? [a0, -1] : [a1, 1], inn = i === 0 ? [a1, 1] : [a0, -1];
    for (let k = 0; k < F; k++) {
      winT(inn[0], inn[1], 1.6, k * FLOOR_H + .9, k * FLOOR_H + 2.3);
      if (k > 0) winT(out[0], out[1], 1.6, k * FLOOR_H + .9, k * FLOOR_H + 2.3);
    }
    // entrada do bloco: porta de vidro, marquise com luminária e placa
    const [e, s1] = out;
    // batentes e verga da porta (aberta: as folhas de vidro ficam recolhidas por dentro, nas laterais)
    let [p, q] = AT(e, s1, 0, .06);
    LB(p, 0, mid - .76, q, 2.36, mid - .7, M.darkMetal, NC); LB(p, 0, mid + .7, q, 2.36, mid + .76, M.darkMetal, NC); LB(p, 2.3, mid - .76, q, 2.36, mid + .76, M.darkMetal, NC);
    [p, q] = AT(e, s1, -.24, -.2); LB(p, .02, ROW + .02, q, 2.28, mid - .72, M.clearGlass, NC); LB(p, .02, mid + .72, q, 2.28, ROW + COR - .02, M.clearGlass, NC);
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
    const collA = (a0, c0, a1, c1) => { const [x0, z0] = toLot(a0, c0), [x1, z1] = toLot(a1, c1); addColl(x0, z0, x1, z1); };
    for (let u = 0; u < 4; u++) {
      if (!hasGarden(b, row, u)) continue;
      const a0 = u * UNIT, a1 = a0 + UNIT, mir = u % 2 === 1, [g0, g1] = band(0, GD), [e0, e1] = band(GD - .08, GD + .08);
      // cercado fechado: o garden é privativo, só se chega a ele pela porta de vidro da sala
      fence(a0, a1, e0, e1); collA(a0, e0, a1, e1);
      // divisas com os vizinhos
      fence(a0 - .07, a0 + .07, g0, g1); collA(a0 - .07, g0, a0 + .07, g1);
      if (u === 3 || !hasGarden(b, row, u + 1)) { fence(a1 - .07, a1 + .07, g0, g1); collA(a1 - .07, g0, a1 + .07, g1); }
      // zona em frente à metade aberta da porta da sala: entrando nela, o visitante entra no apartamento
      const [oa0, oa1] = mir ? [a0 + 3.825, a0 + 4.555] : [a0 + 3.045, a0 + 3.755];
      { const [x0, z0] = toLot(oa0 + .1, cf), [x1, z1] = toLot(oa1 - .1, cf + out * .6);
        GARDEN_DOORS.push({ block: b.blocks[u < 2 ? 0 : 1], num: 100 + UNIT_NUM[b.dir][row][u], x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1),
          // pontos para os testes: fora do cercado, no meio do garden e em frente à porta
          path: [toLot((oa0 + oa1) / 2, cf + out * (GD + 1.2)), toLot(a0 + UNIT / 2, cf + out * 1.3), toLot((oa0 + oa1) / 2, cf + out * .9)] }); }
      // umas plantas em alguns gardens (longe da porta da sala)
      for (let i = 0; i < 2; i++) if (R() < .45) {
        const pa = a0 + .6 + R() * (UNIT - 1.2);
        if (Math.abs(pa - (oa0 + oa1) / 2) < 1.2 || Math.abs(pa - (a0 + UNIT / 2)) < .5) continue;
        const [px, pz] = toLot(pa, cf + out * (GD - .45));
        SP(px, .3, pz, .3 + R() * .2, R() < .25 ? M.leafPink : M.leafDark, { ico: true, sy: .8 });
        addColl(px - .3, pz - .3, px + .3, pz + .3);
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
