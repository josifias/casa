// ============================================================
// 03 · HELPERS — caixas, cilindros, placas, colisão e fusão de geometrias
// ============================================================
let CUR = null;
const COLL = [];              // caixas 2D de colisão [x0, z0, x1, z1]
const LAMPS = [];             // cabeças de poste {x, y, z} (luz noturna)
function within(group, fn) { const p = CUR; CUR = group; fn(); CUR = p; }
function addColl(x0, z0, x1, z1) { COLL.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]); }

function projectUV(geom, mat) {
  const map = mat && mat.map;
  if (!map || mat.userData.noProject || !geom.attributes.uv) return geom;
  const s = map.userData.uv || 1;
  const p = geom.attributes.position, n = geom.attributes.normal, uv = geom.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv.setXY(i, u / s, v / s);
  }
  uv.needsUpdate = true;
  return geom;
}
function addMesh(geom, mat, o = {}) {
  const m = new THREE.Mesh(geom, mat);
  m.castShadow = o.cast ?? true; m.receiveShadow = o.receive ?? true;
  (o.parent || CUR).add(m);
  return m;
}
function B(x0, y0, z0, x1, y1, z1, mat, o = {}) {
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  projectUV(g, mat);
  return addMesh(g, mat, o);
}
function RB(x0, y0, z0, x1, y1, z1, r, mat, o = {}) {
  const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), d = Math.abs(z1 - z0);
  const rr = Math.max(.002, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001));
  const g = new RoundedBoxGeometry(w, h, d, o.seg ?? 2, rr);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  projectUV(g, mat);
  return addMesh(g, mat, o);
}
function CY(x, y0, z, r, y1, mat, o = {}) {
  const g = new THREE.CylinderGeometry(o.rTop ?? r, r, Math.abs(y1 - y0), o.seg ?? 16, 1, o.open ?? false);
  if (o.sx || o.sz) g.scale(o.sx ?? 1, 1, o.sz ?? 1);
  g.translate(x, (y0 + y1) / 2, z);
  projectUV(g, mat);
  return addMesh(g, mat, o);
}
function SP(x, y, z, r, mat, o = {}) {
  const g = o.ico ? new THREE.IcosahedronGeometry(r, o.detail ?? 1) : new THREE.SphereGeometry(r, o.seg ?? 14, o.seg2 ?? 10);
  if (o.sx || o.sy || o.sz) g.scale(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
  g.translate(x, y, z);
  return addMesh(g, mat, o);
}
const _up = new THREE.Vector3(0, 1, 0);
function rod(a, b, r, mat, o = {}) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const g = new THREE.CylinderGeometry(o.r2 ?? r, r, va.distanceTo(vb), o.seg ?? 8);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(_up, vb.clone().sub(va).normalize()));
  const mid = va.add(vb).multiplyScalar(.5);
  g.translate(mid.x, mid.y, mid.z);
  return addMesh(g, mat, o);
}
function G(x = 0, y = 0, z = 0, ry = 0, parent = CUR) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g;
}
// placa com texto voltada para fora da face indicada
function SIGN(text, x, y, z, w, h, face, bg, fg) {
  const g = new THREE.PlaneGeometry(w, h);
  if (face === 'px') g.rotateY(Math.PI / 2); else if (face === 'nx') g.rotateY(-Math.PI / 2); else if (face === 'nz') g.rotateY(Math.PI);
  g.translate(x, y, z);
  return addMesh(g, signMat(text, bg, fg), { cast: false });
}
// poste com luminária (luz de verdade fica no "pool" do app)
function LAMP(x, z, h = 3.6) {
  CY(x, 0, z, .09, .25, M.concrete, { seg: 10 });
  CY(x, 0, z, .05, h, M.darkMetal, { seg: 8, rTop: .04 });
  CY(x, h, z, .22, h + .08, M.darkMetal, { seg: 12 });
  CY(x, h - .14, z, .17, h, M.bulb, { seg: 12, rTop: .2, cast: false });
  LAMPS.push({ x, y: h - .2, z });
  addColl(x - .15, z - .15, x + .15, z + .15);
}

// ---------- fusão de geometrias estáticas por material (menos draw calls) ----------
// cell > 0 separa também por quadrante do terreno, para o frustum culling continuar útil no passeio
function mergeGroup(group, cell = 0) {
  group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert();
  const buckets = new Map(), victims = [];
  group.traverse((o) => {
    if (!o.isMesh || o.userData.keep) return;
    const g = o.geometry.clone();
    if (!g.index) { const n = g.attributes.position.count, idx = n > 65535 ? new Uint32Array(n) : new Uint16Array(n); for (let i = 0; i < n; i++) idx[i] = i; g.setIndex(new THREE.BufferAttribute(idx, 1)); }
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    let key = o.material.uuid + '|' + o.castShadow + '|' + o.receiveShadow;
    if (cell) {
      g.computeBoundingBox();
      const bb = g.boundingBox, big = bb.max.x - bb.min.x > cell * 2 || bb.max.z - bb.min.z > cell * 2;
      key += big ? '|big' : '|' + Math.floor((bb.min.x + bb.max.x) / 2 / cell) + ',' + Math.floor((bb.min.z + bb.max.z) / 2 / cell);
    }
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, receive: o.receiveShadow, geoms: [] });
    buckets.get(key).geoms.push(g);
    victims.push(o);
  });
  // remove os originais de uma vez (remove() um a um é quadrático com milhares de filhos)
  for (const o of victims) { o.geometry.dispose(); o.userData.gone = true; }
  const prune = (node) => {
    const keep = [];
    for (const c of node.children) {
      if (c.userData.gone) { c.parent = null; continue; }
      prune(c);
      if (c.isGroup && !c.children.length) { c.parent = null; continue; }
      keep.push(c);
    }
    node.children = keep;
  };
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
