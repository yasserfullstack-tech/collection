# Procedural Earth — img2threejs reconstruction

A code-only Three.js reconstruction of the supplied Earth-from-orbit reference image. The runtime does **not** use the reference image as a planet texture; the globe, ocean, cloud field, cyclone, atmosphere, terminator, and stars are procedural.

This project follows the reconstruction philosophy from [`img2threejs/img2threejs`](https://github.com/img2threejs/img2threejs): decompose the reference into visible systems, define the identity-critical features first, then build them as procedural Three.js geometry/materials rather than extracting a mesh or downloading art packs.

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Controls

Move the pointer for a very small parallax shift. Press **R** to toggle a 50% reference overlay for visual comparison. The overlay is hidden by default and is only a review aid.

## Reconstruction decisions

The image is dominated by five cues: a very large sphere shifted to the right, a bright electric-blue atmospheric limb, a dark lower-right terminator, layered white/blue cloud systems with one obvious spiral storm, and a sparse star field. Those cues are explicitly encoded in `reconstruction/img2threejs-spec.json` and implemented in `src/main.js`.

The cloud layer is a second sphere slightly above the ocean surface. It combines fractal value noise with a tangent-space spiral field centered on the visible left/upper hemisphere to reproduce the cyclone-like feature. The atmosphere is a third, slightly larger sphere using additive Fresnel shading so the rim intensifies toward the limb and remains strongest on the lit side.

## Reference and limits

`public/reference.png` is the original supplied reference. It is retained for side-by-side review only. Because only one view exists, the hidden hemisphere cannot be inferred exactly. The cloud geography and fine surface detail are therefore intentionally approximate while preserving the composition, palette, lighting direction, and identity-defining cloud/atmosphere cues.
