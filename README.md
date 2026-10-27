# Human Atlas

An interactive 3D anatomy explorer built with React, Three.js, and shadcn/ui. Take two reference anatomies apart: the BodyParts3D adult male (**2,234 individually selectable meshes**, **3,432 named concepts**) and the Human Reference Atlas female (**888 meshes**, **1,073 concepts**), across up to 16 anatomical systems.

**[Explore the live demo](https://human-atlas-seven.vercel.app)**

## Explore

- Switch between the male and female reference anatomy.
- Orbit, zoom, and select structures directly on the body.
- Toggle individual systems or use skeleton and organ presets.
- Move from assembled anatomy to a spaced inventory of every visible piece.
- Search anatomical names and source identifiers.
- Isolate a selected structure and read its details.
- Use compact controls and detail panels on mobile.
- Switch between English and Spanish (follows the browser language by default), including the 3,432 anatomical names; Spanish search also matches English names.

## Run locally

Requires Node.js 22.13 or newer. No API keys or accounts are needed.

```sh
npm ci
npm run dev
```

Open http://localhost:3016. To build the static site, run `npm run build`; the output is in `dist/`.

## Validate

```sh
npm run format:check   # oxfmt (run `npm run format` to fix)
npm run lint           # oxlint, warnings fail
npm run check          # TypeScript
npm run validate       # atlas data and interaction contracts
npm run build
```

GitHub Actions runs the same steps on every pull request and on pushes to `main` (see `.github/workflows/ci.yml`).

Validation covers mesh buffers, names and concept membership, nonoverlapping exploded layouts at desktop and mobile aspect ratios, search and inspection contracts, and tap-versus-drag handling. Browser interaction checks have exercised selection, system controls, search, isolation, rotation, and 390×844, 320×568, and 844×390 layouts. Phone controls stay clear of the exploded inventory, and isolated structures fit the space above or beside the detail panel. Physical-device performance and real multitouch hardware have not been tested.

## Anatomy data

The viewer includes two independent collections, both licensed **CC BY 4.0**: **BodyParts3D 4.0**, an adult male reference anatomy, and the **Human Reference Atlas united-female v1.5**, with the whole-body surface, selected organs and female reproductive anatomy but only partial skeleton and muscle coverage (its eight pregnancy reference pieces are a separate layer, hidden by default). Neither represents every human structure or variation. Individual source meshes are distinct from named concepts, which may group multiple meshes. Descriptions distinguish general system context from individual organ explanations.

Geometry is simplified for browser performance while retaining every source mesh. The male model contains 2,288,268 triangles and downloads about 15 MB of compressed geometry; the female model 1,810,038 triangles and about 8 MB. Both load in chunks ordered so the skeleton and organs appear before the muscles and vessels. Full credits, source links, and adaptation details are in [ATTRIBUTION.md](public/ATTRIBUTION.md).

This is an educational explorer, not a diagnostic or surgical tool.

## How it works

Geometry is merged into batches. Per-structure GPU textures control translation, visibility, and selection, while component geometry supports accurate picking. Exploded layouts pack only the visible pieces. Rendering updates when the scene changes; orbit controls remain responsive without thousands of separate draw calls.

The optional WebMCP tools expose anatomy search and inspection in compatible browsers. The visible interface works without them.

## Rebuilding geometry

The repository includes browser-ready geometry. Rebuilding it is optional: obtain the official BodyParts3D OBJ archive and English metadata tables, prepare the joined concepts and display-system mappings, run `scripts/convert-anatomy.py`, then `node scripts/optimize-anatomy.mjs` and `node scripts/encode-models.mjs`. For the female model, convert the HRA GLB with `scripts/convert-female.py` and pass `atlas-female.json` to both Node scripts. Simplification uses a 0.2% relative error limit per structure. Encoding quantizes positions to 16 bits within each structure's bounds (error under 0.1 mm) and normals to 8 bits, reorders vertices for the GPU cache, and applies meshoptimizer's codecs plus gzip.

## Spanish names

`public/models/names-es.json` is generated from Wikidata labels (`scripts/i18n/wikidata-fma-es.tsv`, refreshed with `node scripts/fetch-wikidata-names.mjs`), hand corrections (`names-es-overrides.tsv`) and hand translations of left/right templates (`names-es.tsv`). Edit those files and run `node scripts/build-names-es.mjs`; `npm run validate` fails if the JSON is stale or any name is untranslated.

## Deploy

Import this repository into Vercel as a Vite project. The included `vercel.json` configures `npm ci`, `npm run build`, and the `dist` output directory. It can also be served by a static host.

## License

Original application code is released under the [MIT License](LICENSE). **The anatomy data has its own CC BY 4.0 license**; preserve the attribution when redistributing it. Third-party dependencies retain their respective licenses.

Issues and pull requests are welcome. Please include reproduction steps and browser/device details for interaction problems.
