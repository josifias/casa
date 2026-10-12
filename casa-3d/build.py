"""Gera as páginas juntando cada src/shell.html com os módulos JS da mesma pasta (ordem pelo nome).

- src/              -> index.html             (apartamento)
- condominio/src/   -> condominio/index.html  (condomínio)

O condomínio também recebe os módulos 01–05 do apartamento (o modelo e a decoração), embrulhados
na função APTO_KIT para não colidirem com os nomes do condomínio: é assim que dá para entrar em
qualquer apartamento de qualquer bloco usando exatamente o mesmo apartamento 3D.
"""
from pathlib import Path

here = Path(__file__).parent


def modules(src: Path, names=None):
    files = sorted(src.glob("[0-9][0-9]-*.js"))
    if names: files = [p for p in files if p.name[:2] in names]
    return [p.read_text(encoding="utf-8") for p in files]


def apto_kit() -> str:
    code = "\n".join(modules(here / "src", {"01", "02", "03", "04", "05"}))
    code = "\n".join(l for l in code.splitlines() if not l.startswith("import "))
    return (
        "// ============================================================\n"
        "// 99 · APTO_KIT (gerado pelo build.py a partir de src/01–05 do apartamento)\n"
        "// ============================================================\n"
        "function APTO_KIT(maxAniso) {\n" + code + """
  // ---------- interface usada pelo condomínio ----------
  function mergeKeep(group) {   // igual ao do apartamento: portas e pisos ficam soltos
    group.updateMatrixWorld(true);
    const inv = group.matrixWorld.clone().invert(), buckets = new Map(), victims = [];
    group.traverse((o) => {
      if (!o.isMesh || o.userData.door || o.userData.floor) return;
      const key = o.material.uuid + '|' + o.castShadow + '|' + o.receiveShadow;
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.clearGroups(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, receive: o.receiveShadow, geoms: [] });
      buckets.get(key).geoms.push(g); victims.push(o);
    });
    for (const o of victims) { o.parent.remove(o); o.geometry.dispose(); }
    const prune = (n) => { for (const c of [...n.children]) { prune(c); if (c.isGroup && !c.children.length) n.remove(c); } };
    prune(group);
    for (const b of buckets.values()) {
      const merged = mergeGeometries(b.geoms, false); b.geoms.forEach((g) => g.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, b.mat); mesh.castShadow = b.cast; mesh.receiveShadow = b.receive; group.add(mesh);
    }
  }
  let ready = false;
  function build({ garden = false } = {}) {
    if (!ready) { MAX_ANISO = maxAniso; TX = makeTextures(); makeMaterials(); ready = true; }
    SALA_SILL = garden ? .05 : 1.00;
    DOORS.length = 0; COLL.length = 0; LAMPS.length = 0;
    const house = new THREE.Group();
    const DECOR = G(0, 0, 0, 0, house);
    STYLE.tour = G(0, 0, 0, 0, house); STYLE.tour.userData.style = 'tour';
    STYLE.fotos = G(0, 0, 0, 0, house); STYLE.fotos.userData.style = 'fotos';
    CUR = DECOR;
    buildArchitecture(house);
    within(DECOR, () => { buildSala(); buildEntrada(); buildCozinha(); buildServico(); buildBanheiro(); buildCasal(); buildInfantil(); });
    for (const g of [DECOR, STYLE.tour, STYLE.fotos, ARCH.inner, ARCH.ceiling, ...Object.values(ARCH.ext)]) mergeKeep(g);
    const walls = [ARCH.inner, ...Object.values(ARCH.ext)].flatMap((g) => g.children.filter((c) => c.isMesh && c.material === M.wall));
    return { house, styles: { tour: STYLE.tour, fotos: STYLE.fotos }, doors: DOORS.slice(), coll: COLL.slice(), floors: ARCH.floors, doorGroup: ARCH.doors, walls };
  }
  function theme(name, v) { applyTheme(name); if (v) { v.styles.tour.visible = name === 'tour'; v.styles.fotos.visible = name === 'fotos'; } }
  function night(t) {
    if (!ready) return;
    M.led.emissiveIntensity = .5 + 1.9 * t; M.bulb.emissiveIntensity = .35 + 2.65 * t; M.shade.emissiveIntensity = 1.1 * t;
  }
  return { build, theme, night, roomAt, ROOMS, VIEWS, W_IN, D_IN, H, T, EYE, DOOR_H, get style() { return CURRENT_STYLE; } };
}
""")


def build(out_dir: Path, extra: str = "") -> None:
    src = out_dir / "src"
    js = "\n".join(modules(src)) + ("\n" + extra if extra else "")
    shell = (src / "shell.html").read_text(encoding="utf-8")
    out = shell.replace("/*__JS__*/", js)
    (out_dir / "index.html").write_text(out, encoding="utf-8")
    print(f"{(out_dir / 'index.html').relative_to(here)} gerado ({len(out) // 1024} KB)")


build(here)
build(here / "condominio", apto_kit())
