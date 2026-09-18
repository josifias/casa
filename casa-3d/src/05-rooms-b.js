// ============================================================
// 05 · AMBIENTES (B) — banheiro, quarto casal, quarto infantil
// ============================================================
const WHITE_PLASTIC = () => C('#f3f1ed', .45);

function BEAR(x, y, z, s, mat, ry = 0) {
  const g = G(x, y, z, ry);
  within(g, () => {
    SP(0, .12 * s, 0, .12 * s, mat, { sy: 1.1 });
    SP(0, .31 * s, .01 * s, .09 * s, mat);
    SP(-.07 * s, .38 * s, 0, .035 * s, mat); SP(.07 * s, .38 * s, 0, .035 * s, mat);
    SP(0, .29 * s, .085 * s, .035 * s, C('#eadbc4'), { sz: .6 });
    SP(-.1 * s, .04 * s, .08 * s, .045 * s, mat); SP(.1 * s, .04 * s, .08 * s, .045 * s, mat);
    SP(-.13 * s, .16 * s, .02 * s, .04 * s, mat, { sy: 1.4 }); SP(.13 * s, .16 * s, .02 * s, .04 * s, mat, { sy: 1.4 });
  });
}
function BALLOON_DOG(x, y, z, s = 1, ry = 0) {
  const m = C('#e2662b', .15, .3), g = G(x, y, z, ry);
  within(g, () => {
    SP(0, .07 * s, 0, .03 * s, m, { sx: 2.2 });
    SP(.07 * s, .12 * s, 0, .025 * s, m, { sy: 2 });
    SP(.09 * s, .17 * s, 0, .03 * s, m, { sx: 1.6 });
    for (const [lx, lz] of [[-.05, -.02], [-.05, .02], [.05, -.02], [.05, .02]]) SP(lx * s, .035 * s, lz * s, .012 * s, m, { sy: 3 });
    SP(-.075 * s, .1 * s, 0, .012 * s, m, { sy: 2.5 });
  });
}
function ELEPHANT(x, y, z, s = 1, ry = 0) {
  const m = C('#f4f2ee', .35), g = G(x, y, z, ry);
  within(g, () => {
    SP(0, .07 * s, 0, .05 * s, m, { sx: 1.4 });
    SP(.07 * s, .10 * s, 0, .035 * s, m);
    rod([.1 * s, .09 * s, 0], [.12 * s, .02 * s, 0], .008 * s, m);
    for (const [lx, lz] of [[-.04, -.025], [-.04, .025], [.04, -.025], [.04, .025]]) CY(lx * s, 0, lz * s, .012 * s, .05 * s, m, { seg: 8 });
  });
}
function GIRAFFE(x, y, z, s = 1, ry = 0) {
  const m = C('#d9a257', .95), g = G(x, y, z, ry);
  within(g, () => {
    SP(0, .1 * s, 0, .09 * s, m, { sx: 1.2 });
    rod([.04 * s, .14 * s, 0], [.08 * s, .32 * s, 0], .035 * s, m);
    SP(.1 * s, .35 * s, 0, .05 * s, m, { sx: 1.4 });
    SP(.16 * s, .34 * s, 0, .03 * s, C('#f1e3cc'));
    for (let i = 0; i < 6; i++) SP(-.05 * s + i * .02 * s, .12 * s + (i % 2) * .05 * s, .085 * s, .018 * s, C('#8a5a2b'), { sz: .3 });
  });
}
function RAINBOW(x, y, z, s = 1, ry = 0) {
  const g = G(x, y, z, ry);
  [['#d9534f', .13], ['#f0c24f', .10], ['#6fa8dc', .07]].forEach(([c, r]) => {
    const t = new THREE.TorusGeometry(r * s, .018 * s, 8, 24, Math.PI);
    addMesh(t, C(c, .95), { parent: g });
  });
  return g;
}
function chairEames(x, z, ry) {
  const g = G(x, 0, z, ry), wp = WHITE_PLASTIC();
  within(g, () => {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) rod([sx * .11, .31, sz * .11], [sx * .19, 0, sz * .19], .011, M.oakLight);
    rod([-.11, .30, -.11], [.11, .30, .11], .004, M.blackMetal, { cast: false });
    rod([.11, .30, -.11], [-.11, .30, .11], .004, M.blackMetal, { cast: false });
    RB(-.21, .33, -.21, .21, .44, .20, .06, wp);
    const b = G(0, .62, -.19, 0); b.rotation.x = -.2;
    RB(-.21, -.2, -.03, .21, .19, .02, .05, wp, { parent: b });
  });
}

function buildBanheiro() {
  // revestimentos
  B(7.388, 0, 3.78, W_IN, H, D_IN, M.tileWhite, { cast: false });
  B(6.38, 0, 4.588, W_IN, H, D_IN, M.tileWhite, { cast: false });
  B(7.388, 0, 3.10, W_IN, 1.00, 3.78, M.tileWhite, { cast: false });
  B(5.40, 0, 4.588, 6.38, 1.10, D_IN, M.tileWhite, { cast: false });

  // box de vidro com perfil preto
  const gy = 1.95;
  B(6.40, .02, 3.775, 7.388, gy, 3.785, M.glass, { cast: false, receive: false });
  B(6.395, .02, 3.785, 6.405, gy, 4.585, M.glass, { cast: false, receive: false });
  B(6.39, gy, 3.77, 7.39, gy + .025, 3.79, M.blackMetal); B(6.39, gy, 3.77, 6.41, gy + .025, D_IN, M.blackMetal);
  for (const [x, z] of [[6.39, 3.77], [6.39, 4.575], [7.37, 3.77]]) B(x, 0, z, x + .02, gy, z + .02, M.blackMetal);
  B(6.37, .95, 4.05, 6.39, 1.25, 4.07, M.blackMetal);
  B(6.84, 2.18, 4.12, 7.10, 2.192, 4.38, M.steel);
  rod([6.97, 2.26, 4.59], [6.97, 2.26, 4.25], .01, M.steel); rod([6.97, 2.26, 4.25], [6.97, 2.19, 4.25], .01, M.steel);
  CY(6.97, 1.06, 4.585, .04, 1.07, M.chrome, { cast: false }); // registro (disco achatado)
  B(6.95, 1.08, 4.55, 6.99, 1.10, 4.585, M.chrome, { cast: false });
  B(7.05, .002, 4.25, 7.18, .006, 4.38, M.blackMetal, { cast: false });
  addColl(6.36, 3.76, W_IN, D_IN);

  // bacia com caixa acoplada
  RB(5.72, .38, 4.42, 6.08, .80, 4.59, .03, M.porcelain);
  CY(5.90, 0, 4.22, .14, .38, M.porcelain, { rTop: .17, sz: 1.3 });
  CY(5.90, .38, 4.20, .185, .42, M.porcelain, { sz: 1.25 });
  CY(5.90, .80, 4.50, .03, .81, M.chrome, { cast: false });
  addColl(5.66, 3.94, 6.14, D_IN);
  B(5.40, .70, 4.28, 5.43, .72, 4.40, M.blackMetal, { cast: false });
  rod([5.46, .64, 4.28], [5.46, .64, 4.40], .05, M.white, { seg: 14 });
  ART('z-', 5.63, 6.17, 1.30, 1.95, D_IN, M.art4);

  // gabinete + cuba de apoio + espelheira com ripado
  RB(6.95, .32, 3.14, 7.39, .84, 3.74, .03, M.bathCab);
  B(6.94, .84, 3.13, W_IN, .87, 3.75, M.bathCab);
  B(6.935, .74, 3.28, 6.95, .755, 3.40, M.black); B(6.935, .74, 3.48, 6.95, .755, 3.60, M.black);
  CY(7.14, .87, 3.44, .16, .99, M.porcelain, { rTop: .19, sz: 1.2 });
  CY(7.14, .985, 3.44, .165, .992, C('#e2dfda', .2), { sz: 1.2, cast: false });
  CY(7.34, .87, 3.44, .016, 1.13, M.chrome, { seg: 12 });
  rod([7.34, 1.13, 3.44], [7.20, 1.13, 3.44], .011, M.chrome); rod([7.20, 1.13, 3.44], [7.20, 1.07, 3.44], .009, M.chrome);
  CY(7.30, .87, 3.67, .028, .98, C('#3d5a73', .15), { seg: 12 });
  for (const a of [-.2, 0, .2]) rod([7.30, .98, 3.67], [7.30 + Math.sin(a) * .05, 1.2, 3.67 + a * .1], .003, M.black, { cast: false });
  CY(7.30, .87, 3.24, .03, .99, M.white, { seg: 12 });
  B(7.26, 1.18, 3.17, W_IN, 1.86, 3.72, M.bathCab);
  B(7.255, 1.20, 3.19, 7.261, 1.84, 3.70, M.mirror, { cast: false });
  B(7.20, 1.88, 3.13, W_IN, 1.92, 3.76, M.bathCab);
  slats('x-', 3.14, 3.75, 1.92, H, W_IN, .03, M.bathCab);
  HANGING_PLANT(7.28, 1.92, 3.30, .55, 7);
  addColl(6.92, 3.10, W_IN, 3.77);

  // toalha
  rod([5.80, 1.36, 3.135], [6.30, 1.36, 3.135], .01, M.blackMetal);
  RB(5.85, .82, 3.125, 6.25, 1.38, 3.165, .015, M.towel);
}

function buildCasal() {
  // cabeceira em gomos
  for (let i = 0; i < 4; i++) { const z1 = .10 + i * .56; RB(7.28, .30, z1 + .006, W_IN, 1.28, z1 + .554, .045, M.headboard, { seg: 3 }); }
  // cama queen
  RB(5.42, .08, .42, 7.28, .44, 1.98, .03, M.headboard);
  for (const [x, z] of [[5.48, .48], [5.48, 1.92], [7.2, .48], [7.2, 1.92]]) CY(x, 0, z, .02, .08, M.black, { seg: 8 });
  RB(5.42, .44, .43, 7.28, .64, 1.97, .05, M.mattress);
  RB(5.40, .60, .40, 6.95, .69, 2.00, .04, M.duvet, { seg: 3 });
  B(5.40, .38, .392, 6.95, .66, .405, M.duvet); B(5.40, .38, 1.995, 6.95, .66, 2.008, M.duvet);
  B(5.395, .38, .40, 5.405, .66, 2.00, M.duvet);
  RB(5.62, .66, .385, 6.12, .712, 2.015, .02, M.runner);
  B(5.62, .36, .378, 6.12, .70, .392, M.runner); B(5.62, .36, 2.008, 6.12, .70, 2.022, M.runner);
  PILLOW(7.13, .78, .78, .16, .36, .64, M.pillowB, 0, 0, -.35);
  PILLOW(7.13, .78, 1.60, .16, .36, .64, M.pillowB, 0, 0, -.35);
  PILLOW(6.98, .78, .86, .12, .34, .52, M.pillowA, 0, .1, -.3);
  PILLOW(6.98, .78, 1.52, .12, .34, .52, M.pillowA, 0, -.1, -.3);
  PILLOW(6.86, .75, 1.19, .10, .26, .42, M.duvet, 0, 0, -.25);
  addColl(5.38, .38, W_IN, 2.02);

  // criado-mudo + abajur
  B(7.00, .15, .03, 7.38, .52, .38, M.oak);
  B(6.995, .33, .05, 7.0, .336, .36, M.black, { cast: false });
  CY(7.20, .52, .18, .06, .60, M.porcelain, { rTop: .045 });
  rod([7.20, .60, .18], [7.20, .72, .18], .008, M.brass);
  CY(7.20, .70, .18, .12, .88, M.shade, { rTop: .095, open: true });
  PLANT(7.05, .52, .31, .32, M.potWhite, 14);
  LAMP(7.15, .80, .30, .45, 2.5);
  addColl(6.98, .02, W_IN, .40);

  // mesinhas redondas
  CY(7.12, .46, 2.26, .19, .49, M.walnut); CY(7.12, 0, 2.26, .025, .46, M.blackMetal, { seg: 10 }); CY(7.12, 0, 2.26, .14, .012, M.blackMetal);
  CY(6.88, .36, 2.40, .15, .39, M.walnut); CY(6.88, 0, 2.40, .02, .36, M.blackMetal, { seg: 10 });
  CY(7.12, .49, 2.26, .04, .62, C('#cbbba8', .6), { rTop: .025, seg: 12 });
  for (const a of [-.3, 0, .35]) rod([7.12, .62, 2.26], [7.12 + Math.sin(a) * .08, .86, 2.26 + a * .1], .004, C('#9c7b58'), { cast: false });
  addColl(6.70, 2.05, W_IN, 2.45);

  // guarda-roupa com portas espelhadas
  const wr = C('#eadfd6', .5);
  B(5.94, 0, 2.45, W_IN, H, 3.00, wr);
  B(5.97, .05, 2.436, 6.53, 2.40, 2.45, M.mirror, { cast: false });
  B(6.53, .05, 2.426, 7.09, 2.40, 2.44, M.mirror, { cast: false });
  for (const x of [5.96, 6.52, 7.08]) B(x, .04, 2.42, x + .014, 2.41, 2.45, M.brass, { cast: false });
  B(5.96, 2.40, 2.42, 7.09, 2.414, 2.45, M.brass, { cast: false });
  B(7.10, 0, 2.45, W_IN, H, 2.47, C('#e9c9bd', .8), { cast: false });
  B(7.10, 0, 2.47, W_IN, H, 2.99, C('#e9c9bd', .8));
  for (const y of [.45, .85, 1.25, 1.65, 2.05]) B(7.11, y, 2.43, W_IN, y + .02, 2.99, wr);
  B(7.16, .87, 2.52, 7.19, 1.08, 2.70, C('#2f3a36')); B(7.20, .87, 2.52, 7.23, 1.04, 2.70, C('#d8c7a8'));
  CY(7.26, 1.27, 2.62, .04, 1.45, M.porcelain, { rTop: .025 });
  addColl(5.92, 2.42, W_IN, 3.00);
  PLANT(5.80, 0, 2.30, .95, M.potClay, 16);
  addColl(5.66, 2.16, 5.94, 2.44);

  // parede da TV (oeste)
  B(5.00, 0, .25, 5.02, H, 1.95, C('#efe7de', .8), { cast: false });
  slats('x+', .25, 1.95, .90, 1.06, 5.02, .02, M.oak);
  slats('x+', .25, 1.95, 2.02, H, 5.02, .02, M.oak);
  B(5.02, 1.98, .25, 5.22, 2.02, 1.95, M.oak);
  B(5.03, 1.972, .30, 5.20, 1.98, 1.90, M.led, { cast: false });
  RB(5.03, 1.15, .52, 5.07, 1.78, 1.68, .01, M.black);
  B(5.07, 1.17, .54, 5.073, 1.76, 1.66, M.screen, { cast: false });
  CY(5.12, 2.02, .50, .06, 2.22, M.porcelain, { rTop: .035 });
  B(5.06, 2.02, .88, 5.18, 2.08, 1.04, C('#8a3a22', .6));
  CY(5.12, 2.02, 1.28, .04, 2.10, C('#b8532f', .7)); CY(5.12, 2.02, 1.38, .04, 2.14, C('#b8532f', .7));
  HANGING_PLANT(5.12, 2.02, 1.74, .8, 3);
  RB(5.02, 2.20, .70, 5.25, 2.46, 1.55, .03, M.white);
  B(5.25, 2.24, .75, 5.252, 2.28, 1.50, C('#cfcfcf'), { cast: false });
  ART('x-', .52, 1.04, 1.40, 2.02, W_IN, M.art3);
  ART('x-', 1.14, 1.66, 1.40, 2.02, W_IN, M.art4);
  B(5.15, 0, .25, 6.85, .012, 2.18, C('#e8ddd2', 1), { cast: false });
}

function buildInfantil() {
  // papel de parede (oeste) e parede de destaque (norte, dentro do loft)
  B(0, 0, 0, .006, H, 3.0, M.kidsPaper, { cast: false });
  B(.006, 0, 0, .94, H, .006, M.kidsAccent, { cast: false });
  within(STYLE.tour, () => {
    [[.25, .55, '#e6b04a'], [.60, .80, '#6f8c94'], [.32, 1.05, '#e9a7a0'], [.72, .40, '#8aa37b'], [.48, .28, '#f3eee6']]
      .forEach(([x, y, c]) => SP(x, y, .012, .03, C(c, .6), { sz: .45, cast: false }));
  });

  // beliche-loft
  const F = M.kidsFrame, X2 = .92;
  for (const z of [.02, 1.02, 2.02, 2.90]) B(X2 - .06, 0, z, X2, 2.34, z + .06, F);
  B(0, 0, .02, .06, 2.34, .08, F); B(0, 0, 2.90, .06, 2.34, 2.96, F);
  B(X2 - .06, 2.28, .02, X2, 2.34, 2.96, F); B(0, 2.28, .02, X2, 2.34, .08, F); B(0, 2.28, 2.90, X2, 2.34, 2.96, F);
  B(0, 2.34, .02, X2, 2.40, 2.96, M.oak);
  for (const z of [.5, 1.0, 1.5, 2.0, 2.5]) B(0, 2.335, z, X2 - .06, 2.34, z + .006, C('#8a6a48'), { cast: false });
  for (const [y1, y2] of [[1.16, 1.22], [1.25, 1.31], [1.34, 1.42]]) B(X2 - .05, y1, .02, X2 + .01, y2, 2.96, F);
  B(.02, 1.34, .02, X2 - .05, 1.40, 2.96, F);
  RB(.06, 1.40, .10, .86, 1.56, 2.00, .04, M.mattress);
  RB(.05, 1.50, .10, .87, 1.585, 1.70, .03, M.lowerBed);
  PILLOW(.44, 1.64, .26, .52, .12, .30, M.pillowB);
  // redes de corda
  const xr = X2 - .03;
  for (let z = .22; z < 2.0; z += .22) rod([xr, 1.42, z], [xr, 2.28, z], .011, M.rope, { seg: 6 });
  for (const y of [1.70, 1.98]) {
    rod([xr, y, .08], [xr, y, 2.02], .011, M.rope, { seg: 6 });
    for (let z = .22; z < 2.0; z += .22) SP(xr, y, z, .022, M.rope, { seg: 8, seg2: 6, cast: false });
    rod([.06, y, .05], [X2 - .06, y, .05], .011, M.rope, { seg: 6 });
  }
  for (const x of [.30, .60]) rod([x, 1.42, .05], [x, 2.28, .05], .011, M.rope, { seg: 6 });
  // escada
  B(X2, 0, 2.20, X2 + .05, 1.45, 2.24, M.oakLight); B(X2, 0, 2.58, X2 + .05, 1.45, 2.62, M.oakLight);
  for (const y of [.30, .60, .90, 1.20]) B(X2 + .005, y, 2.24, X2 + .045, y + .035, 2.58, M.oakLight);
  // cama de baixo
  B(.02, 0, .08, X2 - .02, .16, 2.94, F);
  RB(.04, .16, .10, .88, .32, 2.92, .04, M.mattress);
  RB(.04, .28, .10, .89, .36, 2.92, .03, M.lowerBed);
  PILLOW(.14, .52, .55, .14, .34, .55, M.pillowA, 0, 0, .22);
  PILLOW(.14, .52, 1.20, .14, .34, .55, M.sofaPillow, 0, 0, .22);
  RB(.08, 1.95, .02, .84, 2.22, .24, .03, M.white);   // split
  addColl(0, 0, X2 + .07, 2.97);

  within(STYLE.tour, () => {
    BEAR(.55, .36, 1.85, 1, C('#8f6b4c', 1), -1.2);
    BEAR(.50, .36, 2.30, .8, C('#cfcac2', 1), -1.4);
    SP(.50, .41, .95, .09, C('#e8c35a', 1), { sy: .45 });
    SP(.62, 1.62, 1.40, .07, C('#9a7ab0', 1), { sy: .6 });
  });
  within(STYLE.fotos, () => {
    const r = RAINBOW(.22, .48, 1.90, 1, Math.PI / 2);
    PILLOW(.16, .50, 2.35, .12, .32, .40, C('#f7f5f0', 1), 0, 0, .2);
    BEAR(.55, .36, 2.55, .8, C('#b89067', 1), -1.3);
    // cesto de tricô com girafa
    CY(1.25, 0, 2.20, .20, .28, C('#bdb9b2', 1), { rTop: .22 });
    CY(1.25, .24, 2.20, .18, .27, C('#8e8a84', 1), { seg: 20 });
    GIRAFFE(1.22, .22, 2.18, 1.1, .6);
    SP(1.32, .30, 2.26, .07, C('#f3f0ea', 1), { sx: 1.8, sy: .7 });
    addColl(1.02, 1.97, 1.48, 2.43);
  });

  // escrivaninha + cadeira
  B(1.19, .72, .02, 2.38, .75, .54, M.desk);
  B(1.19, 0, .04, 1.23, .72, .52, M.desk); B(2.34, 0, .04, 2.38, .72, .52, M.desk);
  addColl(1.17, 0, 2.40, .56);
  B(1.55, .75, .18, 1.80, .753, .36, M.white, { cast: false });
  B(1.62, .753, .22, 1.86, .756, .40, C('#f7e9c9'), { cast: false });
  CY(1.34, .75, .14, .04, .86, C('#6f8c94', .5), { seg: 12 });
  ['#d9534f', '#f0c24f', '#6fa8dc', '#6d9a78'].forEach((c, i) => rod([1.32 + i * .013, .80, .14], [1.32 + i * .02, .92, .12 + i * .01], .005, C(c, .6), { cast: false }));
  chairEames(1.78, .80, Math.PI);
  addColl(1.55, .58, 2.01, 1.03);

  // nichos (parede norte)
  for (const y0 of [1.00, 1.38, 1.76]) {
    B(1.90, y0, .006, 2.30, y0 + .34, .02, M.niche, { cast: false });
    B(1.90, y0, .02, 2.30, y0 + .02, .26, M.niche); B(1.90, y0 + .32, .02, 2.30, y0 + .34, .26, M.niche);
    B(1.90, y0, .02, 1.92, y0 + .34, .26, M.niche); B(2.28, y0, .02, 2.30, y0 + .34, .26, M.niche);
  }
  within(STYLE.tour, () => {
    SP(2.10, 1.13, .14, .08, C('#6fa8c8', .5)); CY(2.10, 1.02, .14, .04, 1.05, M.brass);
    CY(2.02, 1.40, .14, .025, 1.46, C('#f3eee6')); SP(2.02, 1.47, .14, .045, C('#c0392b', .6), { sy: .55 });
    CY(2.17, 1.40, .14, .02, 1.44, C('#f3eee6')); SP(2.17, 1.45, .14, .035, C('#e6b04a', .6), { sy: .55 });
    PLANT(2.10, 1.78, .14, .45, M.potWhite, 21);
  });
  within(STYLE.fotos, () => {
    BALLOON_DOG(2.08, 1.78, .14, 1.3, .3);
    ELEPHANT(2.02, 1.40, .15, 1.2, .2); ELEPHANT(2.18, 1.40, .12, .9, -.3);
    CY(2.02, 1.02, .14, .035, 1.15, M.porcelain, { rTop: .025 }); PLANT(2.02, 1.12, .14, .35, M.potWhite, 22);
    CY(2.18, 1.02, .14, .03, 1.12, M.porcelain, { rTop: .02 }); PLANT(2.18, 1.10, .14, .3, M.potWhite, 23);
    // luminária cogumelo + ursinho na mesa
    CY(2.18, .75, .30, .06, .77, M.white); CY(2.18, .77, .30, .012, .90, M.white, { seg: 10 });
    SP(2.18, .90, .30, .085, M.shade, { sy: .55 });
    LAMP(2.18, .95, .35, .35, 2, 'fotos');
    BEAR(1.36, .75, .38, .75, C('#b89067', 1), .8);
  });

  // guarda-roupa com ripado
  B(.98, 0, 2.45, 2.33, H, 3.00, M.kidsWardrobe);
  B(1.848, .05, 2.444, 1.852, 2.10, 2.45, M.black, { cast: false });
  SP(1.80, 1.05, 2.435, .025, M.oak); SP(1.90, 1.05, 2.435, .025, M.oak);
  slats('z-', .98, 1.30, 0, H, 2.45, .02, M.oak);
  slats('z-', 1.30, 2.33, 2.12, H, 2.45, .02, M.oak);
  addColl(.96, 2.42, 2.33, 3.00);

  B(1.08, 0, .66, 2.34, .012, 2.26, M.kidsRug, { cast: false });

  within(STYLE.tour, () => {
    CY(1.08, 0, .20, .10, .26, C('#6f8c94', .9), { rTop: .11 });
    SP(1.08, .28, .20, .06, C('#e9a7a0', 1)); SP(1.12, .30, .16, .05, C('#e6b04a', 1));
    B(1.25, H - .02, 1.35, 2.25, H, 1.39, M.white, { cast: false });
    for (const x of [1.40, 1.75, 2.10]) rod([x, H - .02, 1.37], [x - .04, H - .15, 1.28], .028, M.white, { cast: false });
    LAMP(1.70, 2.15, 1.40, .6, 3.5, 'tour');
  });
  within(STYLE.fotos, () => {
    CY(1.65, H - .03, 1.45, .20, H, M.white, { cast: false });
    CY(1.65, H - .032, 1.45, .17, H - .029, M.led, { cast: false });
    LAMP(1.65, 2.25, 1.45, .6, 3.5, 'fotos');
  });
  addColl(.98, .08, 1.18, .32);
}
