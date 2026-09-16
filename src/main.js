import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import './style.css';

const canvas = document.querySelector('#scene');
const loader = document.querySelector('#loader');
const qualityLabel = document.querySelector('#quality');
const isMobile = Math.min(innerWidth, innerHeight) < 720;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !isMobile,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isMobile ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x00040a);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 900);
camera.position.set(0, 0.04, 9.4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.minDistance = 6.4;
controls.maxDistance = 16;
controls.rotateSpeed = 0.38;
controls.zoomSpeed = 0.62;
controls.target.set(0, 0, 0);
controls.autoRotate = true;
controls.autoRotateSpeed = 0.18;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.34, 0.72, 0.88);
composer.addPass(bloom);

const SUN = new THREE.Vector3(-0.78, 0.38, 0.47).normalize();
const R = 3.12;
const segW = isMobile ? 96 : 160;
const segH = isMobile ? 64 : 112;
const planet = new THREE.Group();
planet.rotation.z = THREE.MathUtils.degToRad(-7.5);
scene.add(planet);

function fitComposition() {
  const w = innerWidth;
  const h = innerHeight;
  camera.aspect = w / h;
  if (w > 860) camera.setViewOffset(w, h, -w * 0.19, h * 0.01, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isMobile ? 1.5 : 2));
  composer.setSize(w, h);
}
fitComposition();
addEventListener('resize', fitComposition);

// --- Star field -------------------------------------------------------------
function starTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.17, 'rgba(235,247,255,.93)');
  g.addColorStop(0.46, 'rgba(125,185,255,.24)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const starMap = starTexture();
const stars = new THREE.Group();
scene.add(stars);

function addStars(count, size, opacity, seed) {
  let s = seed >>> 0;
  const rand = () => {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const u = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const rr = 90 + rand() * 300;
    const k = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(a) * k * rr;
    pos[i * 3 + 1] = u * rr;
    pos[i * 3 + 2] = Math.sin(a) * k * rr;
    const roll = rand();
    if (roll < 0.11) c.setRGB(1.0, 0.79, 0.60);
    else if (roll < 0.32) c.setRGB(0.63, 0.80, 1.0);
    else c.setRGB(0.88, 0.94, 1.0);
    const b = 0.32 + rand() * 0.68;
    col[i * 3] = c.r * b;
    col[i * 3 + 1] = c.g * b;
    col[i * 3 + 2] = c.b * b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size,
    map: starMap,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: false,
    toneMapped: false
  });
  stars.add(new THREE.Points(geo, mat));
}
addStars(isMobile ? 600 : 950, 1.45, 0.52, 0x19a02d);
addStars(isMobile ? 120 : 220, 2.35, 0.66, 0x7f0231);
addStars(isMobile ? 24 : 46, 3.6, 0.82, 0x42aa17);

// Very faint distant blue haze — just enough to avoid a flat digital black.
function hazeSprite(x, y, z, scale, opacity) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(12,48,100,.48)');
  g.addColorStop(0.45, 'rgba(6,24,58,.16)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(x, y, z);
  sprite.scale.set(scale, scale, 1);
  scene.add(sprite);
}
hazeSprite(-12, 4, -45, 35, 0.16);

// --- Robust texture loading -------------------------------------------------
const BASE = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r180/examples/textures/planets/';
const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous');
const maxAniso = renderer.capabilities.getMaxAnisotropy();

function fallbackTexture(kind) {
  const w = kind === 'normal' ? 4 : 768;
  const h = kind === 'normal' ? 4 : 384;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (kind === 'normal') {
    x.fillStyle = 'rgb(128,128,255)';
    x.fillRect(0, 0, w, h);
  } else if (kind === 'day') {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#164b73'); g.addColorStop(0.5, '#072a4b'); g.addColorStop(1, '#03152a');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  } else if (kind === 'spec') {
    x.fillStyle = '#dedede'; x.fillRect(0, 0, w, h);
  } else if (kind === 'night') {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
  } else {
    x.clearRect(0, 0, w, h);
    for (let i = 0; i < 680; i++) {
      const yy = Math.random() * h;
      const xx = Math.random() * w;
      const rw = 18 + Math.random() * 100;
      const rh = 3 + Math.random() * 18;
      const a = 0.02 + Math.random() * 0.08;
      x.fillStyle = `rgba(255,255,255,${a})`;
      x.beginPath(); x.ellipse(xx, yy, rw, rh, Math.random() * Math.PI, 0, Math.PI * 2); x.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = maxAniso;
  if (kind === 'day' || kind === 'night' || kind === 'cloud') t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function loadTexture(file, kind) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) { done = true; resolve(fallbackTexture(kind)); }
    }, 9000);
    textureLoader.load(BASE + file, (t) => {
      if (done) return;
      done = true; clearTimeout(timer);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.anisotropy = maxAniso;
      if (kind === 'day' || kind === 'night' || kind === 'cloud') t.colorSpace = THREE.SRGBColorSpace;
      resolve(t);
    }, undefined, () => {
      if (done) return;
      done = true; clearTimeout(timer);
      resolve(fallbackTexture(kind));
    });
  });
}

const surfaceVertex = /* glsl */`
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const surfaceFragment = /* glsl */`
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D specMap;
  uniform sampler2D normalMap;
  uniform vec3 sunDir;
  uniform float nightIntensity;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  void main() {
    vec3 V = normalize(cameraPosition - vPosW);
    vec3 L = normalize(sunDir);
    vec3 Ng = normalize(vNormalW);

    vec3 dp1 = dFdx(vPosW);
    vec3 dp2 = dFdy(vPosW);
    vec2 duv1 = dFdx(vUv);
    vec2 duv2 = dFdy(vUv);
    vec3 T = normalize(dp1 * duv2.y - dp2 * duv1.y);
    vec3 B = normalize(cross(Ng, T));
    vec3 nt = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
    nt.xy *= 0.72;
    vec3 N = normalize(mat3(T, B, Ng) * nt);
    if (dot(N, V) < 0.0) N = Ng;

    float ndl = dot(N, L);
    float ndlG = dot(Ng, L);
    float lit = pow(clamp((ndl + 0.08) / 1.08, 0.0, 1.0), 1.18);
    float twilight = smoothstep(-0.35, 0.17, ndlG);

    vec3 day = texture2D(dayMap, vUv).rgb;
    vec3 night = texture2D(nightMap, vUv).rgb;
    float ocean = texture2D(specMap, vUv).r;

    // Pull the reference toward deep cinematic ocean blues without destroying geography.
    vec3 oceanTint = vec3(0.025, 0.17, 0.31);
    day = mix(day, day * oceanTint * 2.6, ocean * 0.53);
    day *= vec3(0.78, 0.91, 1.08);

    vec3 col = day * (0.014 + 1.18 * lit);
    col += vec3(0.004, 0.018, 0.045) * (1.0 - twilight);

    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 115.0) * ocean * smoothstep(0.0, 0.3, ndlG);
    col += vec3(0.54, 0.80, 1.0) * spec * 1.55;

    float nightMask = smoothstep(0.02, -0.30, ndlG);
    col += night * nightMask * nightIntensity * vec3(0.85, 0.67, 0.42) * 0.42;

    float fres = pow(1.0 - clamp(dot(Ng, V), 0.0, 1.0), 3.3);
    float sunSide = clamp(ndlG * 0.55 + 0.5, 0.0, 1.0);
    col += vec3(0.04, 0.31, 0.66) * fres * (0.11 + 0.58 * sunSide);

    // Gentle filmic shoulder before ACES tone mapping.
    col = max(col, vec3(0.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const cloudVertex = surfaceVertex;
const cloudFragment = /* glsl */`
  uniform sampler2D cloudMap;
  uniform vec3 sunDir;
  uniform float opacityScale;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  void main() {
    vec4 tex = texture2D(cloudMap, vUv);
    float cloud = max(tex.a, max(tex.r, max(tex.g, tex.b)));
    cloud = smoothstep(0.16, 0.88, cloud);
    if (cloud < 0.01) discard;

    vec3 N = normalize(vNormalW);
    vec3 L = normalize(sunDir);
    vec3 V = normalize(cameraPosition - vPosW);
    float ndl = dot(N, L);
    float lit = pow(clamp((ndl + 0.17) / 1.17, 0.0, 1.0), 0.72);
    float night = smoothstep(0.08, -0.36, ndl);
    float term = exp(-abs(ndl) * 6.2);
    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.3);

    vec3 shade = mix(vec3(0.012,0.025,0.050), vec3(0.78,0.89,0.98), lit);
    shade += vec3(0.10,0.28,0.48) * fres * lit * 0.34;
    shade += vec3(0.10,0.12,0.15) * term * 0.22;
    shade *= 1.0 - night * 0.52;

    float alpha = cloud * opacityScale * (0.12 + 0.92 * lit);
    alpha *= 1.0 - fres * 0.36;
    gl_FragColor = vec4(shade, alpha);
  }
`;

const atmosphereVertex = /* glsl */`
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const atmosphereFragment = /* glsl */`
  uniform vec3 sunDir;
  uniform vec3 glowColor;
  uniform float intensity;
  uniform float power;
  uniform float minGlow;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    vec3 L = normalize(sunDir);
    float rim = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), power);
    float sun = smoothstep(-0.28, 0.62, dot(N, L));
    float a = rim * (minGlow + 0.92 * sun) * intensity;
    gl_FragColor = vec4(glowColor * a, a);
  }
`;

function makeAtmosphere(radius, power, intensity, color, minGlow, side) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      sunDir: { value: SUN },
      glowColor: { value: new THREE.Color(color) },
      intensity: { value: intensity },
      power: { value: power },
      minGlow: { value: minGlow }
    },
    vertexShader: atmosphereVertex,
    fragmentShader: atmosphereFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, isMobile ? 64 : 112, isMobile ? 48 : 80), mat);
  mesh.renderOrder = 5;
  planet.add(mesh);
  return mesh;
}

let surface;
let cloudsA;
let cloudsB;
let atmosphere = [];
let surfaceUniforms;
let cloudUniformsA;
let cloudUniformsB;
let ready = false;

Promise.all([
  loadTexture('earth_atmos_2048.jpg', 'day'),
  loadTexture('earth_lights_2048.png', 'night'),
  loadTexture('earth_specular_2048.jpg', 'spec'),
  loadTexture('earth_normal_2048.jpg', 'normal'),
  loadTexture('earth_clouds_1024.png', 'cloud')
]).then(([day, night, spec, normal, cloud]) => {
  surfaceUniforms = {
    dayMap: { value: day },
    nightMap: { value: night },
    specMap: { value: spec },
    normalMap: { value: normal },
    sunDir: { value: SUN },
    nightIntensity: { value: 0.23 }
  };

  const surfaceMat = new THREE.ShaderMaterial({
    uniforms: surfaceUniforms,
    vertexShader: surfaceVertex,
    fragmentShader: surfaceFragment,
    extensions: { derivatives: true }
  });
  surface = new THREE.Mesh(new THREE.SphereGeometry(R, segW, segH), surfaceMat);
  surface.rotation.y = THREE.MathUtils.degToRad(138);
  planet.add(surface);

  cloudUniformsA = { cloudMap: { value: cloud }, sunDir: { value: SUN }, opacityScale: { value: 0.92 } };
  const cloudMatA = new THREE.ShaderMaterial({
    uniforms: cloudUniformsA,
    vertexShader: cloudVertex,
    fragmentShader: cloudFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide
  });
  cloudsA = new THREE.Mesh(new THREE.SphereGeometry(R * 1.008, segW, segH), cloudMatA);
  cloudsA.rotation.y = THREE.MathUtils.degToRad(130);
  planet.add(cloudsA);

  // A second, faint cloud shell breaks the flat "texture pasted on a ball" look.
  cloudUniformsB = { cloudMap: { value: cloud }, sunDir: { value: SUN }, opacityScale: { value: 0.20 } };
  const cloudMatB = cloudMatA.clone();
  cloudMatB.uniforms = cloudUniformsB;
  cloudsB = new THREE.Mesh(new THREE.SphereGeometry(R * 1.014, isMobile ? 72 : 112, isMobile ? 48 : 72), cloudMatB);
  cloudsB.rotation.y = THREE.MathUtils.degToRad(118);
  cloudsB.rotation.z = 0.018;
  planet.add(cloudsB);

  atmosphere = [
    makeAtmosphere(R * 1.014, 3.8, 0.90, 0x2b8dff, 0.035, THREE.FrontSide),
    makeAtmosphere(R * 1.055, 2.35, 0.31, 0x1477f2, 0.045, THREE.BackSide),
    makeAtmosphere(R * 1.095, 1.8, 0.12, 0x0f58bd, 0.018, THREE.BackSide)
  ];

  renderer.compile(scene, camera);
  composer.render();
  ready = true;
  qualityLabel.textContent = day.image?.width >= 1800 ? '2K SURFACE · 1K CLOUDS' : 'PROCEDURAL FALLBACK';
  setTimeout(() => loader.classList.add('hide'), 250);
}).catch((error) => {
  console.error(error);
  qualityLabel.textContent = 'FALLBACK MODE';
  loader.querySelector('span').textContent = 'Render fallback unavailable';
});

// --- Interaction + presentation --------------------------------------------
const buttons = [...document.querySelectorAll('[data-toggle]')];
const state = { clouds: true, atmosphere: true, lights: true, orbit: true };
buttons.forEach((button) => {
  button.addEventListener('click', () => {
    const key = button.dataset.toggle;
    state[key] = !state[key];
    button.classList.toggle('on', state[key]);
    if (key === 'clouds' && cloudsA) cloudsA.visible = cloudsB.visible = state.clouds;
    if (key === 'atmosphere') atmosphere.forEach((m) => { m.visible = state.atmosphere; });
    if (key === 'lights' && surfaceUniforms) surfaceUniforms.nightIntensity.value = state.lights ? 0.23 : 0;
    if (key === 'orbit') controls.autoRotate = state.orbit;
  });
});

let idleSince = performance.now();
controls.addEventListener('start', () => { idleSince = performance.now(); controls.autoRotate = false; });
controls.addEventListener('end', () => { idleSince = performance.now(); });
renderer.domElement.addEventListener('pointermove', () => { idleSince = performance.now(); });
renderer.domElement.addEventListener('dblclick', () => {
  camera.position.set(0, 0.04, 9.4);
  controls.target.set(0, 0, 0);
  controls.update();
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (ready) {
    surface.rotation.y += dt * 0.0042;
    cloudsA.rotation.y += dt * 0.0066;
    cloudsB.rotation.y += dt * 0.0092;
  }
  stars.rotation.y += dt * 0.0007;
  stars.rotation.x += dt * 0.00011;

  if (state.orbit && performance.now() - idleSince > 2600) controls.autoRotate = true;
  controls.update();
  composer.render();
}
animate();
