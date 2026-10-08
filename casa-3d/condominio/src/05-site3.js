// ============================================================
// 05 · ENTORNO — ruas, calçadas, quadras e casas reais em volta do condomínio
// ============================================================
// Dados de condominio/bairro.js, gerados a partir do OpenStreetMap (© colaboradores do OSM, ODbL):
// três quarteirões para cada lado, alinhados ao terreno do modelo. O visitante anda pelas ruas e
// calçadas; as quadras (casas, condomínios fechados, lagoa) não são caminháveis.
const BAIRRO = window.BAIRRO || null;
const BLOCK_POLYS = [];
const BAIRRO_GROUP = new THREE.Group();

function decRing(a) {
  const out = new Array(a.length);
  let x = 0, z = 0;
  for (let i = 0; i < a.length; i += 2) { x += a[i]; z += a[i + 1]; out[i] = x / 10; out[i + 1] = z / 10; }
  return out;
}
// ponto dentro do polígono (anéis [x, z, ...], furos pela regra par-ímpar)
function inRings(rings, x, z) {
  let inside = false;
  for (const r of rings) for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i], zi = r[i + 1], xj = r[j], zj = r[j + 1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function inBlock(x, z) {
  for (const b of BLOCK_POLYS) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && inRings(b.rings, x, z)) return true;
  return false;
}

// ---------- montagem direta em buffers (sem um Mesh por objeto) ----------
class GBuf {
  constructor(colors = false) { this.p = []; this.n = []; this.uv = []; this.c = colors ? [] : null; }
  tri(a, b, c, n, col) {   // a, b, c = [x, y, z, u, v]; acerta o sentido para a face apontar para n
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    if ((uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2] < 0) { const t = b; b = c; c = t; }
    for (const q of [a, b, c]) {
      this.p.push(q[0], q[1], q[2]); this.n.push(n[0], n[1], n[2]); this.uv.push(q[3], q[4]);
      if (this.c) this.c.push(col.r, col.g, col.b);
    }
  }
  quad(a, b, c, d, n, col) { this.tri(a, b, c, n, col); this.tri(a, c, d, n, col); }
  mesh(mat, parent, o = {}) {
    if (!this.p.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.c) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = o.cast ?? true; m.receiveShadow = o.receive ?? true; m.userData.keep = true;
    parent.add(m);
    return m;
  }
}
const UP = [0, 1, 0];
function faceNormal(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  const l = Math.hypot(...n) || 1; n = n.map((v) => v / l);
  return n[1] < 0 ? n.map((v) => -v) : n;
}
function fillRings(gb, rings, y, uvs, col) {
  const V = (r) => { const a = []; for (let i = 0; i < r.length; i += 2) a.push(new THREE.Vector2(r[i], r[i + 1])); return a; };
  const contour = V(rings[0]), holes = rings.slice(1).map(V), all = contour.concat(...holes);
  for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(contour, holes)) {
    const a = all[i], b = all[j], c = all[k];
    gb.tri([a.x, y, a.y, a.x / uvs, a.y / uvs], [b.x, y, b.y, b.x / uvs, b.y / uvs], [c.x, y, c.y, c.x / uvs, c.y / uvs], UP, col);
  }
}
// caixa orientada ao longo de um segmento (muros, portões, braços de poste)
function oboxBuf(gb, x0, z0, x1, z1, y0, y1, t, col, uvs = 1) {
  const L = Math.hypot(x1 - x0, z1 - z0) || 1e-3, dx = (x1 - x0) / L, dz = (z1 - z0) / L, px = -dz * t / 2, pz = dx * t / 2;
  const P = [[x0 + px, z0 + pz], [x1 + px, z1 + pz], [x1 - px, z1 - pz], [x0 - px, z0 - pz]];
  const s = (i, y, u) => [P[i][0], y, P[i][1], u / uvs, y / uvs];
  gb.quad(s(0, y0, 0), s(1, y0, L), s(1, y1, L), s(0, y1, 0), [-dz, 0, dx], col);
  gb.quad(s(3, y0, 0), s(2, y0, L), s(2, y1, L), s(3, y1, 0), [dz, 0, -dx], col);
  gb.quad(s(1, y0, 0), s(2, y0, t), s(2, y1, t), s(1, y1, 0), [dx, 0, dz], col);
  gb.quad(s(0, y0, 0), s(3, y0, t), s(3, y1, t), s(0, y1, 0), [-dx, 0, -dz], col);
  const top = (i, u, v) => [P[i][0], y1, P[i][1], u / uvs, v / uvs];
  gb.quad(top(0, 0, 0), top(1, L, 0), top(2, L, t), top(3, 0, t), UP, col);
}
// prisma vertical afinando (postes)
function prismBuf(gb, x, z, r0, r1, y0, y1, sides, col) {
  for (let i = 0; i < sides; i++) {
    const a0 = i / sides * Math.PI * 2, a1 = (i + 1) / sides * Math.PI * 2, am = (a0 + a1) / 2;
    const p = (a, r, y) => [x + Math.cos(a) * r, y, z + Math.sin(a) * r, a, y];
    gb.quad(p(a0, r0, y0), p(a1, r0, y0), p(a1, r1, y1), p(a0, r1, y1), [Math.cos(am), 0, Math.sin(am)], col);
  }
}

// ---------- texturas do entorno ----------
function bairroTextures() {
  // fachada: 16 m × 6 m (2 andares, 4 janelas por andar); cor vem da cor de cada casa
  const win = (g, lit) => {
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) {
      const x = 128 + 256 * k - 45, yb = (r + 1) * 192 - 64, yt = yb - 70;
      if (lit) { if ((k * 7 + r * 3 + k * r) % 5 < 2) { g.fillStyle = '#ffd08f'; g.fillRect(x + 6, yt + 6, 78, 58); } continue; }
      g.fillStyle = '#fbfbf8'; g.fillRect(x, yt, 90, 70);
      const gr = g.createLinearGradient(0, yt, 0, yb); gr.addColorStop(0, '#53687a'); gr.addColorStop(1, '#2e3b46');
      g.fillStyle = gr; g.fillRect(x + 6, yt + 6, 78, 58);
      g.fillStyle = '#fbfbf8'; g.fillRect(x + 42, yt + 6, 5, 58);
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x - 6, yb, 102, 6);
    }
  };
  TX.facade = canvasTex(1024, 384, (g, w, h) => {
    const R = rng(31); g.fillStyle = '#f6f4ef'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, R, 9000, ['#eceae4', '#fbfaf6'], 1, 3, .7);
    g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, 189, w, 4); g.fillRect(0, 381, w, 3);
    win(g, false);
  }, 1);
  TX.facadeLit = canvasTex(1024, 384, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); win(g, true); }, 1);
  // telha cerâmica (tom vem da cor do telhado)
  TX.tile = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      const gr = g.createLinearGradient(0, y, 0, y + 32); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.8, '#d9d9d9'); gr.addColorStop(1, '#9c9c9c');
      g.fillStyle = gr; g.fillRect(0, y, w, 32);
      g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = (y / 32) % 2 ? 16 : 0; x < w; x += 32) g.fillRect(x, y, 2, 32);
    }
  }, 2);
}

// ---------- montagem ----------
function genBairro(R) {
  if (!BAIRRO) return;
  const D = BAIRRO;
  bairroTextures();
  M.facade = std({ map: TX.facade, vertexColors: true, roughness: .95, emissive: '#ffffff', emissiveMap: TX.facadeLit, emissiveIntensity: 0 });
  const roofTile = std({ map: TX.tile, vertexColors: true, roughness: .85, side: THREE.DoubleSide });
  const roofFlat = std({ map: TX.plaster, vertexColors: true, roughness: .95 });
  const muro = std({ map: TX.plaster, vertexColors: true, roughness: .95 });
  const quintal = std({ map: TX.grass, color: '#c9bf9b', roughness: 1 });   // quintais: grama seca e terra
  const lagoa = std({ map: TX.water, color: '#6f9a6a', roughness: .35, metalness: .05 });   // lagoa tomada por aguapé
  const lines = std({ vertexColors: true, roughness: .7 });
  const concrete = C('#a19e97', .9), tankMat = C('#2f6db5', .5);
  const col = (h) => new THREE.Color(h);
  const W = col('#ffffff');

  // pedaços por região (para o celular não desenhar o bairro inteiro em cada quadro)
  const buckets = new Map(), CELL = 180;
  const bk = (name, mat, x, z, colors = true, o = {}) => {
    const key = name + '|' + Math.floor(x / CELL) + ',' + Math.floor(z / CELL);
    if (!buckets.has(key)) buckets.set(key, { gb: new GBuf(colors), mat, o });
    return buckets.get(key).gb;
  };
  const one = (name, mat, colors = false, o = {}) => bk(name, mat, 0, 0, colors, o);

  // chão: asfalto, terra, calçada (com meio-fio), quadras, água e gramados
  for (const p of D.asph) fillRings(one('asph', M.asphalt, false, { cast: false }), p.map(decRing), .03, M.asphalt.map.userData.uv, W);
  for (const p of D.dirt) fillRings(one('dirt', M.dirt, false, { cast: false }), p.map(decRing), .035, M.dirt.map.userData.uv, W);
  const curb = one('curb', C('#b9b6ae', .9), false, { cast: false });
  for (const p of D.walk) {
    const rings = p.map(decRing);
    fillRings(one('walk', M.sidewalk, false, { cast: false }), rings, .15, M.sidewalk.map.userData.uv, W);
    for (const r of rings) for (let i = 0; i < r.length; i += 2) {   // meio-fio: face voltada para fora da calçada
      const j = (i + 2) % r.length, x0 = r[i], z0 = r[i + 1], x1 = r[j], z1 = r[j + 1], L = Math.hypot(x1 - x0, z1 - z0);
      if (L < 1e-3) continue;
      curb.quad([x0, 0, z0, 0, 0], [x1, 0, z1, L, 0], [x1, .15, z1, L, .15], [x0, .15, z0, 0, .15], [(z1 - z0) / L, 0, -(x1 - x0) / L], W);
    }
  }
  for (const [green, p] of D.blocks) {
    const rings = p.map(decRing);
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
    for (let i = 0; i < rings[0].length; i += 2) { x0 = Math.min(x0, rings[0][i]); x1 = Math.max(x1, rings[0][i]); z0 = Math.min(z0, rings[0][i + 1]); z1 = Math.max(z1, rings[0][i + 1]); }
    BLOCK_POLYS.push({ rings, x0, z0, x1, z1 });
    fillRings(green ? one('blkG', M.grass, false, { cast: false }) : one('blk', quintal, false, { cast: false }), rings, .16, M.grass.map.userData.uv, W);
  }
  for (const p of D.nowalk || []) {   // ruas que só se ligam ao resto por fora da área modelada
    const rings = p.map(decRing); let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
    for (let i = 0; i < rings[0].length; i += 2) { x0 = Math.min(x0, rings[0][i]); x1 = Math.max(x1, rings[0][i]); z0 = Math.min(z0, rings[0][i + 1]); z1 = Math.max(z1, rings[0][i + 1]); }
    BLOCK_POLYS.push({ rings, x0, z0, x1, z1 });
  }
  for (const p of D.green) fillRings(one('green', M.grass, false, { cast: false }), p.map(decRing), .17, M.grass.map.userData.uv, W);
  for (const p of D.paving) fillRings(one('pav', M.paving, false, { cast: false }), p.map(decRing), .175, M.paving.map.userData.uv, W);
  for (const p of D.water) fillRings(one('water', lagoa, false, { cast: false }), p.map(decRing), .2, M.water.map.userData.uv, W);
  // faixas centrais
  const yellow = col('#e3bf3a'), white = col('#f2f2ee');
  for (const [x0, z0, x1, z1, yl] of D.dash) {
    const L = Math.hypot(x1 - x0, z1 - z0) || 1, px = -(z1 - z0) / L * .07, pz = (x1 - x0) / L * .07;
    one('dash', lines, true, { cast: false }).quad([x0 + px, .045, z0 + pz, 0, 0], [x1 + px, .045, z1 + pz, 1, 0], [x1 - px, .045, z1 - pz, 1, 1], [x0 - px, .045, z0 - pz, 0, 1], UP, yl ? yellow : white);
  }

  // casas e prédios: paredes com fachada (janelas), telhado de telha ou laje com caixa d'água
  const pal = D.pal.map(col);
  const house = (r, h, fc, rcol, roof, tank) => {
    const y0 = .16, y1 = y0 + h;
    const gw = bk('fac', M.facade, r[0], r[1]);
    let s = 0;
    for (let i = 0; i < r.length; i += 2) {
      const j = (i + 2) % r.length, x0 = r[i], z0 = r[i + 1], x1 = r[j], z1 = r[j + 1], L = Math.hypot(x1 - x0, z1 - z0);
      if (L < 1e-3) continue;
      const u0 = s / 16, u1 = (s + L) / 16, v1 = h / 6;
      gw.quad([x0, y0, z0, u0, 0], [x1, y0, z1, u1, 0], [x1, y1, z1, u1, v1], [x0, y1, z0, u0, v1], [(z1 - z0) / L, 0, -(x1 - x0) / L], fc);
      s += L;
    }
    if (roof) {
      const [cx, cz, a, Lr, Wr] = roof, ux = Math.cos(a), uz = Math.sin(a), vx = -uz, vz = ux;
      const hl = Lr / 2 + .3, hw = Wr / 2 + .3, rl = Math.max(hl - hw, .01), rh = hw * .5;
      const E = (su, sv) => [cx + ux * hl * su + vx * hw * sv, y1, cz + uz * hl * su + vz * hw * sv];
      const Rp = (su) => [cx + ux * rl * su, y1 + rh, cz + uz * rl * su];
      const uvp = (p) => [...p, (p[0] * ux + p[2] * uz) / 2, (p[0] * vx + p[2] * vz) / 2 + p[1] / 2];
      const gr = bk('tile', roofTile, cx, cz);
      const faces = [[E(-1, 1), E(1, 1), Rp(1), Rp(-1)], [E(1, -1), E(-1, -1), Rp(-1), Rp(1)], [E(1, 1), E(1, -1), Rp(1)], [E(-1, -1), E(-1, 1), Rp(-1)]];
      for (const f of faces) {
        const n = faceNormal(f[0], f[1], f[2]), q = f.map(uvp);
        if (q.length === 4) gr.quad(q[0], q[1], q[2], q[3], n, rcol); else gr.tri(q[0], q[1], q[2], n, rcol);
      }
    } else {
      fillRings(bk('flat', roofFlat, r[0], r[1]), [r], y1, 3, rcol);
      if (tank) oboxBuf(bk('tank', tankMat, tank[0], tank[1], false), tank[0] - .65, tank[1], tank[0] + .65, tank[1], y1, y1 + 1.05, 1.3, W);
    }
  };
  for (const [enc, h, ci, rc, roof, tank] of D.bld) house(decRing(enc), h, pal[ci], col(rc), roof, tank);
  // casas ilustrativas onde o OpenStreetMap não tem construção mapeada
  const rcs = D.rcs.map(col);
  for (const [cx, cz, a, w, d, h, ci, ri, hip, tk] of D.fill) {
    const ux = Math.cos(a), uz = Math.sin(a), nx = -uz, nz = ux, hw = w / 2, hd = d / 2;
    const r = [cx - ux * hw - nx * hd, cz - uz * hw - nz * hd, cx + ux * hw - nx * hd, cz + uz * hw - nz * hd, cx + ux * hw + nx * hd, cz + uz * hw + nz * hd, cx - ux * hw + nx * hd, cz - uz * hw + nz * hd];
    const roof = hip ? (w >= d ? [cx, cz, a, w, d] : [cx, cz, a + Math.PI / 2, d, w]) : null;
    house(r, h, pal[ci], rcs[ri], roof, !hip && tk ? [cx, cz] : null);
  }

  // muros, portões e gradis no alinhamento das quadras
  const dark = col('#3b3d41');
  for (const [x0, z0, x1, z1, kind, ci] of D.walls) {
    const gm = bk('muro', muro, x0, z0), c = pal[ci].clone().multiplyScalar(.93);
    if (kind === 0) oboxBuf(gm, x0, z0, x1, z1, .16, 2.3, .15, c, 1.6);
    else if (kind === 1) oboxBuf(gm, x0, z0, x1, z1, .16, 2.2, .07, dark, 1.6);
    else {
      oboxBuf(gm, x0, z0, x1, z1, .16, .75, .15, c, 1.6);
      const L = Math.hypot(x1 - x0, z1 - z0), gb = bk('bars', M.bars, x0, z0, false, { cast: false });
      const nz = (x1 - x0) / L, nx = -(z1 - z0) / L;
      gb.quad([x0, .75, z0, 0, 0], [x1, .75, z1, L, 0], [x1, 2.15, z1, L, 1.4], [x0, 2.15, z0, 0, 1.4], [nx, 0, nz], W);
    }
    if (kind !== 0) for (const [px, pz] of [[x0, z0], [x1, z1]]) oboxBuf(gm, px - .16, pz, px + .16, pz, .16, 2.45, .32, c, 1.6);
  }

  // postes de concreto com luminária e fiação
  const PH = 9;
  for (const [x, z, nx, nz] of D.poles) {
    const gp = bk('pole', concrete, x, z, false);
    prismBuf(gp, x, z, .15, .09, 0, PH, 6, W);
    oboxBuf(gp, x - nx * .7, z - nz * .7, x + nx * .7, z + nz * .7, PH - .35, PH - .25, .1, W);   // cruzeta (atravessada na via)
    oboxBuf(gp, x, z, x + nx * 1.7, z + nz * 1.7, 7.9, 8.0, .08, W);                              // braço da luminária
    const lx = x + nx * 1.75, lz = z + nz * 1.75;
    oboxBuf(bk('bulb', M.bulb, x, z, false, { cast: false }), lx - nx * .3, lz - nz * .3, lx + nx * .3, lz + nz * .3, 7.82, 7.92, .22, W);
    LAMPS.push({ x: lx, y: 7.7, z: lz });
    addColl(x - .2, z - .2, x + .2, z + .2);
  }
  const wp = [];
  for (const run of D.runs) for (let k = 0; k + 1 < run.length; k++) {
    const a = D.poles[run[k]], b = D.poles[run[k + 1]];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 45) continue;
    for (const [off, hgt] of [[-.6, PH - .3], [0, PH - .3], [.6, PH - .3], [0, PH - 1.4]]) {
      const ax = a[0] + a[2] * off, az = a[1] + a[3] * off, bx = b[0] + b[2] * off, bz = b[1] + b[3] * off;
      let prev = null;
      for (let i = 0; i <= 6; i++) {
        const t = i / 6, p = [ax + (bx - ax) * t, hgt - .55 * 4 * t * (1 - t), az + (bz - az) * t];
        if (prev) wp.push(...prev, ...p);
        prev = p;
      }
    }
  }
  if (wp.length) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
    const wires = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#1c1c1e' }));
    wires.userData.keep = true; BAIRRO_GROUP.add(wires);
  }
  for (const b of buckets.values()) b.gb.mesh(b.mat, BAIRRO_GROUP, b.o);

  // árvores de calçada e das áreas verdes, carros estacionados (fundidos à parte, em células grandes)
  within(BAIRRO_GROUP, () => {
    const KIND = ['oak', 'ipe', 'mango', 'palm'];
    for (const [x, z, k] of D.trees) tree(x, z, KIND[k], R, true);
    for (const [x, z, ax, paint, flip, type] of D.cars) car(x, z, ax === 1, CAR_PAINT[paint % CAR_PAINT.length], flip === 1, ['hatch', 'sedan', 'suv'][type], R);
  });
}
