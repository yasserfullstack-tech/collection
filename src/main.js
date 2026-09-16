import * as THREE from 'three';
import './style.css';

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x01060b);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(0, 0.02, 11.5);
camera.lookAt(0, 0, 0);

const planetGroup = new THREE.Group();
planetGroup.position.set(2.28, -0.02, 0);
scene.add(planetGroup);

const radius = 3.78;
const sunDirection = new THREE.Vector3(-0.62, 0.48, 0.37).normalize();

const commonNoise = /* glsl */`
float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise3(p);
    p = p * 2.03 + vec3(13.7, 7.1, 5.9);
    amplitude *= 0.5;
  }
  return value;
}
`;

const globeGeometry = new THREE.SphereGeometry(radius, 192, 96);

const surfaceMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uSunDir: { value: sunDirection },
    uTime: { value: 0 }
  },
  vertexShader: /* glsl */`
    varying vec3 vNormalW;
    varying vec3 vWorldPos;
    varying vec3 vObjectPos;

    void main() {
      vObjectPos = position;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform vec3 uSunDir;
    uniform float uTime;
    varying vec3 vNormalW;
    varying vec3 vWorldPos;
    varying vec3 vObjectPos;

    ${commonNoise}

    void main() {
      vec3 n = normalize(vNormalW);
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      vec3 p = normalize(vObjectPos);

      float lightFacing = dot(n, uSunDir);
      float day = smoothstep(-0.28, 0.62, lightFacing);
      float softDay = smoothstep(-0.52, 0.18, lightFacing);

      float broad = fbm(p * 2.0 + vec3(0.0, 0.1, 0.0));
      float fine = fbm(p * 8.0 + vec3(2.0, 8.0, 4.0));
      float current = fbm(p * 18.0 + vec3(fine));

      vec3 nightOcean = vec3(0.0018, 0.012, 0.022);
      vec3 dayOcean = vec3(0.008, 0.095, 0.165);
      vec3 ocean = mix(nightOcean, dayOcean, day);
      ocean += vec3(0.0, 0.025, 0.045) * (broad - 0.45) * softDay;
      ocean += vec3(0.0, 0.010, 0.020) * (fine - 0.5);
      ocean += vec3(0.0, 0.012, 0.019) * current * day;

      vec3 halfDir = normalize(uSunDir + viewDir);
      float spec = pow(max(dot(n, halfDir), 0.0), 72.0) * 0.22 * day;
      float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 4.0);
      ocean += vec3(0.04, 0.18, 0.27) * spec;
      ocean += vec3(0.0, 0.018, 0.038) * fresnel * day;

      float lowerRightShade = smoothstep(-0.15, 0.8, p.x - p.y) * (1.0 - day);
      ocean *= 1.0 - 0.22 * lowerRightShade;

      gl_FragColor = vec4(ocean, 1.0);
    }
  `
});

const surface = new THREE.Mesh(globeGeometry, surfaceMaterial);
planetGroup.add(surface);

const cloudGeometry = new THREE.SphereGeometry(radius * 1.006, 192, 96);
const cloudMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.FrontSide,
  uniforms: {
    uSunDir: { value: sunDirection },
    uTime: { value: 0 }
  },
  vertexShader: /* glsl */`
    varying vec3 vNormalW;
    varying vec3 vWorldPos;
    varying vec3 vObjectPos;

    void main() {
      vObjectPos = position;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform vec3 uSunDir;
    uniform float uTime;
    varying vec3 vNormalW;
    varying vec3 vWorldPos;
    varying vec3 vObjectPos;

    ${commonNoise}

    void main() {
      vec3 n = normalize(vNormalW);
      vec3 p = normalize(vObjectPos);
      vec3 viewDir = normalize(cameraPosition - vWorldPos);

      float warpA = fbm(p * 2.8 + vec3(3.1, 9.7, 1.8));
      float warpB = fbm(p * 5.3 + vec3(warpA * 3.0));
      float field = fbm(p * 8.5 + vec3(warpA * 2.0, warpB * 2.4, warpA));
      float wisps = fbm(p * 19.0 + vec3(warpB * 2.0));
      float cloud = smoothstep(0.57, 0.72, field + wisps * 0.17);

      // Distinctive cyclone matching the reference's left/upper cloud spiral.
      vec3 c = normalize(vec3(-0.68, 0.26, 0.685));
      vec3 t1 = normalize(cross(vec3(0.0, 1.0, 0.0), c));
      vec3 t2 = normalize(cross(c, t1));
      float ca = clamp(dot(p, c), -1.0, 1.0);
      float r = acos(ca);
      float tx = dot(p, t1);
      float ty = dot(p, t2);
      float a = atan(ty, tx);
      float spiral = 0.5 + 0.5 * cos(a * 2.2 + r * 28.0 + fbm(p * 12.0) * 2.6);
      float spiralBand = smoothstep(0.57, 0.91, spiral);
      float stormEnvelope = smoothstep(0.56, 0.18, r) * smoothstep(0.03, 0.12, r);
      float eye = smoothstep(0.025, 0.095, r);
      cloud = max(cloud, spiralBand * stormEnvelope * eye * 0.96);

      // Break up the cloud mask into thin, torn edges.
      cloud *= smoothstep(0.27, 0.72, wisps + warpB * 0.34);
      cloud = clamp(cloud, 0.0, 1.0);

      float lightFacing = dot(n, uSunDir);
      float day = smoothstep(-0.38, 0.64, lightFacing);
      float twilight = smoothstep(-0.62, 0.12, lightFacing);
      float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 2.6);

      vec3 darkCloud = vec3(0.025, 0.070, 0.105);
      vec3 lightCloud = vec3(0.56, 0.75, 0.86);
      vec3 cloudColor = mix(darkCloud, lightCloud, day);
      cloudColor += vec3(0.07, 0.18, 0.25) * rim * day;

      float alpha = cloud * (0.20 + 0.73 * twilight);
      alpha *= 1.0 - 0.24 * smoothstep(0.78, 1.0, dot(n, viewDir));

      if (alpha < 0.012) discard;
      gl_FragColor = vec4(cloudColor, alpha);
    }
  `
});

const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
clouds.rotation.y = -0.20;
clouds.rotation.z = -0.045;
planetGroup.add(clouds);

const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.035, 160, 80);
const atmosphereMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
  uniforms: {
    uSunDir: { value: sunDirection }
  },
  vertexShader: /* glsl */`
    varying vec3 vNormalW;
    varying vec3 vWorldPos;
    void main() {
      vNormalW = normalize(mat3(modelMatrix) * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform vec3 uSunDir;
    varying vec3 vNormalW;
    varying vec3 vWorldPos;
    void main() {
      vec3 n = normalize(vNormalW);
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      float fresnel = pow(1.0 - abs(dot(n, viewDir)), 2.9);
      float sun = smoothstep(-0.34, 0.72, dot(n, uSunDir));
      float alpha = fresnel * (0.12 + 0.78 * sun);
      vec3 color = mix(vec3(0.01, 0.19, 0.38), vec3(0.08, 0.58, 1.0), sun);
      gl_FragColor = vec4(color, alpha * 0.72);
    }
  `
});
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
planetGroup.add(atmosphere);

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createStars(count, size, opacity, seed) {
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() - 0.5) * 27.0;
    positions[i * 3 + 1] = (random() - 0.5) * 17.0;
    positions[i * 3 + 2] = -8.0 - random() * 24.0;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x8fcbff,
    size,
    transparent: true,
    opacity,
    sizeAttenuation: true,
    depthWrite: false,
    toneMapped: false
  });
  return new THREE.Points(geometry, material);
}

scene.add(createStars(420, 0.020, 0.56, 0x2f6e2b1));
scene.add(createStars(95, 0.034, 0.80, 0x7a391c9));
scene.add(createStars(22, 0.054, 0.95, 0xc2f9421));

const pointer = new THREE.Vector2();
window.addEventListener('pointermove', (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
window.addEventListener('resize', resize);

const clock = new THREE.Clock();
let lastTime = 0;

function render() {
  const elapsed = clock.getElapsedTime();
  const delta = elapsed - lastTime;
  lastTime = elapsed;

  surfaceMaterial.uniforms.uTime.value = elapsed;
  cloudMaterial.uniforms.uTime.value = elapsed;

  // Near-static motion keeps the hero composition intact while proving the object is truly 3D.
  planetGroup.rotation.y += delta * 0.0025;
  clouds.rotation.y += delta * 0.0045;

  const targetX = pointer.x * 0.055;
  const targetY = pointer.y * 0.035;
  camera.position.x += (targetX - camera.position.x) * 0.018;
  camera.position.y += (0.02 + targetY - camera.position.y) * 0.018;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();
