# Anatomy data attribution

BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

- License: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html (updated 2025-02-27)
- Dataset: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- License terms: https://creativecommons.org/licenses/by/4.0/
- Source geometry: `isa_BP3D_4.0_obj_99.zip`, BodyParts3D 4.0.
- English names and relationships: IS-A and PART-OF concept, element, and inclusion tables from the same archive.
- Publication: Mitsuhashi et al. (2009), BodyParts3D: 3D structure database for anatomical concepts. https://doi.org/10.1093/nar/gkn613

Adaptations: axes and units converted from millimeters/Z-up to meters/Y-up; translated to rest at the stage; geometry simplified using meshoptimizer with 0.2% relative error limit per structure; positions quantized to 16 bits within each structure's bounds and normals to 8 bits, reordered for the vertex cache and packed into meshoptimizer-encoded, gzipped chunks; curated display system groupings and colors. The source contains 2,234 individual OBJ meshes; all remain represented. The combined hierarchy contains 3,432 named FMA concepts, which may reference multiple meshes. Original source identity is preserved in the manifest.

Source OBJ comments mention an older CC BY-SA 2.1 Japan license. The official current database license linked above supersedes that legacy text and explicitly permits redistribution and adaptation under CC BY 4.0.

BodyParts3D represents an adult male reference anatomy based on TARO MRI and anatomical illustration refinements. It is not a complete model of every possible human anatomical structure or variation. This interface is educational and is not a clinical tool.

## Spanish anatomical names

`models/names-es.json` gives a Spanish name for every concept and mesh name in both models. For the male model, about 700 come from Wikidata labels matched by FMA ID (CC0, https://www.wikidata.org/wiki/Property:P1402), with corrections; left/right variants are composed from them; the remaining names, and those of the female model, were translated for this project following Spanish anatomical terminology. Sources and the build script are in `scripts/i18n/` and `scripts/build-names-es.mjs`. Translations are educational, not a clinical reference.

## Female reference anatomy

Kristen Browne and Heidi Schlehlein, Human Reference Atlas / HuBMAP, _3D Reference Organ Set for Female v1.5_ (2023). CC BY 4.0. Geometry adapted for this viewer.

- Source DOI: https://doi.org/10.48539/HBM352.BTSQ.586
- Dataset: https://lod.humanatlas.io/ref-organ/united-female/v1.5
- Original GLB: https://cdn.humanatlas.io/digital-objects/ref-organ/united-female/v1.5/assets/3d-vh-f-united.glb
- License: https://creativecommons.org/licenses/by/4.0/

Adaptations: translated native meter/Y-up coordinates onto the stage, coincident vertices welded and source normals averaged, geometry simplified with a 0.2% per-structure relative error bound, positions and normals quantized and encoded as for the male model, and vertices whose welded normals cancelled out given face-based normals. Colors and display systems are curated for this interface. All 888 source meshes are represented, with 1,073 source nodes available as selectable individual or compound concepts.

This is a reference assembly with whole-body surface and selected organs, including female reproductive anatomy. Its skeleton and muscle coverage is partial. It is not a complete model of every human structure or a single-person scan. Eight placenta/umbilical structures are classified under Pregnancy reference and hidden by default.

### Female model shown in the viewer (hybrid)

Because the HRA female set covers the skeleton and muscles only in part, the female model in the viewer combines both collections (`scripts/build-female-hybrid.mjs`; the HRA source set is kept in `data/hra-female/`):

- **From BodyParts3D:** every structure common to both sexes, without the male-only ones (penis, testes, epididymides, deferent ducts, seminal vesicles, prostate, and the dorsal vessels of the penis).
- **From HRA:** the uterus and cervix, uterine tubes, ovaries, vagina, the ligaments of the uterus and ovaries, the uterine vessels, the breasts, and the pregnancy reference layer (66 meshes).
- **Fitting:** the HRA pelvic organs are scaled in width to the BodyParts3D pelvis (femoral heads), keep their real height and depth, and are placed with the lower end of the vagina at the urogenital hiatus of the pelvic floor, turned to stay clear of the bladder, rectum and bones as far as possible. The breasts are scaled by body height and rest on pectoralis major.
- **Female bony pelvis:** the BodyParts3D pelvis is reshaped by a smooth space deformation (`scripts/pelvis-warp.mjs`, Wendland radial functions on 39 landmark control points, hip joints and fifth lumbar vertebra held fixed) applied to every structure around it. It moves the model's own measurements toward typical female/male textbook proportions: intertuberous ×1.25, interspinous ×1.2, outlet AP ×1.1, inlet transverse ×1.08, inlet conjugate ×1.06, symphysis height ×0.85, pelvic height ×0.95, intercristal and inter-ASIS ×1.02, sacral width ×1.06, sacral length ×0.92. The build prints the resulting measurements; all are within 3 mm of their targets.
- **Adapted from BodyParts3D:** the gonadal vessels keep their origin and stop at the pelvic brim (ovarian instead of testicular vessels); the body surface has no external male genitalia and covers the breasts.
- **Generated for this project** (`scripts/vulva.mjs`; neither source has them): the female urethra, the vulva (labia majora and minora, glans, body and crura of the clitoris, bulbs of the vestibule, greater vestibular glands, vaginal orifice), the perineal body and the superficial muscles of the urogenital triangle (ischiocavernosus, bulbospongiosus, superficial transverse perineal) and the deep perineal plane (perineal membrane, external urethral sphincter, compressor urethrae, sphincter urethrovaginalis, deep transverse perineal). They are parametric meshes with typical adult textbook sizes, anchored to the reshaped pelvis (symphysis, ischiopubic rami), the bladder neck, the lower end of the vagina, the anal canal and the ischial tuberosities; the labia majora replace the body surface between the thighs. They are schematic, not derived from a scan.

The combination is an educational approximation of female anatomy built from two different bodies; it is not a single-person reference.
