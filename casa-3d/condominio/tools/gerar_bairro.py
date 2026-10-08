"""Gera condominio/bairro.js: o entorno real do condomínio (três quarteirões para cada lado).

Fonte: OpenStreetMap (© colaboradores do OpenStreetMap, licença ODbL 1.0). O script baixa a área
pela API do OSM, encontra as quatro ruas que cercam o terreno (masterplan: Marcelino Lopes ao norte,
Nadir Saboya a oeste, José Vilar de Andrade ao sul e Brigadeiro Haroldo Veloso a leste), calcula a
rotação/escala que encaixa esse quarteirão no terreno do modelo (x 0..82, z 0..130) e gera ruas,
calçadas, quadras, prédios (altura pelo nº de andares do OSM), muros, postes, árvores e carros.
Onde o OSM não tem construção mapeada na frente das quadras entram casas ilustrativas.

Uso (precisa de shapely):  python gerar_bairro.py [saida=../bairro.js]
"""
import json, math, random, sys, os, urllib.request
import xml.etree.ElementTree as ET
from shapely.geometry import Polygon, LineString, Point, box, MultiPolygon, MultiLineString, GeometryCollection
from shapely.ops import unary_union
from shapely.geometry.polygon import orient

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'bairro.js')
BBOX = (-38.4715, -3.7970, -38.4585, -3.7840)   # oeste, sul, leste, norte
LAT0, LON0 = -3.7912, -38.4650
CACHE = os.path.join(HERE, 'area.osm')           # não vai para o git

# ---------- 1. baixa e lê o OSM ----------
if not os.path.exists(CACHE):
    url = 'https://api.openstreetmap.org/api/0.6/map?bbox=%f,%f,%f,%f' % BBOX
    req = urllib.request.Request(url, headers={'User-Agent': 'casa3d-bairro/1.0'})
    open(CACHE, 'wb').write(urllib.request.urlopen(req, timeout=180).read())
root = ET.parse(CACHE).getroot()
nodes = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in root.iter('node')}
def local(ll):   # metros: x para leste, y para sul
    return ((ll[1] - LON0) * 111320 * math.cos(math.radians(LAT0)), -(ll[0] - LAT0) * 110574)
raw = []
for w in root.iter('way'):
    tags = {k.get('k'): k.get('v') for k in w.iter('tag')}
    raw.append({'id': w.get('id'), 'tags': tags, 'pts': [local(nodes[n.get('ref')]) for n in w.iter('nd') if n.get('ref') in nodes]})

# ---------- 2. alinha o quarteirão real ao terreno do modelo ----------
def street(name, hw=None):
    ls = [LineString(w['pts']) for w in raw if w['tags'].get('name') == name and 'highway' in w['tags'] and len(w['pts']) > 1
          and (hw is None or w['tags']['highway'] == hw) and LineString(w['pts']).distance(Point(50, 140)) < 260]
    return max(ls, key=lambda L: L.length)
def cross(a, b):
    p = a.intersection(b)
    if p.is_empty:   # estende o início de b (a rua leste pode não tocar a de cima)
        c = list(b.coords); d = (c[1][0] - c[0][0], c[1][1] - c[0][1]); L = math.hypot(*d)
        p = a.intersection(LineString([(c[0][0] - d[0] / L * 40, c[0][1] - d[1] / L * 40)] + c[1:]))
    return (p.x, p.y)
N_, W_, S_, E_ = street('Rua Marcelino Lopes'), street('Rua Nadir Saboya'), street('Rua José Vilar de Andrade'), street('Rua Brigadeiro Haroldo Veloso', 'residential')
NW, NE, SWc, SE = cross(N_, W_), cross(N_, E_), cross(S_, W_), cross(S_, E_)
ang = (-math.atan2(NE[1] - NW[1], NE[0] - NW[0]) - math.atan2(SE[1] - SWc[1], SE[0] - SWc[0])
       + math.atan2(SWc[0] - NW[0], SWc[1] - NW[1]) + math.atan2(SE[0] - NE[0], SE[1] - NE[1])) / 4
ca, sa = math.cos(ang), math.sin(ang)
rot = lambda p: (p[0] * ca - p[1] * sa, p[0] * sa + p[1] * ca)
cr = [rot(p) for p in (NW, NE, SWc, SE)]
Cr = (sum(p[0] for p in cr) / 4, sum(p[1] for p in cr) / 4)
wr = ((cr[1][0] - cr[0][0]) + (cr[3][0] - cr[2][0])) / 2; hr = ((cr[2][1] - cr[0][1]) + (cr[3][1] - cr[1][1])) / 2
SC = (98 / wr + 144 / hr) / 2          # eixos das ruas do modelo: x -7..91, z -7..137
print('rotação %.2f°  escala %.4f  quarteirão real %.1f × %.1f m' % (math.degrees(ang), SC, wr, hr))
def M(p):
    q = rot(p); return ((q[0] - Cr[0]) * SC + 42, (q[1] - Cr[1]) * SC + 65)
ways = [{'id': w['id'], 'tags': w['tags'], 'pts': [M(p) for p in w['pts']]} for w in raw]

# ---------- 3. gera o entorno ----------
REG = box(-330, -470, 400, 450)
LOT = box(0, 0, 82, 130)
SW = 3.0                                   # largura da calçada
GATES = box(-4, 64, 1, 92)                 # portões do condomínio: nada de poste/árvore/carro na frente
rnd = random.Random(2024)


def polys(g):
    if g.is_empty: return []
    if isinstance(g, Polygon): return [g]
    if isinstance(g, (MultiPolygon, GeometryCollection)): return [p for q in g.geoms for p in polys(q)]
    return []


def lines_of(g):
    if g.is_empty: return []
    if isinstance(g, LineString): return [g]
    if isinstance(g, (MultiLineString, GeometryCollection)): return [l for q in g.geoms for l in lines_of(q)]
    return []


def width(t):
    h = t['highway']
    if h in ('secondary', 'secondary_link', 'primary'): return 10.5 if t.get('oneway') == 'yes' else 14
    if h == 'tertiary': return 10
    if h in ('residential', 'unclassified'): return 8
    if h == 'living_street': return 5.5
    if h in ('path', 'track'): return 10
    return None


# ---------- vias ----------
public, private = [], []
for w in ways:
    t, p = w['tags'], w['pts']
    h = t.get('highway')
    if not h or len(p) < 2: continue
    L = LineString(p)
    if not L.intersects(REG.buffer(80)): continue
    priv = t.get('access') in ('private', 'no')
    if h == 'path' and not t.get('name'): continue
    wd = width(t)
    if priv or wd is None:
        if h in ('service', 'living_street', 'residential'): private.append(L.buffer(2.2 if h == 'service' else 2.8))
        continue
    dirt = h in ('path', 'track') or t.get('surface') in ('unpaved', 'dirt', 'sand', 'ground', 'gravel', 'earth')
    public.append({'L': L, 'w': wd, 'dirt': dirt, 'hw': h})
print('vias públicas', len(public), 'privadas (só desenho)', len(private))

asph = unary_union([r['L'].buffer(r['w'] / 2) for r in public if not r['dirt']]).intersection(REG)
dirt = unary_union([r['L'].buffer(r['w'] / 2) for r in public if r['dirt']]).intersection(REG).difference(asph)
roads = unary_union([asph, dirt])
walkway = unary_union([r['L'].buffer(r['w'] / 2 + SW) for r in public]).intersection(REG)
sidewalk = walkway.difference(roads)
blocks = [b for b in polys(REG.difference(walkway)) if b.area > 25]
# trechos de rua que só se ligam ao resto por fora da área: desenhados, mas não caminháveis
wparts = polys(walkway)
main = max(wparts, key=lambda q: q.intersection(box(-20, -20, 100, 150)).area)
nowalk = [q for q in wparts if q is not main]
print('trechos isolados', len(nowalk), [round(q.area) for q in nowalk])
condo = [b for b in blocks if b.contains(Point(41, 65))][0]
print('quadra do condomínio', [round(v, 1) for v in condo.bounds], 'área', round(condo.area))
blocks = [b for b in blocks if b is not condo]
sidewalk = unary_union([sidewalk, condo.difference(LOT)])

# ---------- áreas verdes e água ----------
water, green = [], []
for w in ways:
    t, p = w['tags'], w['pts']
    if len(p) < 4 or p[0] != p[-1] or 'building' in t or 'highway' in t: continue
    try: P = Polygon(p).buffer(0)
    except Exception: continue
    if not P.intersects(REG): continue
    if t.get('natural') == 'water' or t.get('water'): water.append(P)
    elif t.get('natural') in ('wetland', 'wood', 'scrub', 'grassland') or t.get('landuse') in ('grass', 'meadow', 'forest') or t.get('leisure') in ('park', 'pitch', 'garden'):
        green.append(P)
water = unary_union(water).intersection(REG).difference(walkway) if water else Polygon()
greenU = unary_union(green).intersection(REG).difference(walkway) if green else Polygon()
blk = []
for b in blocks:
    natural = b.intersection(unary_union([water, greenU])).area / b.area
    blk.append({'g': b, 'green': natural > .35})
privU = unary_union(private).intersection(unary_union([b['g'] for b in blk if not b['green']])) if private else Polygon()

# ---------- prédios ----------
PAL = ['#f3efe6', '#ece6d8', '#f1e7c9', '#e9dcc0', '#dfe6dc', '#d8e1ea', '#efd9c6', '#e7c9a6', '#d9d4cb', '#f2e3b5', '#cfd8c3', '#e6d2d0', '#c9d3dc', '#f5f2ec']
urbanU = unary_union([b['g'] for b in blk if not b['green']] + [b['g'] for b in blk if b['green']])
blds, bunion = [], []
for w in ways:
    t, p = w['tags'], w['pts']
    if 'building' not in t or len(p) < 4 or p[0] != p[-1]: continue
    try: P = Polygon(p).buffer(0)
    except Exception: continue
    if not P.intersects(REG) or P.intersects(condo): continue
    P = P.intersection(urbanU)
    parts = polys(P)
    if not parts: continue
    P = max(parts, key=lambda q: q.area).simplify(.2)
    if P.area < 9 or not isinstance(P, Polygon): continue
    P = orient(Polygon(P.exterior), 1.0)
    lv = t.get('building:levels')
    r = random.Random(int(w['id']))
    try: lv = max(1, min(6, int(float(lv))))
    except Exception: lv = 1 if P.area < 110 else (2 if r.random() < .45 else 1)
    h = lv * 3.0 + (.4 if lv == 1 else .2)
    mrr = P.minimum_rotated_rectangle
    rect = P.area / mrr.area if mrr.area else 0
    roof = None
    if lv <= 2 and rect > .86 and 20 < P.area < 480:
        c = list(mrr.exterior.coords)[:4]
        e1 = (c[1][0] - c[0][0], c[1][1] - c[0][1]); e2 = (c[2][0] - c[1][0], c[2][1] - c[1][1])
        l1, l2 = math.hypot(*e1), math.hypot(*e2)
        u = e1 if l1 >= l2 else e2; L_, W_ = max(l1, l2), min(l1, l2)
        cx, cz = mrr.centroid.x, mrr.centroid.y
        roof = [round(cx, 2), round(cz, 2), round(math.atan2(u[1], u[0]), 4), round(L_, 2), round(W_, 2)]
    tank = None
    if roof is None and r.random() < .55 and P.area > 40:
        q = P.representative_point(); tank = [round(q.x, 1), round(q.y, 1)]
    blds.append({'ring': list(P.exterior.coords)[:-1], 'h': round(h, 1), 'c': PAL[r.randrange(len(PAL))], 'roof': roof, 'tank': tank, 'lv': lv,
                 'rc': r.choice(['#b5562f', '#c0623a', '#a84f2c', '#bd5b33', '#9f4a2b']) if roof or (lv <= 2 and r.random() < .55) else r.choice(['#b4b0a7', '#a9a59c', '#bfbab0'])})
    bunion.append(P)
bunion = unary_union(bunion)
print('prédios', len(blds))

# ---------- casas ilustrativas onde o OSM não tem construção mapeada (só na frente das quadras) ----------
from shapely.strtree import STRtree
bparts = polys(bunion)
btree = STRtree(bparts)
blocked_area = unary_union([greenU, water, privU.buffer(.5) if not privU.is_empty else Polygon()])
RCS = ['#b5562f', '#c0623a', '#a84f2c', '#bd5b33', '#9f4a2b', '#b4b0a7', '#a9a59c']
fills, fgrid = [], {}
def rect(o, u, n, w, d):
    return Polygon([o, (o[0] + u[0] * w, o[1] + u[1] * w), (o[0] + u[0] * w + n[0] * d, o[1] + u[1] * w + n[1] * d), (o[0] + n[0] * d, o[1] + n[1] * d)])
def fill_hit(P):
    x0, z0, x1, z1 = P.bounds
    for gx in range(int(x0 // 20), int(x1 // 20) + 1):
        for gz in range(int(z0 // 20), int(z1 // 20) + 1):
            for Q in fgrid.get((gx, gz), []):
                if Q.intersects(P): return True
    return False
def fill_add(P):
    x0, z0, x1, z1 = P.bounds
    for gx in range(int(x0 // 20), int(x1 // 20) + 1):
        for gz in range(int(z0 // 20), int(z1 // 20) + 1): fgrid.setdefault((gx, gz), []).append(P)
for b in blk:
    if b['green']: continue
    poly = orient(b['g'], 1.0); inner = poly.buffer(-.35)
    cs = list(poly.exterior.simplify(1.5).coords)
    for i in range(len(cs) - 1):
        a, c = cs[i], cs[i + 1]; L = math.hypot(c[0] - a[0], c[1] - a[1])
        if L < 8: continue
        u = ((c[0] - a[0]) / L, (c[1] - a[1]) / L); n = (-u[1], u[0])   # interior à esquerda
        s = rnd.uniform(.3, 2.5)
        while s < L - 7:
            w = rnd.uniform(7, 11.5)
            if s + w > L - .3: break
            o = (a[0] + u[0] * s, a[1] + u[1] * s)
            lot = rect((o[0] + u[0] * 1.5 + n[0] * .5, o[1] + u[1] * 1.5 + n[1] * .5), u, n, w - 3, 13)
            if sum(lot.intersection(bparts[k]).area for k in btree.query(lot)) > .12 * lot.area or lot.intersection(blocked_area).area > .2 * lot.area:
                s += w; continue
            setback = rnd.choice([0, 0, 1.5, 3, 4.5]); depth = rnd.uniform(9, 16); gap = rnd.uniform(0, 1.4)
            hp = (o[0] + u[0] * gap / 2 + n[0] * setback, o[1] + u[1] * gap / 2 + n[1] * setback)
            H = rect(hp, u, n, w - gap, depth)
            if inner.contains(H) and not fill_hit(H) and not H.intersects(blocked_area):
                fill_add(H)
                lv = 2 if rnd.random() < .28 else 1
                hip = rnd.random() < .78
                cx, cz = H.centroid.x, H.centroid.y
                fills.append([round(cx, 2), round(cz, 2), round(math.atan2(u[1], u[0]), 4), round(w - gap, 2), round(depth, 2),
                              round(lv * 3.0 + (.4 if lv == 1 else .2), 1), rnd.randrange(len(PAL)), rnd.randrange(5) if hip else 5 + rnd.randrange(2), 1 if hip else 0,
                              1 if (not hip and rnd.random() < .6) else 0])
            s += w
print('casas ilustrativas', len(fills))
bunion = unary_union([bunion] + [P for v in fgrid.values() for P in v])

# ---------- muros, portões e gradis no alinhamento das quadras ----------
walls = []
for b in blk:
    if b['green']: continue
    ring = b['g'].buffer(-.12).exterior if not b['g'].buffer(-.12).is_empty and isinstance(b['g'].buffer(-.12), Polygon) else None
    if ring is None: continue
    free = LineString(ring.coords).difference(bunion.buffer(.5))
    for ln in lines_of(free):
        pts = list(ln.coords)
        # caminha pela linha cortando em trechos: muro, portão ou gradil
        segs = []
        for i in range(len(pts) - 1):
            a, c = pts[i], pts[i + 1]; L = math.hypot(c[0] - a[0], c[1] - a[1])
            if L < .05: continue
            segs.append((a, c, L))
        kind, left = 0, rnd.uniform(4, 11)
        for a, c, L in segs:
            s = 0
            while s < L - 1e-6:
                step = min(left, L - s)
                t0, t1 = s / L, (s + step) / L
                p0 = (a[0] + (c[0] - a[0]) * t0, a[1] + (c[1] - a[1]) * t0); p1 = (a[0] + (c[0] - a[0]) * t1, a[1] + (c[1] - a[1]) * t1)
                if step > .15: walls.append([round(p0[0], 2), round(p0[1], 2), round(p1[0], 2), round(p1[1], 2), kind, PAL.index(rnd.choice(PAL))])
                s += step; left -= step
                if left <= 1e-6:
                    if kind == 0: kind = rnd.choices([1, 2, 0], [.45, .25, .3])[0]
                    else: kind = 0
                    left = {0: rnd.uniform(4, 11), 1: rnd.uniform(2.6, 3.4), 2: rnd.uniform(3, 7)}[kind]
print('trechos de muro', len(walls))

# ---------- postes, fiação, árvores, carros, faixas ----------
def is_free(p, r=0.0):
    P = Point(p)
    return sidewalk.buffer(-.2).contains(P) and not GATES.contains(P) and not LOT.buffer(.5).contains(P)


poles, pole_runs, trees, cars, dashes = [], [], [], [], []
centerU = unary_union([r['L'] for r in public])
for r in public:
    L = r['L'].intersection(REG)
    for ln in lines_of(L):
        if ln.length < 12: continue
        # postes do lado direito, a cada ~32 m
        run, d = [], 9 + rnd.uniform(0, 6)
        while d < ln.length - 4:
            p = ln.interpolate(d); q = ln.interpolate(min(d + .5, ln.length))
            dx, dz = q.x - p.x, q.y - p.y; n = math.hypot(dx, dz) or 1
            nx, nz = dz / n, -dx / n          # direita do sentido da via
            pos = (p.x + nx * (r['w'] / 2 + .45), p.y + nz * (r['w'] / 2 + .45))
            if is_free(pos) and all(math.hypot(pos[0] - o[0], pos[1] - o[1]) > 14 for o in poles[-60:]):
                poles.append([round(pos[0], 2), round(pos[1], 2), round(-nx, 3), round(-nz, 3)]); run.append(len(poles) - 1)
            elif run:
                pole_runs.append(run); run = []
            d += 32
        if len(run) > 1: pole_runs.append(run)
        # árvores de calçada dos dois lados
        d = rnd.uniform(4, 14)
        while d < ln.length - 3:
            p = ln.interpolate(d); q = ln.interpolate(min(d + .5, ln.length))
            dx, dz = q.x - p.x, q.y - p.y; n = math.hypot(dx, dz) or 1
            side = rnd.choice([-1, 1])
            pos = (p.x + dz / n * side * (r['w'] / 2 + 1.0), p.y - dx / n * side * (r['w'] / 2 + 1.0))
            if rnd.random() < .5 and is_free(pos) and all(math.hypot(pos[0] - o[0], pos[1] - o[1]) > 3.5 for o in poles[-80:]) and all(math.hypot(pos[0] - o[0], pos[1] - o[1]) > 6 for o in trees[-40:]):
                trees.append([round(pos[0], 2), round(pos[1], 2), rnd.choice([0, 0, 1, 2, 3])])
            d += rnd.uniform(14, 26)
        # carros estacionados (só em vias quase alinhadas aos eixos)
        if not r['dirt'] and r['hw'] in ('residential', 'tertiary', 'unclassified'):
            d = rnd.uniform(6, 20)
            while d < ln.length - 6:
                p = ln.interpolate(d); q = ln.interpolate(min(d + .5, ln.length))
                dx, dz = q.x - p.x, q.y - p.y; n = math.hypot(dx, dz) or 1
                ang = math.degrees(math.atan2(dz, dx)) % 180
                axis = 'x' if ang < 8 or ang > 172 else 'z' if abs(ang - 90) < 8 else None
                side = rnd.choice([-1, 1]); off = r['w'] / 2 - 1.15
                pos = (p.x + dz / n * side * off, p.y - dx / n * side * off)
                others = centerU.difference(r['L'].buffer(.5))
                if axis and rnd.random() < .33 and Point(pos).distance(others) > 10 and not GATES.buffer(3).contains(Point(pos)) and roads.contains(Point(pos).buffer(.85)):
                    flip = (dx if axis == 'x' else dz) * side < 0
                    cars.append([round(pos[0], 2), round(pos[1], 2), 1 if axis == 'x' else 0, rnd.randrange(12), 1 if flip else 0, rnd.choice([0, 0, 1, 2])])
                d += rnd.uniform(18, 40)
        # faixa central tracejada nas vias asfaltadas mais largas
        if not r['dirt'] and r['w'] >= 8:
            others = centerU.difference(r['L'].buffer(.5)).buffer(r['w'] / 2 + 6)
            d = 1
            while d < ln.length - 2.2:
                a, c = ln.interpolate(d), ln.interpolate(d + 2.2)
                if not others.contains(a) and not others.contains(c):
                    dashes.append([round(a.x, 2), round(a.y, 2), round(c.x, 2), round(c.y, 2), 1 if r['w'] >= 10 else 0])
                d += 4.4
# árvores nas áreas verdes
for b in blk:
    if not b['green']: continue
    g = b['g'].difference(water.buffer(1.5)) if not water.is_empty else b['g']
    n = int(g.area / 260)
    x0, z0, x1, z1 = g.bounds
    tries = 0
    while n > 0 and tries < n * 20:
        tries += 1
        p = (rnd.uniform(x0, x1), rnd.uniform(z0, z1))
        if g.contains(Point(p).buffer(1.5)):
            trees.append([round(p[0], 2), round(p[1], 2), rnd.choice([0, 1, 2, 2, 3])]); n -= 1
print('postes', len(poles), 'linhas de fiação', len(pole_runs), 'árvores', len(trees), 'carros', len(cars), 'faixas', len(dashes))

# ---------- codificação compacta (decímetros, deltas) ----------
def enc_ring(coords):
    out, px, pz = [], 0, 0
    for x, z in coords:
        X, Z = int(round(x * 10)), int(round(z * 10))
        out += [X - px, Z - pz]; px, pz = X, Z
    return out


def enc_poly(P):
    P = orient(P, 1.0)
    return [enc_ring(list(P.exterior.coords)[:-1])] + [enc_ring(list(h.coords)[:-1]) for h in P.interiors]


def enc_multi(g):
    return [enc_poly(p) for p in polys(g) if p.area > .5]


lines_out = []
for r in public:
    for ln in lines_of(r['L'].intersection(REG.buffer(10))):
        lines_out.append([r['w'], 1 if r['dirt'] else 0, enc_ring(list(ln.simplify(.5).coords))])
data = {
    'asph': enc_multi(asph), 'dirt': enc_multi(dirt), 'walk': enc_multi(sidewalk),
    'blocks': [[1 if b['green'] else 0, enc_poly(b['g'])] for b in blk],
    'water': enc_multi(water), 'green': enc_multi(greenU.difference(water) if not water.is_empty else greenU), 'paving': enc_multi(privU),
    'pal': PAL,
    'bld': [[enc_ring(b['ring']), b['h'], PAL.index(b['c']), b['rc'], b['roof'], b['tank']] for b in blds],
    'fill': fills, 'rcs': RCS,
    'nowalk': [enc_poly(q) for q in nowalk],
    'walls': walls, 'poles': poles, 'runs': pole_runs, 'trees': trees, 'cars': cars, 'dash': dashes, 'lines': lines_out,
    'reg': list(REG.bounds),
}
js = ('// Entorno do condomínio gerado a partir do OpenStreetMap (© colaboradores do OpenStreetMap, ODbL 1.0:\n'
      '// https://www.openstreetmap.org/copyright). Coordenadas do modelo em decímetros com deltas.\n'
      'window.BAIRRO=' + json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ';\n')
open(OUT, 'w', encoding='utf-8').write(js)
print(OUT, len(js) // 1024, 'KB')
