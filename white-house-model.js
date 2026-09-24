import * as THREE from 'three';

const stage = document.querySelector('three-d-stage');
const { THREE: T } = await stage.ready;

/* LEGO metrics (meters) */
const S = 0.008;      // stud pitch
const BH = 0.0096;    // brick height
const PH = 0.0032;    // plate height

const M = {
  white:  new T.MeshStandardMaterial({ color: 0xf4f4ef, roughness: 0.42, metalness: 0.0 }),
  green:  new T.MeshStandardMaterial({ color: 0x4a8f3c, roughness: 0.5,  metalness: 0.0 }),
  dirt:   new T.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 0.85, metalness: 0.0 }),
  grey:   new T.MeshStandardMaterial({ color: 0x6f7168, roughness: 0.55, metalness: 0.15 }),
  glass:  new T.MeshStandardMaterial({ color: 0x8fb6d6, roughness: 0.2,  metalness: 0.25 }),
  orange: new T.MeshStandardMaterial({ color: 0xe0851f, roughness: 0.45, metalness: 0.0 }),
};
for (const k in M) M[k].name = k;

const model = new T.Group();
model.name = 'white_house_lego_set';

/* --- geometry merge (no addons available) --- */
function merge(geoms) {
  const keys = ['position', 'normal', 'uv'];
  const bufs = { position: [], normal: [], uv: [] };
  for (const g of geoms) {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of keys) { const a = n.getAttribute(k); if (a) bufs[k].push(a.array); }
  }
  const out = new T.BufferGeometry();
  for (const k of keys) {
    const total = bufs[k].reduce((s, a) => s + a.length, 0);
    if (!total) continue;
    const big = new Float32Array(total);
    let o = 0; for (const a of bufs[k]) { big.set(a, o); o += a.length; }
    out.setAttribute(k, new T.BufferAttribute(big, k === 'uv' ? 2 : 3));
  }
  return out;
}

const studBuckets = {};
const STUD = new T.CylinderGeometry(0.0024, 0.0024, 0.0019, 12);

function addStuds(x0, z0, w, d, yTop, mat, skip = []) {
  const list = studBuckets[mat] || (studBuckets[mat] = []);
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
    const cx = x0 + i + 0.5, cz = z0 + j + 0.5;
    if (skip.some(r => cx > r[0] && cx < r[0] + r[2] && cz > r[1] && cz < r[1] + r[3])) continue;
    const g = STUD.clone();
    g.applyMatrix4(new T.Matrix4().makeTranslation(cx * S, yTop + 0.00095, cz * S));
    list.push(g);
  }
}

function brick(name, mat, x, z, w, d, y, h, studs = false) {
  const m = new T.Mesh(new T.BoxGeometry(w * S, h, d * S), M[mat]);
  m.position.set((x + w / 2) * S, y + h / 2, (z + d / 2) * S);
  m.name = name;
  m.castShadow = m.receiveShadow = true;
  model.add(m);
  if (studs) addStuds(x, z, w, d, y + h, mat);
  return m;
}

/* ---------------- baseplate (pit cut out) ---------------- */
const PIT = { x: 2, z: 11, w: 12, d: 10 };
const PLATE_T = 2 * PH;
const plates = [
  ['baseplate_north', 0, 0, 44, 11],
  ['baseplate_south', 0, 21, 44, 9],
  ['baseplate_west', 0, 11, 2, 10],
  ['baseplate_east', 14, 11, 30, 10],
];
for (const [n, x, z, w, d] of plates) brick(n, 'green', x, z, w, d, -PLATE_T, PLATE_T);

/* solid landscaped base under the plate, pit footprint left open */
const GROUND_Y = -4 * BH - PLATE_T;
for (const [n, x, z, w, d] of plates)
  brick(n.replace('baseplate', 'terrain'), 'dirt', x, z, w, d, GROUND_Y, -PLATE_T - GROUND_Y);

/* lawn studs, skipping building footprints */
const foot = [[15, 12, 16, 10], [32, 14, 10, 4], [20, 8, 6, 4], [31, 15, 1, 2]];
for (const [n, x, z, w, d] of plates) addStuds(x, z, w, d, 0, 'green', foot);

/* ---------------- excavation pit (removed West Wing) ---------------- */
const PITY = -4 * BH;
brick('pit_floor_dirt', 'dirt', PIT.x, PIT.z, PIT.w, PIT.d, PITY - PLATE_T, PLATE_T);
// pit walls (shoring)
brick('pit_wall_north', 'dirt', PIT.x, PIT.z - 0.5, PIT.w, 0.5, PITY, -PITY);
brick('pit_wall_south', 'dirt', PIT.x, PIT.z + PIT.d, PIT.w, 0.5, PITY, -PITY);
brick('pit_wall_west', 'dirt', PIT.x - 0.5, PIT.z, 0.5, PIT.d, PITY, -PITY);
brick('pit_wall_east', 'dirt', PIT.x + PIT.w, PIT.z, 0.5, PIT.d, PITY, -PITY);

/* new foundation footings being laid */
for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
  brick(`footing_${i}${j}`, 'grey', PIT.x + 1.5 + i * 3.5, PIT.z + 1.5 + j * 3, 2, 2, PITY, BH, true);
brick('foundation_strip_a', 'grey', PIT.x + 1, PIT.z + 0.8, 10, 1, PITY, PH);
brick('foundation_strip_b', 'grey', PIT.x + 1, PIT.z + 8, 10, 1, PITY, PH);

/* rubble: loose bricks from the demolished wing */
const rubble = [
  [4.2, 13.4, 2, 1, 0.3], [9.5, 17.2, 1, 2, -0.5], [6.8, 19.4, 2, 2, 0.15],
  [11.4, 12.6, 1, 1, 0], [3.4, 18.1, 1, 2, 0.6],
];
rubble.forEach(([x, z, w, d, rot], i) => {
  const m = brick(`rubble_brick_${i}`, 'white', x, z, w, d, PITY, BH, true);
  m.rotation.y = rot;
});
brick('spoil_heap_low', 'dirt', 3, 23, 6, 4, 0, BH);
brick('spoil_heap_mid', 'dirt', 4, 24, 4, 2.5, BH, BH);
brick('spoil_heap_top', 'dirt', 5, 24.5, 2, 1.5, 2 * BH, BH, true);

/* safety barriers around the open side */
for (let i = 0; i < 4; i++) {
  brick(`barrier_post_n${i}`, 'grey', 2.4 + i * 3.4, 10.2, 0.6, 0.6, 0, BH * 1.2);
  brick(`barrier_rail_n${i}`, 'orange', 2 + i * 3.4, 10.1, 3.2, 0.5, BH, PH);
}
for (let i = 0; i < 3; i++) {
  brick(`barrier_post_w${i}`, 'grey', 1.2, 11.4 + i * 3.4, 0.6, 0.6, 0, BH * 1.2);
  brick(`barrier_rail_w${i}`, 'orange', 1.1, 11 + i * 3.4, 0.5, 3.2, BH, PH);
}

/* ---------------- main residence ---------------- */
const B = { x: 15, z: 12, w: 16, d: 10 };
const WALL_H = 4 * BH;
brick('residence_body', 'white', B.x, B.z, B.w, B.d, 0, WALL_H);
brick('residence_cornice', 'white', B.x - 0.4, B.z - 0.4, B.w + 0.8, B.d + 0.8, WALL_H, PH);
brick('residence_roof_plate', 'white', B.x, B.z, B.w, B.d, WALL_H + PH, PH);
addStuds(B.x + 1, B.z + 1, B.w - 2, B.d - 2, WALL_H + 2 * PH, 'white');
// roof balustrade
brick('balustrade_n', 'white', B.x, B.z, B.w, 0.6, WALL_H + 2 * PH, BH * 0.7);
brick('balustrade_s', 'white', B.x, B.z + B.d - 0.6, B.w, 0.6, WALL_H + 2 * PH, BH * 0.7);
brick('balustrade_w', 'white', B.x, B.z + 0.6, 0.6, B.d - 1.2, WALL_H + 2 * PH, BH * 0.7);
brick('balustrade_e', 'white', B.x + B.w - 0.6, B.z + 0.6, 0.6, B.d - 1.2, WALL_H + 2 * PH, BH * 0.7);

/* windows: merged into one part */
const winGeoms = [];
function window2(x, z, y, w, h, face) {
  const g = new T.BoxGeometry(face === 'z' ? w * S : 0.2 * S, h, face === 'z' ? 0.2 * S : w * S);
  g.applyMatrix4(new T.Matrix4().makeTranslation(x * S, y + h / 2, z * S));
  winGeoms.push(g);
}
for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) {
  const x = B.x + 1.5 + i * 2, y = BH * 0.5 + r * BH * 1.15;
  window2(x, B.z - 0.08, y, 1.1, BH * 0.8, 'z');
  window2(x, B.z + B.d + 0.08, y, 1.1, BH * 0.8, 'z');
}
for (let r = 0; r < 3; r++) for (let j = 0; j < 3; j++) {
  const z = B.z + 2 + j * 3, y = BH * 0.5 + r * BH * 1.15;
  window2(B.x - 0.08, z, y, 1.1, BH * 0.8, 'x');
  window2(B.x + B.w + 0.08, z, y, 1.1, BH * 0.8, 'x');
}
const winMesh = new T.Mesh(merge(winGeoms), M.glass);
winMesh.name = 'windows';
winMesh.castShadow = true;
model.add(winMesh);

/* north portico */
brick('portico_floor', 'white', 20, 8, 6, 4, 0, PH);
for (let i = 0; i < 4; i++) {
  const c = new T.Mesh(new T.CylinderGeometry(0.4 * S, 0.4 * S, WALL_H, 24), M.white);
  c.position.set((20.8 + i * 1.5) * S, PH + WALL_H / 2, 8.8 * S);
  c.name = `portico_column_${i}`;
  c.castShadow = true;
  model.add(c);
}
brick('portico_entablature', 'white', 19.6, 7.6, 6.8, 2, PH + WALL_H, PH * 1.5);
const pedShape = new T.Shape();
pedShape.moveTo(-3.4 * S, 0); pedShape.lineTo(3.4 * S, 0); pedShape.lineTo(0, 1.6 * S); pedShape.closePath();
const ped = new T.Mesh(new T.ExtrudeGeometry(pedShape, { depth: 0.6 * S, bevelEnabled: false }), M.white);
ped.position.set(23 * S, PH + WALL_H + PH * 1.5, 7.9 * S);
ped.name = 'portico_pediment';
ped.castShadow = true;
model.add(ped);
brick('entrance_steps_1', 'white', 21, 6.4, 4, 1.6, 0, PH);
brick('entrance_door', 'grey', 22, 11.9, 2, 0.3, 0, BH * 1.1);

/* south portico (curved colonnade) */
const bow = new T.Mesh(new T.CylinderGeometry(3.2 * S, 3.2 * S, PH, 32, 1, false, 0, Math.PI), M.white);
bow.rotation.y = -Math.PI / 2;
bow.position.set(23 * S, PH / 2, (B.z + B.d) * S);
bow.name = 'south_portico_floor';
model.add(bow);
for (let i = 0; i < 5; i++) {
  const a = Math.PI * (0.12 + i * 0.19);
  const c = new T.Mesh(new T.CylinderGeometry(0.4 * S, 0.4 * S, WALL_H, 24), M.white);
  c.position.set((23 + Math.cos(a) * 2.6) * S, PH + WALL_H / 2, ((B.z + B.d) + Math.sin(a) * 2.6) * S);
  c.name = `south_column_${i}`;
  c.castShadow = true;
  model.add(c);
}
brick('south_portico_roof', 'white', 19.8, B.z + B.d - 0.5, 6.4, 3.6, PH + WALL_H, PH);

/* flagpole */
const pole = new T.Mesh(new T.CylinderGeometry(0.001, 0.001, 0.028, 10), M.grey);
pole.position.set(23 * S, WALL_H + 2 * PH + 0.014, 17 * S);
pole.name = 'flagpole';
model.add(pole);
brick('flag', 'white', 23.1, 16.9, 2, 0.15, WALL_H + 2 * PH + 0.021, 0.005);

/* demolition scar where the west wing was attached */
brick('wing_stub_wall', 'white', 14, 15, 1, 3, 0, BH * 1.6, true);
brick('wing_stub_broken', 'white', 13.2, 15.4, 0.8, 1.2, 0, BH, true);

/* access ramp down into the pit */
brick('pit_ramp_upper', 'dirt', 8.5, 19.3, 3, 1.6, -BH, BH);
brick('pit_ramp_mid', 'dirt', 8.5, 17.9, 3, 1.6, -2.2 * BH, BH);
brick('pit_ramp_lower', 'dirt', 8.5, 16.5, 3, 1.6, -3.4 * BH, BH);
brick('pit_wall_notch', 'dirt', 8.5, PIT.z + PIT.d - 0.55, 3, 0.6, -BH, BH);

/* ---------------- east wing (intact) ---------------- */
brick('east_wing_body', 'white', 32, 14, 10, 4, 0, 2 * BH);
brick('east_wing_roof', 'white', 31.6, 13.6, 10.8, 4.8, 2 * BH, PH);
addStuds(32, 14, 10, 4, 2 * BH + PH, 'white');
brick('east_colonnade_wall', 'white', 31, 15, 1, 2, 0, BH * 1.4, true);
for (let i = 0; i < 5; i++) {
  const c = new T.Mesh(new T.CylinderGeometry(0.35 * S, 0.35 * S, 2 * BH, 20), M.white);
  c.position.set((32.8 + i * 2) * S, BH, 13.7 * S);
  c.name = `east_wing_column_${i}`;
  c.castShadow = true;
  model.add(c);
}
for (let r = 0; r < 4; r++) window2(33.5 + r * 2, 18.08, BH * 0.5, 1.1, BH * 0.8, 'z');

/* ---------------- trees ---------------- */
[[7, 5], [38, 7], [39, 26], [17, 27]].forEach(([x, z], i) => {
  const t = new T.Mesh(new T.CylinderGeometry(0.4 * S, 0.5 * S, 2 * BH, 14), M.dirt);
  t.position.set(x * S, BH, z * S);
  t.name = `tree_trunk_${i}`;
  t.castShadow = true;
  model.add(t);
  const c = new T.Mesh(new T.SphereGeometry(1.8 * S, 24, 16), M.green);
  c.position.set(x * S, 2 * BH + 1.5 * S, z * S);
  c.scale.y = 0.85;
  c.name = `tree_crown_${i}`;
  c.castShadow = true;
  model.add(c);
});

/* ---------------- merged stud meshes ---------------- */
for (const key in studBuckets) {
  const m = new T.Mesh(merge(studBuckets[key]), M[key]);
  m.name = `studs_${key}`;
  m.castShadow = m.receiveShadow = true;
  model.add(m);
}

/* ---------------- minifigure on the north lawn ---------------- */
const FM = {
  suit:  new T.MeshStandardMaterial({ color: 0x1f3f8f, roughness: 0.4 }),
  tie:   new T.MeshStandardMaterial({ color: 0xc4161c, roughness: 0.4 }),
  skin:  new T.MeshStandardMaterial({ color: 0xf2cd37, roughness: 0.35 }),
  hair:  new T.MeshStandardMaterial({ color: 0xe8791e, roughness: 0.5 }),
  ink:   new T.MeshStandardMaterial({ color: 0x151515, roughness: 0.4 }),
};
for (const k in FM) FM[k].name = 'minifig_' + k;
const fig = new T.Group();
fig.name = 'minifigure';
function part(name, geom, mat, x, y, z) {
  const m = new T.Mesh(geom, mat);
  m.position.set(x, y, z); m.name = name; m.castShadow = true;
  fig.add(m); return m;
}
// units: mm, front faces -z
for (const s of [-1, 1]) {
  part(`leg_${s < 0 ? 'l' : 'r'}`, new T.BoxGeometry(7.6, 11, 7.6), FM.suit, s * 3.9, 7.5, 0);
  part(`foot_${s < 0 ? 'l' : 'r'}`, new T.BoxGeometry(7.6, 2, 10), FM.suit, s * 3.9, 1, -1.2);
}
part('hips', new T.BoxGeometry(15.6, 3.2, 8), FM.suit, 0, 14.6, 0);
const torsoG = new T.BoxGeometry(15.6, 12.8, 8);
{ const p = torsoG.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setX(i, p.getX(i) * 0.77); torsoG.computeVertexNormals(); }
part('torso_jacket', torsoG, FM.suit, 0, 22.6, 0);
const vShape = new T.Shape(); vShape.moveTo(-3.4, 0); vShape.lineTo(3.4, 0); vShape.lineTo(0, -7.5); vShape.closePath();
part('shirt', new T.ExtrudeGeometry(vShape, { depth: 0.3, bevelEnabled: false }), M.white, 0, 29, -4.35);
const tShape = new T.Shape();
tShape.moveTo(-0.9, 0); tShape.lineTo(0.9, 0); tShape.lineTo(0.6, -1.4); tShape.lineTo(1.3, -9.5);
tShape.lineTo(0, -11); tShape.lineTo(-1.3, -9.5); tShape.lineTo(-0.6, -1.4); tShape.closePath();
part('tie', new T.ExtrudeGeometry(tShape, { depth: 0.3, bevelEnabled: false }), FM.tie, 0, 28.9, -4.6);
for (const s of [-1, 1]) {
  const a = part(`arm_${s < 0 ? 'l' : 'r'}`, new T.CylinderGeometry(2.1, 2.3, 10.5, 16), FM.suit, s * 8.3, 23, -0.6);
  a.rotation.z = s * 0.14; a.rotation.x = -0.12;
  const h = part(`hand_${s < 0 ? 'l' : 'r'}`, new T.CylinderGeometry(1.6, 1.6, 3, 14), FM.skin, s * 9.1, 16.6, -1.6);
  h.rotation.x = -0.5;
}
part('neck', new T.CylinderGeometry(3, 3, 1.6, 16), FM.skin, 0, 29.8, 0);
part('head', new T.CylinderGeometry(4.8, 4.8, 8.6, 28), FM.skin, 0, 34.9, 0);
for (const s of [-1, 1]) part(`eye_${s < 0 ? 'l' : 'r'}`, new T.SphereGeometry(0.6, 10, 8), FM.ink, s * 1.8, 35.4, -4.65);
part('mouth', new T.BoxGeometry(3, 0.5, 0.4), FM.ink, 0, 32.6, -4.7);
const hair = part('hair', new T.SphereGeometry(5.4, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), FM.hair, 0, 37.2, 0.4);
hair.scale.set(1, 0.72, 1.05);
const fringe = part('hair_fringe', new T.SphereGeometry(3.2, 20, 12), FM.hair, -1.2, 38.8, -3.2);
fringe.scale.set(1.45, 0.45, 0.8);
part('hair_back', new T.BoxGeometry(9.8, 3.6, 3), FM.hair, 0, 36.6, 3.6);
fig.scale.setScalar(0.001 * 0.8);
fig.position.set(29 * S, 0, 4.5 * S);
fig.rotation.y = 0.35;
model.add(fig);

/* ---------------- retail box behind the set ---------------- */
// Set to a logo image path (e.g. './logo.png') to print it in the logo area of the box.
const LOGO_URL = './logo.png';

function renderPreview() {
  const r = stage._renderer;
  if (!r) return null;
  const W = 2432, H = 1280;
  const tmp = new T.Scene();
  tmp.background = new T.Color('#bcd7ee');
  tmp.add(new T.HemisphereLight(0xffffff, 0x8a7a60, 1.7));
  const sun = new T.DirectionalLight(0xffffff, 2.2); sun.position.set(-1, 2, -1.4); tmp.add(sun);
  const pv = model.clone(); tmp.add(pv);
  const c = new T.Box3().setFromObject(pv).getCenter(new T.Vector3());
  const cam = new T.PerspectiveCamera(30, W / H, 0.01, 10);
  cam.position.set(c.x - 0.2, c.y + 0.24, c.z - 0.4);
  cam.lookAt(c.x, c.y - 0.012, c.z);
  const rt = new T.WebGLRenderTarget(W, H);
  rt.texture.colorSpace = T.SRGBColorSpace;
  const prev = r.getRenderTarget();
  r.setRenderTarget(rt); r.render(tmp, cam); r.setRenderTarget(prev);
  const buf = new Uint8Array(W * H * 4);
  r.readRenderTargetPixels(rt, 0, 0, W, H, buf);
  rt.dispose();
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d'); const img = cx.createImageData(W, H);
  for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
  cx.putImageData(img, 0, 0);
  return cv;
}
const preview = renderPreview();

const FW = 1600, FH = 1143;
const front = document.createElement('canvas'); front.width = FW; front.height = FH;
function drawFront(logo) {
  const g = front.getContext('2d');
  g.fillStyle = '#1f4e96'; g.fillRect(0, 0, FW, FH);
  if (preview) g.drawImage(preview, 0, 190, FW, FH - 190 - 150);
  // logo area
  if (logo) {
    const k = Math.min(150 / logo.width, 150 / logo.height);
    g.drawImage(logo, 40, 20 + (150 - logo.height * k) / 2, logo.width * k, logo.height * k);
  } else {
    g.fillStyle = '#d01012'; g.beginPath(); g.roundRect(40, 20, 150, 150, 16); g.fill();
    g.strokeStyle = '#ffd500'; g.lineWidth = 8; g.stroke();
    g.fillStyle = '#ffffff'; g.font = '700 38px Helvetica, Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LOGO', 115, 97);
  }
  g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#ffffff';
  g.font = '700 78px Helvetica, Arial, sans-serif'; g.fillText('Witte Huis', 230, 105);
  g.font = '500 40px Helvetica, Arial, sans-serif'; g.fillStyle = '#ffd500'; g.fillText('Bouwput-editie', 232, 158);
  g.fillStyle = '#ffffff'; g.font = '700 64px Helvetica, Arial, sans-serif'; g.textAlign = 'right'; g.fillText('9+', FW - 44, 112);
  // bottom strip
  g.fillStyle = '#ffd500'; g.fillRect(0, FH - 150, FW, 150);
  g.fillStyle = '#1f2a44'; g.textAlign = 'left'; g.font = '600 40px Helvetica, Arial, sans-serif';
  g.fillText('Bouwset met minifiguur', 44, FH - 60);
  // price badge
  g.fillStyle = '#d01012'; g.beginPath(); g.arc(FW - 170, FH - 170, 130, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.stroke();
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 76px Helvetica, Arial, sans-serif'; g.fillText('€ 50', FW - 170, FH - 186);
  g.font = '600 32px Helvetica, Arial, sans-serif'; g.fillText(',00', FW - 170, FH - 120);
}
drawFront(null);
const frontTex = new T.CanvasTexture(front);
frontTex.colorSpace = T.SRGBColorSpace;
frontTex.anisotropy = 8;
if (LOGO_URL) {
  const li = new Image();
  li.onload = () => { drawFront(li); frontTex.needsUpdate = true; };
  li.src = LOGO_URL;
}
const boxFront = new T.MeshStandardMaterial({ map: frontTex, roughness: 0.6 }); boxFront.name = 'box_front';
const boxSide = new T.MeshStandardMaterial({ color: 0x1f4e96, roughness: 0.6 }); boxSide.name = 'box_side';
const boxTop = new T.MeshStandardMaterial({ color: 0xffd500, roughness: 0.6 }); boxTop.name = 'box_top';
const BOX = { w: 0.42, h: 0.30, d: 0.07 };
const retail = new T.Mesh(new T.BoxGeometry(BOX.w, BOX.h, BOX.d), [boxSide, boxSide, boxTop, boxSide, boxSide, boxFront]);
retail.name = 'retail_box';
retail.position.set(22 * S, -4 * BH - PLATE_T + BOX.h / 2, 30 * S + 0.03 + BOX.d / 2);
retail.castShadow = retail.receiveShadow = true;
model.add(retail);

/* center on origin, base at y = 0 */
const box = new T.Box3().setFromObject(model);
const ctr = box.getCenter(new T.Vector3());
model.position.set(-ctr.x, -box.min.y, -ctr.z);
const wrap = new T.Group();
wrap.name = 'lego_white_house_construction';
wrap.add(model);
wrap.rotation.y = Math.PI; // face the front (portico, minifig, box front) toward the default camera
stage.setObject(wrap);

/* tighter framing: the set is a flat, wide baseplate, so the auto-fit
   bounding sphere leaves a lot of empty air */
if (stage._camera) stage._camera.position.multiplyScalar(0.8);
