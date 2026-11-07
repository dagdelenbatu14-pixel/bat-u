// One phone, lit like a product shot. Scrolling turns it and changes what its screen shows:
// my clients' real mobile sites, then the work behind each service, then a WhatsApp chat.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const canvas = document.getElementById('stage');
const small = matchMedia('(max-width: 767px)').matches;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = window.batu || (window.batu = { chapters: [], end: 0, mx: 0, my: 0 });

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
catch { document.documentElement.classList.add('no-3d'); }

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 11);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // ---- light: warm key from the upper left, cool rim behind, an amber glow at the back
  const key = new THREE.DirectionalLight('#ffe7c7', 2.2); key.position.set(-4, 5, 6);
  const rim = new THREE.DirectionalLight('#9fb6ff', 2.4); rim.position.set(5, 2, -5);
  const glow = new THREE.PointLight('#ffb36a', 14, 10, 2); glow.position.set(0.6, 0.4, -4.5);
  scene.add(key, rim, glow, new THREE.AmbientLight('#2a2420', 0.6));

  // ---- the phone
  const W = 1.44, H = 3.0, D = 0.165, R = 0.22;   // iPhone 15 Pro Max proportions, 160 x 77 mm
  const phone = new THREE.Group();
  // silver: brushed light titanium frame, frosted white glass back
  const SILVER = '#d4d3cf';
  const frameMat = new THREE.MeshPhysicalMaterial({ color: SILVER, metalness: 1, roughness: 0.34, clearcoat: 0.3, clearcoatRoughness: 0.3, envMapIntensity: 1.25 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 8, R), frameMat);
  phone.add(body);

  const rounded = (w, h, r) => {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ShapeGeometry(s, 24);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - x) / w, (p.getY(i) - y) / h);
    return g;
  };

  // front: black glass, the lit screen inside it, a thin glass sheet with reflections on top
  const front = new THREE.Mesh(rounded(W - 0.03, H - 0.03, R - 0.015), new THREE.MeshPhysicalMaterial({ color: '#050506', roughness: 0.15, metalness: 0, clearcoat: 1 }));
  front.position.z = D / 2 + 0.001;
  const SW = W - 0.13, SH = H - 0.13;
  // the output pass tone-maps everything, so the screen is pushed a little above white to read as lit
  const screenMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.12, 1.12, 1.12), toneMapped: false });
  const screen = new THREE.Mesh(rounded(SW, SH, R - 0.06), screenMat);
  screen.position.z = D / 2 + 0.002;
  const island = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.1, 0.005, 4, 0.05), new THREE.MeshBasicMaterial({ color: '#000' }));
  island.position.set(0, SH / 2 - 0.11, D / 2 + 0.004);
  const sheen = new THREE.Mesh(rounded(W - 0.03, H - 0.03, R - 0.015), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.03, envMapIntensity: 2.5, depthWrite: false }));
  sheen.position.z = D / 2 + 0.006;
  phone.add(front, screen, island, sheen);

  // back: frosted white glass and the square camera plateau in the top left corner
  const back = new THREE.Mesh(rounded(W - 0.03, H - 0.03, R - 0.015), new THREE.MeshPhysicalMaterial({ color: '#a4a39e', roughness: 0.8, metalness: 0.08, clearcoat: 0.15, clearcoatRoughness: 0.6, envMapIntensity: 0.6 }));
  back.rotation.y = Math.PI; back.position.z = -D / 2 - 0.001;
  const P = 0.64;                                                     // plateau size
  const px = W / 2 - 0.09 - P / 2, py = H / 2 - 0.09 - P / 2;         // seen from the back it sits top left, so +x here
  const plateau = new THREE.Mesh(new RoundedBoxGeometry(P, P, 0.045, 6, 0.15), new THREE.MeshPhysicalMaterial({ color: '#aeada8', roughness: 0.2, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.9 }));
  plateau.position.set(px, py, -D / 2 - 0.02);
  phone.add(back, plateau);
  const lensGlass = new THREE.MeshPhysicalMaterial({ color: '#020203', roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.45 });
  const lensRing = new THREE.MeshPhysicalMaterial({ color: '#9d9c97', metalness: 1, roughness: 0.25, envMapIntensity: 0.9, side: THREE.DoubleSide });
  const bz = -D / 2 - 0.045;
  // two lenses on the outer edge, one in the middle of the inner edge (mirrored because we build from the front)
  [[0.15, 0.15], [0.15, -0.15], [-0.14, 0]].forEach(([dx, dy]) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.07, 40, 1, true), lensRing);   // an open tube, the glass sits recessed inside
    ring.rotation.x = Math.PI / 2; ring.position.set(px + dx, py + dy, bz - 0.012);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.124, 40), lensGlass);
    glass.rotation.y = Math.PI; glass.position.set(px + dx, py + dy, bz - 0.03);
    phone.add(ring, glass);
  });
  const flash = new THREE.Mesh(new THREE.CircleGeometry(0.045, 24), new THREE.MeshPhysicalMaterial({ color: '#f1ead6', roughness: 0.3, emissive: '#2a2416' }));
  flash.rotation.y = Math.PI; flash.position.set(px - 0.17, py + 0.2, bz - 0.002);
  const lidar = new THREE.Mesh(new THREE.CircleGeometry(0.042, 24), lensGlass);
  lidar.rotation.y = Math.PI; lidar.position.set(px - 0.17, py - 0.2, bz - 0.002);
  phone.add(flash, lidar);
  // side buttons
  const btn = (x, y, h) => { const b = new THREE.Mesh(new RoundedBoxGeometry(0.035, h, 0.06, 3, 0.015), frameMat); b.position.set(x, y, 0); phone.add(b); };
  btn(W / 2 + 0.008, 0.48, 0.42); btn(-W / 2 - 0.008, 0.85, 0.16); btn(-W / 2 - 0.008, 0.42, 0.3); btn(-W / 2 - 0.008, 0.02, 0.3);
  scene.add(phone);

  // ---- the glow behind the phone and dust in the light
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, small ? 'rgba(255,215,165,1)' : 'rgba(255,205,150,0.85)'); g.addColorStop(0.3, 'rgba(236,150,90,0.34)'); g.addColorStop(0.65, 'rgba(160,60,60,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 10.5), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.z = -3;
  scene.add(halo);

  const dustN = small ? 70 : 140;
  const dustPos = new Float32Array(dustN * 3), dustSeed = new Float32Array(dustN);
  for (let i = 0; i < dustN; i++) { dustPos.set([(Math.random() - 0.5) * 7, (Math.random() - 0.5) * 6, -3 + Math.random() * 5], i * 3); dustSeed[i] = Math.random() * 10; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#ffd6a8', size: 0.03, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  // ---- screens: each chapter of the page names the picture its phone shows
  const loader = new THREE.TextureLoader();
  const cache = new Map();
  const fit = (t, w, h) => {
    const a = (SH / SW) / (h / w);              // >1: picture is wider than the screen
    if (a > 1) { t.repeat.set(1 / a, 1); t.offset.set((1 - 1 / a) / 2, 0); t.userData.view = 1; }
    else { t.repeat.set(1, a); t.offset.set(0, 1 - a); t.userData.view = a; }
  };
  const tex = (url) => {
    if (!cache.has(url)) {
      let t;
      if (url.endsWith('.mp4')) {
        const v = Object.assign(document.createElement('video'), { src: url, muted: true, loop: true, playsInline: true, preload: 'auto' });
        v.addEventListener('loadedmetadata', () => fit(t, v.videoWidth, v.videoHeight));
        t = new THREE.VideoTexture(v); t.userData.video = v;
      } else {
        t = loader.load(url, (tt) => fit(tt, tt.image.width, tt.image.height));
      }
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.wrapT = THREE.ClampToEdgeWrapping;
      t.userData.view = 1;
      cache.set(url, t);
    }
    return cache.get(url);
  };
  const chapters = state.chapters;
  chapters.forEach((c) => tex(c.screen));
  if (state.endScreen) tex(state.endScreen);
  let shown = null;
  const show = (url) => {
    if (url === shown) return;
    const prev = shown && cache.get(shown); if (prev && prev.userData.video) prev.userData.video.pause();
    shown = url; const t = tex(url); if (t.userData.video && !still) t.userData.video.play().catch(() => {});
    screenMat.map = t; screenMat.needsUpdate = true;
  };
  if (chapters[0]) show(chapters[0].screen);

  // ---- render path: bloom on large screens, plain on phones
  let composer = null;
  if (!small) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.6, 1.25));
    composer.addPass(new OutputPass());
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);
    camera.aspect = w / h;
    camera.position.z = w / h < 0.8 ? 13 : 9;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  // ---- motion
  const ease = (t) => t * t * (3 - 2 * t);
  const side = (i) => (chapters[i] ? chapters[i].side : 1);
  let t0 = performance.now(), clock = 0, running = true;
  const cur = { x: 0, y: 0, ry: 0, rx: 0, s: 1, ok: false };

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    if (!still) clock += dt;
    const i = state.i || 0, turn = state.turn || 0, dwell = state.dwell || 0;
    const k = turn > 0.5 ? i + 1 : i;
    if (state.end > 0.04 && state.endScreen) show(state.endScreen);
    else if (chapters[k]) show(chapters[k].screen);

    // the screen scrolls down its page during the chapter
    const t = screenMat.map;
    if (t && t.userData.view < 1) {
      const top = 1 - t.userData.view, travel = top * 0.85;
      const local = state.end > 0.04 ? 0 : turn > 0.5 ? 0 : dwell;
      t.offset.y = top - travel * ease(local);
    }

    // where the phone stands: on the side its chapter gives, turning a full circle between chapters
    const wide = innerWidth / innerHeight >= 0.8;
    const sx = wide ? 1.55 : 0;
    const x = THREE.MathUtils.lerp(side(i) * sx, side(i + 1) * sx, turn);
    const ry = (i + turn) * Math.PI * 2 - side(k) * 0.32 + state.mx * 0.35;
    const endK = ease(state.end);
    cur.x += ((x * (1 - endK) + (wide ? 1.9 : 0) * endK) - cur.x) * (still ? 1 : 1 - Math.exp(-dt * 6));
    cur.ry += (ry - cur.ry) * (still ? 1 : 1 - Math.exp(-dt * 6));
    // On a tall screen the phone fits the free band between the top bar and the card under it.
    let ty = 0, ts = 1;
    if (!wide) {
      const perUnit = innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z);
      const top = state.bandTop || 80, bottom = Math.max(top + 160, state.bandBottom || innerHeight * 0.5);
      ts = Math.min(1.5, ((bottom - top) * 0.93) / (H * perUnit));
      ty = (innerHeight / 2 - (top + bottom) / 2) / perUnit;
    }
    const kk = still || !cur.ok ? 1 : 1 - Math.exp(-dt * 5);
    cur.y += (ty - cur.y) * kk; cur.s += (ts - cur.s) * kk; cur.ok = true;
    phone.scale.setScalar(cur.s);
    phone.position.set(cur.x, Math.sin(clock * 0.9) * 0.04 * cur.s + cur.y, 0);
    phone.rotation.set(-0.08 + state.my * 0.18 + Math.sin(clock * 0.7) * 0.02, cur.ry, Math.sin(clock * 0.5) * 0.015 + 0.04);
    halo.position.x = cur.x * 0.85; halo.position.y = phone.position.y; halo.scale.setScalar(Math.max(0.6, cur.s) * (wide ? 1 : 1.25));
    key.intensity = wide ? 2.2 : 3.0; rim.intensity = wide ? 2.4 : 3.4;
    glow.position.x = cur.x + 1.2;

    const dp = dustGeo.attributes.position;
    for (let j = 0; j < dustN; j++) dp.setY(j, dp.getY(j) + Math.sin(clock * 0.3 + dustSeed[j]) * 0.0009 + 0.0012 * (still ? 0 : 1));
    for (let j = 0; j < dustN; j++) if (dp.getY(j) > 3) dp.setY(j, -3);
    dp.needsUpdate = true;

    if (composer) composer.render(); else renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  state.setRunning = (on) => { if (on && !running) { running = true; t0 = performance.now(); requestAnimationFrame(frame); } running = on; };
  document.documentElement.classList.add('has-3d');
  window.dispatchEvent(new Event('batu3d'));
}
