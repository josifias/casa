// ============================================================
// 01 · CORE — imports, medidas e implantação do condomínio
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PARAMS = new URLSearchParams(location.search);
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const LOW_END = IS_TOUCH && (navigator.hardwareConcurrency || 4) <= 4;

// Coordenadas em metros, origem no canto noroeste do terreno: x 0..82 (oeste→leste),
// z 0..130 (norte→sul), y para cima. Medidas tiradas do masterplan de divulgação
// (escala ≈ 7,7 px/m, conferida pelas unidades de 7,6 m do apartamento tipo).
const LOT_W = 82, LOT_D = 130;
const XMIN = -24, XMAX = 106, ZMIN = -24, ZMAX = 152;   // área caminhável (inclui as ruas)
const EYE = 1.6;

// Prédio = 2 blocos lado a lado; cada fileira tem 4 apartamentos de 7,6 m.
const UNIT = 7.6, ROW = 4.8, COR = 2.8, FLOOR_H = 2.8;
const BLEN = UNIT * 4, BWID = ROW * 2 + COR;          // 30,4 × 12,4 m
const BUILDINGS = [
  // x/z = canto do espaço reservado no masterplan (32 × 13 m); dir 'h' = comprido em x
  { id: 'A', x: 7,  z: 38,  dir: 'h', blocks: ['01', '02'], floors: 5 },
  { id: 'B', x: 7,  z: 57,  dir: 'h', blocks: ['03', '04'], floors: 5 },
  { id: 'C', x: 6,  z: 91,  dir: 'h', blocks: ['05', '06'], floors: 5 },
  { id: 'D', x: 43, z: 91,  dir: 'h', blocks: ['11', '12'], floors: 5 },
  { id: 'E', x: 6,  z: 110, dir: 'h', blocks: ['07', '08'], floors: 5 },
  { id: 'F', x: 43, z: 110, dir: 'h', blocks: ['09', '10'], floors: 5 },
  { id: 'G', x: 62, z: 7,   dir: 'v', blocks: ['16', '15'], floors: 4 },
  { id: 'H', x: 62, z: 42,  dir: 'v', blocks: ['14', '13'], floors: 4 },
];
// retângulo real do prédio (centralizado no espaço reservado)
function bRect(b) {
  return b.dir === 'h'
    ? { x0: b.x + .8, z0: b.z + .3, x1: b.x + .8 + BLEN, z1: b.z + .3 + BWID }
    : { x0: b.x + .3, z0: b.z + .8, x1: b.x + .3 + BWID, z1: b.z + .8 + BLEN };
}

// Rótulos da vista aérea/planta
const SPOTS = [
  { nome: 'Guarita', x: 3.5, z: 85.5 },
  { nome: 'Piscina', x: 5.5, z: 26 },
  { nome: 'Solarium', x: 12, z: 27 },
  { nome: 'Salão de festas', x: 22.5, z: 26.5 },
  { nome: 'Apoio do salão', x: 17, z: 14 },
  { nome: 'Playground', x: 25, z: 14.5 },
  { nome: 'Espaço fitness', x: 8.5, z: 14 },
  { nome: 'Área técnica', x: 41, z: 15 },
  { nome: 'Bicicletário', x: 55.5, z: 19 },
  { nome: 'Redário', x: 60.5, z: 3 },
  { nome: 'Piquenique', x: 72, z: 3 },
  { nome: 'Praça', x: 40.5, z: 106.5 },
  { nome: 'Praça de jogos', x: 40.5, z: 120.5 },
  { nome: 'Pet place', x: 79, z: 116 },
  { nome: 'Estacionamento', x: 49, z: 52 },
];

// Pontos de teletransporte do passeio
const PLACES = [
  { id: 'portaria', nome: 'Portaria', icon: 'gate', pos: [-2, 78.5], look: [20, 78.5] },
  { id: 'estacionamento', nome: 'Estaciona-mento', icon: 'car', pos: [12, 82], look: [49, 62] },
  { id: 'piscina', nome: 'Piscina', icon: 'pool', pos: [12, 19.6], look: [5, 28] },
  { id: 'salao', nome: 'Salão de festas', icon: 'party', pos: [25, 32], look: [21.5, 22.5] },
  { id: 'playground', nome: 'Playground', icon: 'slide', pos: [25, 20.4], look: [25, 13] },
  { id: 'fitness', nome: 'Fitness', icon: 'gym', pos: [13.6, 14], look: [6, 14] },
  { id: 'praca', nome: 'Praça', icon: 'tree', pos: [40.5, 99], look: [40.5, 107] },
  { id: 'jogos', nome: 'Praça de jogos', icon: 'ping', pos: [40.5, 113.5], look: [40.5, 121] },
  { id: 'pet', nome: 'Pet place', icon: 'paw', pos: [76, 108], look: [79, 116] },
  { id: 'redario', nome: 'Redário', icon: 'hammock', pos: [67, 4], look: [59, 3] },
  { id: 'bicicletario', nome: 'Bicicle-tário', icon: 'bike', pos: [58.8, 12], look: [55, 20] },
  { id: 'blocos', nome: 'Blocos', icon: 'bldg', pos: [3, 54], look: [40, 54] },
];

// ---------- utilitários ----------
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Em que lugar o jogador está (para a legenda do mapa)
const AREAS = [
  ['Portaria', -4, 68, 7, 91], ['Piscina', 2, 19, 15, 34.5], ['Espaço fitness', 4.5, 10.5, 13.5, 18.5],
  ['Apoio do salão', 14.5, 10.5, 20.5, 18.5], ['Playground', 20.5, 10.5, 30.5, 19.5], ['Salão de festas', 15.5, 20.5, 30.5, 33.5],
  ['Área técnica', 31, 1, 52, 31], ['Bicicletário', 53, 8, 58.5, 31], ['Redário', 54, 0, 65, 7.5], ['Piquenique', 65, 0, 78, 7.5],
  ['Praça', 37, 103, 44, 111], ['Praça de jogos', 37, 116, 44, 125], ['Pet place', 76.5, 109.5, 81.5, 123.5],
  ['Estacionamento', 1, 75, 80, 89], ['Estacionamento', 41, 31, 58, 75],
];
function placeName(x, z) {
  for (const [n, x0, z0, x1, z1] of AREAS) if (x >= x0 && x < x1 && z >= z0 && z < z1) return n;
  if (x < 0 || z < 0 || x >= LOT_W || z >= LOT_D) return 'Rua';
  for (const b of BUILDINGS) {
    const r = bRect(b);
    if (x >= r.x0 - 2 && x < r.x1 + 2 && z >= r.z0 - 2 && z < r.z1 + 2) {
      const first = b.dir === 'h' ? x < (r.x0 + r.x1) / 2 : z < (r.z0 + r.z1) / 2;
      return 'Bloco ' + (first ? b.blocks[0] : b.blocks[1]);
    }
  }
  let best = null, bd = 1e9;
  for (const s of SPOTS) { const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = s; } }
  return bd < 9 ? best.nome : 'Áreas comuns';
}
