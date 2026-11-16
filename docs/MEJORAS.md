# Registro de mejoras

Este documento registra las mejoras ya hechas sobre el proyecto original y las que quedan pendientes,
para poder retomar el trabajo. El README describe el uso del proyecto; aquí se explica qué cambió y por qué.

## Hecho

| Fase                        | Commits                                 | Resumen                                                                                                                                                                                                                 |
| --------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Mantenibilidad           | `4e65674` `a582293` `e1755e3` `7192368` | Se eliminaron componentes y dependencias sin uso (Cloudflare, wrangler, recharts…). Formato con oxfmt y lint con oxlint. `scene.tsx` se dividió en `app/scene/*` y `page.tsx` en `app/panels/*`                         |
| 2. CI                       | `179aa58`                               | GitHub Actions (`.github/workflows/ci.yml`) ejecuta format, lint, typecheck, validate y build en cada push                                                                                                              |
| 3. Español                  | `fad457a` `27d1475`                     | Interfaz bilingüe (botón EN/ES, se guarda en `localStorage`). 4.129 nombres anatómicos en español                                                                                                                       |
| 4. Rendimiento              | `bebc2f5`                               | Descarga del modelo masculino: 33,5 → 14,7 MB. Carga por prioridad: esqueleto y órganos primero                                                                                                                         |
| 5. Modelo femenino          | `6daea8a`                               | Selector Masculino/Femenino. 888 piezas HRA, 8,2 MB. Capa de embarazo oculta por defecto                                                                                                                                |
| 6. Herramientas de estudio  | —                                       | Modo práctica (Nombrar / Localizar, nivel Principales o Todas) y enlaces compartibles con la vista                                                                                                                      |
| 7. Modelo femenino completo | (este commit)                           | Modelo híbrido: BodyParts3D sin estructuras masculinas + aparato reproductor, mamas y embarazo de HRA ajustados a la pelvis y el tórax. 2.280 piezas, 15,8 MB. Piel remodelada                                          |
| 8. Pelvis ósea femenina     | (este commit)                           | Deformación suave (RBF de Wendland, 39 puntos de control, caderas y L5 fijas) de la pelvis de BodyParts3D y todo lo que la rodea hacia proporciones femeninas; medidas a ≤3 mm del objetivo                             |
| 9. Vulva y uretra femenina  | (este commit)                           | Mallas paramétricas (`scripts/vulva.mjs`): uretra, labios mayores y menores, clítoris (glande, cuerpo, pilares), bulbos, glándulas vestibulares, orificio vaginal, cuerpo perineal. Conceptos de grupo Vulva y Clítoris |

### Detalles útiles para retomar

- **i18n**
  - Los textos están en `app/i18n.tsx`. El diccionario `es` debe tener todas las claves de `en`, y TypeScript lo comprueba.
  - `useI18n()` devuelve `t` (textos), `name()` (nombre anatómico traducido) y `n()` (números).
- **Nombres en español** (`node scripts/build-names-es.mjs` genera `public/models/names-es.json`). Las fuentes, por prioridad:
  1. `scripts/i18n/names-es-overrides.tsv`: correcciones manuales.
  2. `scripts/i18n/wikidata-fma-es.tsv`: etiquetas de Wikidata por FMA ID. Se actualizan con `scripts/fetch-wikidata-names.mjs`.
  3. `scripts/i18n/names-es.tsv`: plantillas traducidas a mano. `{S}` es izquierdo/derecho y `{S:m|f|mp|fp}` da la concordancia.

  Con `--missing` se listan los nombres que faltan. `npm run validate` falla si el JSON está desactualizado.

- **Geometría**
  - Se genera con `scripts/encode-models.mjs [atlas.json|atlas-female.json]`, a partir de los `.bin` que produce el optimizador.
  - Posiciones en uint16 y normales en int8, comprimidas con meshoptimizer y luego gzip.
  - El cliente decodifica con `meshoptimizer/decoder` y la versión debe coincidir con la del codificador.
  - El codificador también repara las normales nulas de los datos de origen.
- **Práctica** (`app/study/quiz.ts`, `use-quiz.ts`, `app/panels/quiz-panel.tsx`)
  - Nivel "Principales": lista `BASIC` de estructuras conocidas. Nivel "Todas": conceptos de un solo sistema, de 12 piezas como máximo y de al menos 5 cm.
  - Solo se pregunta por estructuras de los sistemas visibles.
  - Durante la práctica se ocultan los nombres al pasar el ratón y la ficha de detalle.
- **Enlaces** (`app/study/share-link.ts`): `?model=female&concept=FMA7088&view=front&explode=40&layers=skeletal,cardiac&isolate=1`. `part=` sustituye a `concept=` cuando se tocó una pieza suelta. La posición exacta de la cámara al girar no se guarda, solo la vista predefinida.
- **Modelo femenino híbrido** (`scripts/build-female-hybrid.mjs`, fase 7):
  - La fuente HRA solo trae 16 músculos y 91 piezas de esqueleto, así que el modelo femenino toma de BodyParts3D todo lo común a ambos sexos.
  - Se quitan 20 piezas masculinas (pene, testículos, epidídimos, conductos deferentes, vesículas seminales, próstata, vasos dorsales del pene).
  - De HRA (guardado en `data/hra-female/`, fuera de `public/`) vienen 66 piezas: útero, cuello, trompas, ovarios, vagina, ligamentos, vasos uterinos, mamas y la capa de embarazo.
  - Pelvis: ancho escalado por las cabezas femorales, altura y profundidad reales; el extremo inferior de la vagina va al hiato urogenital (debajo del vértice de la próstata, delante del conducto anal) y se gira hasta 12° para chocar lo menos posible con vejiga, recto y huesos (queda ~13 % de muestras en contacto: el espacio rectovesical masculino es estrecho).
  - Mamas: escala por estatura y apoyadas sobre el pectoral mayor (mediana de la separación).
  - Vasos testiculares → ováricos (mismo origen, cortados en el estrecho superior de la pelvis); uretra cortada a sus 4 cm proximales; piel sin genitales externos masculinos y cubriendo las mamas.
  - Pelvis ósea (fase 8): `scripts/pelvis-landmarks.mjs` detecta las referencias (tuberosidades, espinas, sínfisis, EIAS, crestas, promontorio, cóccix…) y mide; `scripts/pelvis-warp.mjs` define los cocientes mujer/hombre (`RATIOS`) y las ganancias de calibración (`GAIN`). El build imprime la tabla hombre/mujer/objetivo y el jacobiano mínimo (debe ser > 0: sin pliegues; hoy 0,60). Las cabezas femorales, trocánteres y L5 son anclas fijas. La malla del coxal es gruesa (~1000 vértices): el ángulo subpúbico (86° → 102°) solo vale como comparación.
  - Vulva y uretra (fase 9): `scripts/vulva.mjs` genera tubos (spline Catmull-Rom) y elipsoides anclados al modelo ya deformado: piso del vestíbulo 2 cm bajo el final de la vagina, meato 1,6 cm delante del orificio vaginal, glande bajo la sínfisis, pilares siguiendo el borde medial de las ramas isquiopúbicas (`ramusEdge`). La piel entre los muslos (restos del escroto) se recorta y los labios mayores son una superficie de altura diseñada que se une a la piel que queda (altura tomada del borde de la piel conservada). Revisión con cortes coronales/sagitales (matplotlib) y `?concept=HYB:vulva&isolate=1`.
  - Para regenerarlo: `node scripts/build-female-hybrid.mjs && node scripts/encode-models.mjs atlas-female.json && node scripts/build-names-es.mjs`.
- **Publicar**: se hace push directo a `main` con la cuenta `ingibanezcarrasco`.
- **Comprobaciones** antes de cada commit: `npm run format:check && npm run lint && npm run check && npm run validate && npm run build`.

## Pendiente (ideas propuestas)

- **Modelo femenino, siguientes pasos**:
  - músculos del triángulo urogenital (bulboesponjoso, isquiocavernoso, transverso superficial del periné), que tampoco trae BodyParts3D;
  - himen (variable entre personas; se omitió);
  - revisión por alguien con formación anatómica de la colocación de útero y ovarios.
- **Accesibilidad**:
  - navegación por teclado del visor 3D;
  - anuncios para lectores de pantalla al seleccionar una estructura;
  - revisar contraste y foco.
- **Herramientas de estudio, siguientes pasos**: guardar la órbita exacta de la cámara en el enlace; repaso de los fallos; estadísticas por sistema.
- **Revisión anatómica de las traducciones**: nadie experto ha revisado las traducciones manuales, ni las del modelo femenino ni las del masculino.
- **Test de navegador en CI**: el CI no tiene ninguna prueba de interfaz; las pruebas de navegador con Playwright solo se hicieron a mano durante las fases.
- **`npm audit fix`**: hay vulnerabilidades en dependencias transitivas de desarrollo.
- **Nombres duplicados en los datos de origen**: por ejemplo, hay dos "Cardinal Ligament".
- **Limpieza**: borrar la rama remota `chore/maintainability`, que ya no se usa.
