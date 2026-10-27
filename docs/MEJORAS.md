# Registro de mejoras

Este documento registra las mejoras ya hechas sobre el proyecto original y las que quedan pendientes,
para poder retomar el trabajo. El README describe el uso del proyecto; aquí se explica qué cambió y por qué.

## Hecho

| Fase                       | Commits                                 | Resumen                                                                                                                                                                                         |
| -------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Mantenibilidad          | `4e65674` `a582293` `e1755e3` `7192368` | Se eliminaron componentes y dependencias sin uso (Cloudflare, wrangler, recharts…). Formato con oxfmt y lint con oxlint. `scene.tsx` se dividió en `app/scene/*` y `page.tsx` en `app/panels/*` |
| 2. CI                      | `179aa58`                               | GitHub Actions (`.github/workflows/ci.yml`) ejecuta format, lint, typecheck, validate y build en cada push                                                                                      |
| 3. Español                 | `fad457a` `27d1475`                     | Interfaz bilingüe (botón EN/ES, se guarda en `localStorage`). 4.129 nombres anatómicos en español                                                                                               |
| 4. Rendimiento             | `bebc2f5`                               | Descarga del modelo masculino: 33,5 → 14,7 MB. Carga por prioridad: esqueleto y órganos primero                                                                                                 |
| 5. Modelo femenino         | `6daea8a`                               | Selector Masculino/Femenino. 888 piezas HRA, 8,2 MB. Capa de embarazo oculta por defecto                                                                                                        |
| 6. Herramientas de estudio | (este commit)                           | Modo práctica (Nombrar / Localizar, nivel Principales o Todas) y enlaces compartibles con la vista                                                                                              |

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
- **Publicar**: se hace push directo a `main` con la cuenta `ingibanezcarrasco`.
- **Comprobaciones** antes de cada commit: `npm run format:check && npm run lint && npm run check && npm run validate && npm run build`.

## Pendiente (ideas propuestas)

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
