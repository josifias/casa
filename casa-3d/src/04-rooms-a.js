// ============================================================
// 04 · AMBIENTES (A) — sala, entrada, cozinha, área de serviço
// ============================================================
const LAMPS = [];   // luzes noturnas {pos, power, dist, style}
function LAMP(x, y, z, power = 1, dist = 4, style = null) { LAMPS.push({ pos: [x, y, z], power, dist, style }); }

// ---------- cadeiras de jantar (modelo olha para +z) ----------
function chairTour(x, z, ry) {
  const g = G(x, 0, z, ry);
  within(g, () => {
    for (const sx of [-1, 1]) {
      B(sx * .235 - .016, 0, .16, sx * .235 + .016, .64, .195, M.oak);      // perna/braço dianteiro
      B(sx * .235 - .016, 0, -.25, sx * .235 + .016, .90, -.215, M.oak);    // perna traseira
      B(sx * .235 - .016, .61, -.25, sx * .235 + .016, .645, .195, M.oak);  // braço
    }
    RB(-.215, .40, -.22, .215, .50, .21, .035, M.chairFabric);
    RB(-.215, .53, -.245, .215, .88, -.185, .03, M.chairFabric);
  });
}
function chairCane(x, z, ry) {
  const g = G(x, 0, z, ry);
  within(g, () => {
    for (const sx of [-1, 1]) {
      B(sx * .21 - .017, 0, .17, sx * .21 + .017, .44, .205, M.walnut);
      B(sx * .21 - .017, 0, -.24, sx * .21 + .017, .92, -.205, M.walnut);
    }
    B(-.23, .40, -.24, .23, .45, .21, M.walnut);
    RB(-.215, .45, -.2, .215, .52, .205, .025, M.chairFabric);
    B(-.23, .86, -.24, .23, .92, -.205, M.walnut);
    B(-.23, .52, -.24, .23, .56, -.205, M.walnut);
    B(-.195, .56, -.228, .195, .86, -.216, M.cane, { cast: false });
  });
}

function buildSala() {
  // ---- parede da TV (oeste, olhando +x) ----
  slats('x+', .02, .95, 0, 2.32, 2.50, .022, M.oak);
  B(2.52, .40, .04, 2.86, .60, .94, M.oak);
  addColl(2.50, .04, 2.88, .95);
  RB(2.53, .95, .05, 2.575, 1.58, .93, .01, M.black);
  B(2.575, .97, .07, 2.578, 1.56, .91, M.screen, { cast: false });
  PLANT(2.70, .60, .18, .70, M.potWhite, 4);
  B(2.60, .60, .60, 2.80, .635, .86, C('#e7dcc9'));
  B(2.62, .635, .63, 2.78, .665, .82, C('#9b4a2c'));
  SP(2.70, .70, .74, .035, M.brass);

  // ---- sofá (parede leste) ----
  RB(4.15, .10, .10, 4.88, .42, 1.66, .04, M.sofa);
  RB(4.64, .40, .12, 4.88, .86, 1.64, .06, M.sofa);
  RB(4.15, .10, .06, 4.88, .62, .21, .05, M.sofa);
  RB(4.15, .10, 1.55, 4.88, .62, 1.70, .05, M.sofa);
  RB(4.18, .40, .22, 4.66, .54, .87, .05, M.sofa);
  RB(4.18, .40, .89, 4.66, .54, 1.54, .05, M.sofa);
  for (const [x, z] of [[4.2, .15], [4.2, 1.62], [4.83, .15], [4.83, 1.62]]) CY(x, 0, z, .018, .10, M.black, { seg: 8 });
  PILLOW(4.52, .72, .46, .13, .40, .40, M.sofaPillow, 0, .15, .28);
  PILLOW(4.52, .72, 1.22, .13, .40, .40, M.sofaPillow, 0, -.12, .28);
  PILLOW(4.50, .68, 1.40, .12, .34, .30, M.sofa, 0, .3, .35);
  addColl(4.12, .06, 4.90, 1.70);
  B(3.05, 0, .10, 4.10, .012, 1.72, M.salaRug, { cast: false });
  ART('x-', .30, .78, 1.22, 1.80, 4.90, M.art1);
  ART('x-', .90, 1.38, 1.22, 1.80, 4.90, M.art2);

  // ---- mesa lateral ----
  CY(4.62, .49, 1.93, .20, .515, M.walnut);
  CY(4.62, 0, 1.93, .11, .012, M.blackMetal);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; rod([4.62 + Math.cos(a) * .11, .012, 1.93 + Math.sin(a) * .11], [4.62 + Math.cos(a + .6) * .19, .49, 1.93 + Math.sin(a + .6) * .19], .004, M.blackMetal, { cast: false }); }
  CY(4.60, .515, 1.92, .045, .70, M.glass, { rTop: .03, cast: false });
  PLANT(4.60, .66, 1.92, .45, M.potWhite, 12);
  addColl(4.40, 1.72, 4.90, 2.12);

  // ---- luminária de piso ----
  within(STYLE.tour, () => {
    CY(4.80, 0, 2.06, .12, .02, M.black);
    rod([4.80, .02, 2.06], [4.80, 1.40, 2.06], .011, M.black);
    rod([4.80, 1.40, 2.06], [4.64, 1.58, 1.86], .009, M.black);
    const shade = new THREE.ConeGeometry(.11, .22, 20, 1, true);
    shade.rotateX(Math.PI); shade.rotateZ(-.7); shade.translate(4.60, 1.52, 1.82);
    addMesh(shade, M.black);
    SP(4.60, 1.47, 1.82, .03, M.bulb, { cast: false });
    LAMP(4.58, 1.40, 1.78, .9, 3.5, 'tour');
  });
  within(STYLE.fotos, () => {
    CY(4.80, 0, 2.06, .12, .015, M.steel);
    rod([4.80, .015, 2.06], [4.80, 1.62, 2.06], .01, M.steel);
    CY(4.80, 1.36, 2.06, .018, 1.60, M.bulb, { cast: false });
    LAMP(4.72, 1.50, 2.00, .8, 3.5, 'fotos');
  });

  // ---- jantar ----
  const tx1 = 2.60, tx2 = 3.76, tz1 = 2.14, tz2 = 2.98, ty = .76;
  B(tx1, ty - .012, tz1, tx2, ty, tz2, M.glass, { cast: false, receive: false });
  addColl(2.58, 1.66, 3.74, 3.46);
  within(STYLE.tour, () => {
    for (const [x1, z1, x2, z2] of [[tx1 + .02, tz1 + .02, tx2 - .02, tz1 + .045], [tx1 + .02, tz2 - .045, tx2 - .02, tz2 - .02], [tx1 + .02, tz1 + .02, tx1 + .045, tz2 - .02], [tx2 - .045, tz1 + .02, tx2 - .02, tz2 - .02]]) B(x1, ty - .045, z1, x2, ty - .012, z2, M.brass);
    for (const [x, z] of [[tx1 + .02, tz1 + .02], [tx2 - .045, tz1 + .02], [tx1 + .02, tz2 - .045], [tx2 - .045, tz2 - .045]]) B(x, 0, z, x + .025, ty - .012, z + .025, M.brass);
    rod([tx1 + .05, ty - .03, tz1 + .05], [tx2 - .05, ty - .03, tz2 - .05], .008, M.brass);
    rod([tx1 + .05, ty - .03, tz2 - .05], [tx2 - .05, ty - .03, tz1 + .05], .008, M.brass);
    chairTour(2.90, 1.93, 0); chairTour(3.46, 1.93, 0); chairTour(2.90, 3.19, Math.PI); chairTour(3.46, 3.19, Math.PI);
    CY(3.18, ty, 2.56, .17, ty + .015, M.white);
    SP(3.12, ty + .06, 2.56, .045, M.wicker); SP(3.24, ty + .06, 2.58, .045, M.wicker);
    // lustre sputnik
    CY(3.18, H - .03, 2.56, .06, H, M.brass);
    rod([3.18, H - .03, 2.56], [3.18, 1.80, 2.56], .005, M.brass, { cast: false });
    SP(3.18, 1.80, 2.56, .025, M.brass, { cast: false });
    const arms = [[1, .15, 0], [-.5, -.1, .87], [-.5, .2, -.87], [.3, .9, .3]];
    for (const [ax, ay, az] of arms) {
      const v = new THREE.Vector3(ax, ay * .35, az).normalize().multiplyScalar(.38);
      rod([3.18 - v.x, 1.80 - v.y, 2.56 - v.z], [3.18 + v.x, 1.80 + v.y, 2.56 + v.z], .006, M.brass, { cast: false });
      SP(3.18 + v.x, 1.80 + v.y, 2.56 + v.z, .045, M.bulb, { cast: false });
      SP(3.18 - v.x, 1.80 - v.y, 2.56 - v.z, .045, M.bulb, { cast: false });
    }
    LAMP(3.18, 1.70, 2.56, 1.4, 4.5, 'tour');
  });
  within(STYLE.fotos, () => {
    B(tx1 + .03, ty - .07, tz1 + .03, tx2 - .03, ty - .012, tz2 - .03, M.walnut);
    for (const [x, z] of [[tx1 + .08, tz1 + .08], [tx2 - .08, tz1 + .08], [tx1 + .08, tz2 - .08], [tx2 - .08, tz2 - .08]]) CY(x, 0, z, .025, ty - .07, M.walnut, { rTop: .035, seg: 12 });
    chairCane(2.90, 1.93, 0); chairCane(3.46, 1.93, 0); chairCane(2.90, 3.19, Math.PI); chairCane(3.46, 3.19, Math.PI);
    for (const [x, z] of [[2.90, 2.33], [3.46, 2.33], [2.90, 2.79], [3.46, 2.79]]) {
      B(x - .20, ty, z - .14, x + .20, ty + .004, z + .14, C('#a88457', .9), { cast: false });
      CY(x, ty + .004, z, .13, ty + .018, M.porcelain, { seg: 24 });
      CY(x, ty + .018, z, .085, ty + .05, M.porcelain, { rTop: .1, seg: 20 });
      CY(x + .17, ty + .004, z + (z < 2.56 ? -.1 : .1), .032, ty + .15, M.glass, { rTop: .038, cast: false });
      CY(x + .17, ty + .145, z + (z < 2.56 ? -.1 : .1), .039, ty + .152, M.brass, { cast: false });
    }
    // pendente LED ondulado
    const pts = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector3(2.70 + t * .96, 1.64 + Math.sin(t * 6.28) * .05, 2.56 + Math.sin(t * 9.4) * .09)); }
    addMesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, .022, 10), M.led, { cast: false });
    rod([2.72, H, 2.56], [2.72, 1.66, 2.56], .002, M.black, { cast: false });
    rod([3.64, H, 2.56], [3.64, 1.66, 2.56], .002, M.black, { cast: false });
    LAMP(3.18, 1.55, 2.56, 1.4, 4.5, 'fotos');
  });
}

function buildEntrada() {
  B(5.27, 0, 3.92, 5.30, 2.40, D_IN, M.entryPanel, { cast: false });
  B(5.27, 2.15, 3.10, 5.30, H, 3.92, M.entryPanel, { cast: false });
  for (const z of [4.12, 4.30, 4.48]) SP(5.255, 1.62, z, .02, M.oak, { cast: false });
  B(5.12, 1.92, 3.98, 5.27, 1.945, 4.56, M.entryPanel);
  ART('x-', 4.03, 4.23, 1.945, 2.21, 5.235, M.art5);
  ART('x-', 4.29, 4.50, 1.945, 2.13, 5.22, M.art3);
  RB(5.19, 1.18, 4.24, 5.25, 1.56, 4.40, .02, C('#c8a27c', .95));
  rod([5.25, 1.56, 4.30], [5.255, 1.62, 4.30], .004, C('#c8a27c', .95), { cast: false });
  B(4.40, 0, 4.18, 5.05, .01, 4.55, C('#8c7c6b', 1), { cast: false });
}

function buildCozinha() {
  // geladeira + coluna + aéreo
  RB(3.58, 0, 3.93, 4.26, 1.86, 4.58, .02, M.fridge);
  B(3.585, 1.22, 3.925, 4.255, 1.228, 3.93, M.black, { cast: false });
  B(4.17, .35, 3.90, 4.19, 1.15, 3.925, M.steel); B(4.17, 1.30, 3.90, 4.19, 1.75, 3.925, M.steel);
  addColl(3.56, 3.90, 4.33, D_IN);
  B(4.28, 0, 3.92, 4.32, H, D_IN, M.base);
  B(3.56, 1.96, 4.12, 4.28, H, D_IN, M.upper);

  // bancada com cuba
  B(2.30, .10, 4.07, 3.52, .88, D_IN, M.base);
  B(2.32, 0, 4.12, 3.50, .10, D_IN, M.black, { cast: false });
  for (const x of [2.91]) B(x - .003, .12, 4.066, x + .003, .86, 4.07, M.black, { cast: false });
  B(2.45, .78, 4.05, 2.78, .795, 4.068, M.black); B(3.05, .78, 4.05, 3.38, .795, 4.068, M.black);
  B(2.28, .88, 4.03, 3.54, .92, D_IN, M.counter);
  B(2.66, .9195, 4.14, 3.14, .9215, 4.46, C('#dcd7cf', .3), { cast: false });
  B(2.70, .9205, 4.18, 3.10, .9225, 4.42, C('#c2bbb1', .35), { cast: false });
  CY(2.90, .922, 4.30, .02, .925, M.steel, { cast: false });
  CY(2.90, .92, 4.52, .018, 1.22, M.steel, { seg: 12 });
  rod([2.90, 1.22, 4.52], [2.90, 1.22, 4.36], .012, M.steel);
  rod([2.90, 1.22, 4.36], [2.90, 1.12, 4.36], .012, M.steel);
  CY(3.30, .92, 4.35, .14, .935, M.oak);
  CY(3.25, .935, 4.36, .022, 1.07, M.walnut, { seg: 10 }); CY(3.32, .935, 4.40, .022, 1.05, M.walnut, { seg: 10 });
  SP(3.36, .96, 4.28, .05, C('#d9d2c5', .5), { sy: .5 });
  PLANT(3.44, .92, 4.48, .5, M.potClay, 6);
  addColl(2.26, 4.02, 3.56, D_IN);

  // revestimento + nicho do micro-ondas + aéreos
  B(1.62, .88, 4.586, 3.56, 1.50, 4.598, M.tileWhite, { cast: false });
  B(1.62, 1.48, 4.26, 3.56, 1.50, D_IN, M.base);
  B(1.62, 1.50, 4.588, 3.56, 1.90, 4.598, M.base, { cast: false });
  B(1.62, 1.50, 4.26, 1.64, 1.90, D_IN, M.base); B(3.54, 1.50, 4.26, 3.56, 1.90, D_IN, M.base);
  RB(2.20, 1.50, 4.28, 2.74, 1.80, 4.58, .01, M.black);
  B(2.23, 1.53, 4.275, 2.58, 1.77, 4.28, M.screen, { cast: false });
  slats('z-', 3.22, 3.54, 1.50, 1.90, 4.588, .02, M.base);
  B(3.00, 1.50, 4.40, 3.03, 1.74, 4.56, C('#e9e2d6')); B(3.04, 1.50, 4.40, 3.07, 1.70, 4.56, C('#2f2f2f'));
  PLANT(2.86, 1.50, 4.44, .5, M.potWhite, 8);
  B(1.62, 1.90, 4.26, 3.56, H, D_IN, M.upper);
  for (const x of [2.105, 2.59, 3.075]) B(x - .003, 1.91, 4.255, x + .003, H - .01, 4.26, M.black, { cast: false });
  for (const x of [1.95, 2.25, 2.43, 2.74, 2.92, 3.23]) B(x - .07, 1.94, 4.24, x + .07, 1.952, 4.256, M.black, { cast: false });

  // fogão
  B(1.66, .08, 4.04, 2.20, .86, D_IN, M.steel);
  B(1.66, 0, 4.08, 2.20, .08, D_IN, M.black, { cast: false });
  B(1.66, .86, 4.04, 2.20, .875, D_IN, M.black);
  for (const [x, z] of [[1.80, 4.17], [2.06, 4.17], [1.80, 4.44], [2.06, 4.44]]) CY(x, .875, z, .05, .888, C('#3b3b3d', .4), { seg: 16, cast: false });
  B(1.72, .25, 4.035, 2.14, .62, 4.04, M.screen, { cast: false });
  B(1.72, .69, 4.02, 2.14, .71, 4.035, M.steel);
  for (const x of [1.75, 1.87, 1.99, 2.11]) CY(x, .79, 4.03, .015, .81, M.black, { seg: 10, cast: false });
  SP(1.80, .95, 4.17, .08, M.black, { sy: .85 });
  rod([1.74, 1.04, 4.17], [1.86, 1.04, 4.17], .008, M.black);
  addColl(1.64, 4.02, 2.22, D_IN);

  // divisória madeira + vidro
  B(1.53, .90, 4.04, 1.58, 2.20, 4.08, M.base);
  B(1.53, 2.16, 4.04, 1.58, 2.20, D_IN, M.base);
  B(1.53, .90, 4.04, 1.58, .94, D_IN, M.base);
  B(1.548, .94, 4.08, 1.562, 2.16, 4.59, M.glass, { cast: false, receive: false });
}

function buildServico() {
  // tanque sobre gabinete
  B(.22, .08, 4.06, .86, .78, D_IN, M.base);
  B(.24, 0, 4.10, .84, .08, D_IN, M.black, { cast: false });
  RB(.21, .78, 4.02, .87, .92, D_IN, .015, M.porcelain);
  B(.30, .906, 4.10, .78, .922, 4.42, C('#e3e1dc', .3), { cast: false });
  rod([.54, 1.06, 4.60], [.54, 1.06, 4.46], .012, M.chrome);
  rod([.54, 1.06, 4.46], [.54, .99, 4.44], .01, M.chrome);
  B(.20, .78, 4.588, 1.53, 1.10, 4.598, M.tileWhite, { cast: false });
  addColl(.20, 4.00, .88, D_IN);

  // máquina de lavar
  RB(.88, 0, 4.00, 1.48, .86, 4.58, .02, C('#e8e8e6', .35));
  const ring = new THREE.TorusGeometry(.165, .022, 10, 32); ring.translate(1.18, .40, 3.995);
  addMesh(ring, M.steel, { cast: false });
  const disk = new THREE.CircleGeometry(.15, 28); disk.rotateY(Math.PI); disk.translate(1.18, .40, 3.992);
  addMesh(disk, M.screen, { cast: false });
  B(.92, .74, 3.995, 1.44, .83, 4.00, C('#d3d3d1', .4), { cast: false });
  CY(1.18, .86, 4.29, .19, 1.10, M.wicker, { rTop: .23 });
  RB(1.06, 1.02, 4.20, 1.28, 1.10, 4.38, .02, M.white);
  addColl(.86, 3.98, 1.50, D_IN);

  // paneleiro alto (parede norte do corredor)
  B(0, .08, 3.10, 1.52, 2.45, 3.44, M.upper);
  B(0, 0, 3.12, 1.52, .08, 3.42, M.black, { cast: false });
  B(0, 1.396, 3.44, 1.52, 1.404, 3.444, M.black, { cast: false });
  for (const x of [.38, .76, 1.14]) B(x - .003, .1, 3.44, x + .003, 2.43, 3.444, M.black, { cast: false });
  for (const x of [.38, 1.14]) { B(x - .05, 1.22, 3.444, x - .038, 1.34, 3.46, M.black); B(x + .038, 1.46, 3.444, x + .05, 1.58, 3.46, M.black); }
  addColl(0, 3.10, 1.53, 3.46);

  // estante aberta
  B(1.54, 0, 3.10, 1.57, 2.45, 3.42, M.base); B(2.37, 0, 3.10, 2.40, 2.45, 3.42, M.base);
  B(1.54, 2.42, 3.10, 2.40, 2.45, 3.42, M.base);
  B(1.57, .08, 3.10, 2.37, .80, 3.42, M.base);
  B(1.968, .10, 3.42, 1.972, .78, 3.424, M.black, { cast: false });
  B(1.90, .66, 3.424, 1.94, .67, 3.44, M.black); B(2.00, .66, 3.424, 2.04, .67, 3.44, M.black);
  for (const y of [1.10, 1.40, 1.70, 2.00]) B(1.57, y, 3.10, 2.37, y + .025, 3.40, M.base);
  for (let i = 0; i < 4; i++) {
    CY(1.66 + i * .09, 1.125, 3.26, .035, 1.29 - (i % 2) * .04, M.glass, { cast: false, seg: 14 });
    CY(1.66 + i * .09, 1.125, 3.26, .03, 1.20 - (i % 2) * .03, C(['#b35b2e', '#d9b25a', '#6d7d3f', '#8a4a2a'][i], .9), { seg: 12, cast: false });
  }
  for (let i = 0; i < 5; i++) B(1.62 + i * .032, 1.425, 3.18, 1.648 + i * .032, 1.60 - (i % 3) * .03, 3.36, C(['#e9e2d6', '#9a4a2c', '#2f3a36', '#d8c7a8', '#6f8c94'][i], .8));
  ART('z+', 1.95, 2.25, 1.425, 1.68, 3.10, M.art5);
  HANGING_PLANT(2.12, 2.025, 3.26, .8, 5);
  PLANT(1.75, 1.725, 3.25, .45, M.potClay, 9);
  addColl(1.53, 3.10, 2.41, 3.43);
}
