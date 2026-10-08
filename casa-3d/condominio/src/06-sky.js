// ============================================================
// 06 · CÉU E LUZ — céu com sol, sombras, lua, estrelas e dia/noite
// ============================================================
const SKYC = {
  dayTop: new THREE.Color('#3f86d8'), dayHor: new THREE.Color('#cfe3f3'),
  duskHor: new THREE.Color('#f2b183'), nightTop: new THREE.Color('#060a1c'), nightHor: new THREE.Color('#1a2448'),
};
const SUN_DIR = new THREE.Vector3(-.45, .78, -.42).normalize();
const MOON_DIR = new THREE.Vector3(.5, .6, .45).normalize();
const LOT_CENTER = new THREE.Vector3(41, 0, 65);
let skyMat, skyDome, starPts, sunLight, moonLight, hemi, glowMesh;
const lampLights = [];
let tod = 0, todTarget = 0;

function skyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { top: { value: SKYC.dayTop.clone() }, hor: { value: SKYC.dayHor.clone() }, sunDir: { value: SUN_DIR.clone() }, sunAmt: { value: 1 }, moonDir: { value: MOON_DIR.clone() }, moonAmt: { value: 0 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); p.z = p.w * .99999; gl_Position = p; }',
    fragmentShader: `uniform vec3 top, hor, sunDir, moonDir; uniform float sunAmt, moonAmt; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 c = mix(hor, top, smoothstep(-.02, .6, h));
        if (h < 0.) c = mix(hor, hor * .75, smoothstep(0., -.25, h));
        float s = max(dot(d, sunDir), 0.);
        c += vec3(1., .85, .6) * (pow(s, 90.) * .45 + smoothstep(.9993, .9997, s) * 2.) * sunAmt;
        float m = max(dot(d, moonDir), 0.);
        c += vec3(.85, .9, 1.) * smoothstep(.9994, .9997, m) * moonAmt + vec3(.2, .25, .4) * pow(m, 60.) * moonAmt;
        gl_FragColor = vec4(c, 1.);
      }`,
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  });
}
function buildSky(scene, renderer) {
  skyMat = skyMaterial();
  skyDome = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), skyMat);
  skyDome.renderOrder = -10; skyDome.frustumCulled = false;
  scene.add(skyDome);
  // mapa de ambiente (reflexos) a partir do céu de dia
  const pmrem = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), skyMaterial()));
  envScene.add(new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2).translate(0, -1, 0), new THREE.MeshBasicMaterial({ color: '#8d877a' })));
  scene.environment = pmrem.fromScene(envScene, .02).texture;
  // estrelas
  const R = rng(77), pts = [];
  for (let i = 0; i < 900; i++) { const a = R() * Math.PI * 2, e = Math.asin(R() * .96 + .04); pts.push(Math.cos(a) * Math.cos(e) * 700, Math.sin(e) * 700, Math.sin(a) * Math.cos(e) * 700); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  starPts = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  starPts.renderOrder = -9; starPts.frustumCulled = false; scene.add(starPts);
  // luzes
  hemi = new THREE.HemisphereLight('#dceaff', '#857f70', 1.0); scene.add(hemi);
  sunLight = new THREE.DirectionalLight('#fff0d8', 2.7);
  sunLight.castShadow = true;
  const S = LOW_END ? 1024 : IS_TOUCH ? 2048 : 4096;
  sunLight.shadow.mapSize.set(S, S);
  sunLight.shadow.bias = -.0004; sunLight.shadow.normalBias = .04;
  scene.add(sunLight, sunLight.target);
  moonLight = new THREE.DirectionalLight('#8ea6ff', 0); scene.add(moonLight, moonLight.target);
  for (let i = 0; i < (LOW_END ? 3 : 6); i++) { const l = new THREE.PointLight('#ffcf8f', 0, 16, 2); scene.add(l); lampLights.push(l); }
  scene.fog = new THREE.Fog(SKYC.dayHor.clone(), 120, 520);
}
// manchas de luz no chão sob cada poste (aditivas)
function buildGlows(scene) {
  const geos = [];
  for (const l of LAMPS) {
    const r = l.small ? 2.4 : 5.2, g = new THREE.PlaneGeometry(r * 2, r * 2);
    g.rotateX(-Math.PI / 2); g.translate(l.x, .09, l.z); geos.push(g);
  }
  if (!geos.length) return;
  glowMesh = new THREE.Mesh(mergeGeometries(geos), M.glowPool);
  glowMesh.renderOrder = 1;
  scene.add(glowMesh);
}
// sombra: cobre o terreno inteiro (vista aérea) ou um raio menor em volta do visitante (passeio, mais nítida)
function aimShadow(center, half) {
  const c = sunLight.shadow.camera;
  c.left = -half; c.right = half; c.top = half; c.bottom = -half; c.near = 1; c.far = 400; c.updateProjectionMatrix();
  sunLight.target.position.copy(center);
  sunLight.position.copy(center).addScaledVector(SUN_DIR, 180);
  moonLight.target.position.copy(center); moonLight.position.copy(center).addScaledVector(MOON_DIR, 180);
}
function assignLampLights(pos) {
  const big = LAMPS.filter((l) => !l.small);
  big.sort((a, b) => (a.x - pos.x) ** 2 + (a.z - pos.z) ** 2 - ((b.x - pos.x) ** 2 + (b.z - pos.z) ** 2));
  lampLights.forEach((L, i) => { const l = big[i]; if (l) L.position.set(l.x, l.y - .3, l.z); });
}
function setNightTarget(on) { todTarget = on ? 1 : 0; }
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function updateSky(dt, camera, renderer, instant = false) {
  const before = tod;
  tod = instant ? todTarget : tod + clamp(todTarget - tod, -dt / 1.6, dt / 1.6);
  const t = ease(tod), dusk = Math.max(0, 1 - Math.abs(tod - .5) * 2.4), night = clamp((tod - .3) / .6, 0, 1);
  _c1.copy(SKYC.dayTop).lerp(SKYC.nightTop, t);
  _c2.copy(SKYC.dayHor).lerp(SKYC.nightHor, t).lerp(SKYC.duskHor, dusk * .6);
  skyMat.uniforms.top.value.copy(_c1); skyMat.uniforms.hor.value.copy(_c2);
  skyMat.uniforms.sunAmt.value = 1 - t; skyMat.uniforms.moonAmt.value = night;
  skyDome.position.copy(camera.position); starPts.position.copy(camera.position);
  starPts.material.opacity = clamp((tod - .55) / .35, 0, 1);
  scene.fog.color.copy(_c2);
  sunLight.intensity = 2.7 * (1 - t); sunLight.color.setRGB(1, lerp(.94, .7, dusk), lerp(.85, .5, dusk));
  hemi.intensity = lerp(1.0, .16, t); hemi.color.setRGB(lerp(.86, .35, t), lerp(.92, .42, t), lerp(1, .7, t));
  moonLight.intensity = .45 * night;
  scene.environmentIntensity = lerp(.75, .1, t);
  renderer.toneMappingExposure = lerp(.95, 1.25, t);
  M.glassLit.emissiveIntensity = 1.3 * night;
  if (M.facade) M.facade.emissiveIntensity = .95 * night;
  M.bulb.emissiveIntensity = .2 + 3.2 * night;
  M.glowPool.opacity = .85 * night;
  for (const L of lampLights) L.intensity = 14 * night;
  document.body.classList.toggle('night', tod > .5);
  return before !== tod;
}
