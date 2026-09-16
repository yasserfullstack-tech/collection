# Earth — Deep Orbit

A cinematic real-time Three.js Earth reconstruction based on the supplied orbit reference image and the three comparison implementations provided during the rebuild.

The current renderer is intentionally **hybrid**: geometry, lighting, atmosphere, star field, framing, cloud layering, post-processing, interaction, and fallback rendering are authored in code, while the primary Earth surface uses the standard Three.js Earth day/night/specular/normal/cloud maps for substantially better geographic and material realism. The original supplied reference image is **not** used as a runtime texture.

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

## What changed in the high-fidelity rebuild

- 2K Earth day surface with matching night, normal, and specular evidence.
- A two-shell cloud system for depth and independent drift rather than a single flat procedural mask.
- Three atmosphere layers: tight electric-blue limb, medium halo, and broad faint scattering shell.
- ACES filmic tone mapping plus restrained bloom for the luminous rim and bright stars.
- Sparse multi-scale star field with subtle distant blue haze instead of a uniform point cloud.
- Desktop view-offset framing that keeps the globe large and shifted right like the original reference while OrbitControls still rotate around the true planet center.
- Deepened ocean grading, soft terminator, subtle water glint, restrained night lights, mobile tessellation scaling, and a procedural fallback if CDN texture loading fails.
- Minimal HUD controls for clouds, atmosphere, night lights, and cinematic drift.

## Reference-driven choices

The three supplied HTML references contributed different strengths: the first informed the layered atmosphere, filmic presentation, star sprites, and control polish; the second informed the physically richer day/night/specular/normal/cloud texture stack and robust fallback path; the third reinforced the simpler large-globe composition and restrained interaction model.

The original target image remains the composition guide: oversized blue planet, right-biased framing, bright cyan upper/left atmospheric limb, dark lower-right terminator, layered cloud cover, and sparse deep-space background.

## Limits

A single reference view cannot determine the exact hidden hemisphere, lighting environment, or cloud volume. The rebuild therefore prioritizes the visible composition and cinematic material response rather than claiming exact physical reconstruction from unseen geometry.
