import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { SYSTEMS, type Sex, type SystemId, type View } from './anatomy';
import type { ErrorCode } from './errors';
import type { QuizLevel, QuizMode } from './study/quiz';

export type Lang = 'en' | 'es';
export const LANGS: Lang[] = ['en', 'es'];

const en = {
  locale: 'en-US',
  langName: 'English',
  switchTo: 'Switch to Spanish',
  header: {
    eyebrow: 'INTERACTIVE ANATOMY',
    pieces: 'modeled pieces',
    panels: 'Explorer panels',
    search: 'Search anatomy',
    find: 'Find a structure',
    about: 'About this atlas',
    model: 'Reference anatomy',
    models: { male: 'Male', female: 'Female' } as Record<Sex, string>,
  },
  footer: {
    pan: 'Drag to pan',
    orbit: 'Drag to orbit',
    zoom: 'Pinch to zoom',
    inspect: 'Tap to inspect',
    credits: 'Source & credits',
  },
  layers: {
    region: 'Anatomical layers',
    heading: 'Systems',
    close: 'Close systems',
    all: 'All',
    skeleton: 'Skeleton',
    organs: 'Organs',
    showOnly: (system: string) => `Show only ${system.toLowerCase()}`,
    show: (system: string) => `Show ${system.toLowerCase()}`,
    visible: (n: string) => `${n} pieces visible`,
    hideAll: 'Hide all',
    partial: 'partial',
    partialTitle: 'The source collection includes only some of these structures.',
    partialNote: (systems: string[], counts: string[]) =>
      `This model's ${systems.join(' and ')} are incomplete: the source collection includes only ${counts.map((c, i) => `${c} ${systems[i] === 'skeleton' ? 'skeletal pieces' : systems[i]}`).join(' and ')}.`,
  },
  search: {
    region: 'Find anatomy',
    heading: 'Find a structure',
    close: 'Close search',
    placeholder: 'Heart, femur, cranial nerve…',
    input: 'Search named anatomical structures',
    empty: 'No structures match your search.',
    pieces: (n: number) => `${n} ${n === 1 ? 'piece' : 'pieces'}`,
    limited: (n: number) =>
      `Showing up to ${n} matches. Refine your search to find smaller structures.`,
    hint: 'Start with a major organ, or search every named structure.',
  },
  quiz: {
    open: 'Practice',
    region: 'Practice',
    heading: 'Practice',
    close: 'End practice',
    modeLabel: 'Question type',
    modes: { name: 'Name it', locate: 'Find it' } as Record<QuizMode, string>,
    levelLabel: 'Structures',
    levels: { basic: 'Main', all: 'All' } as Record<QuizLevel, string>,
    scoreLabel: 'Score',
    score: (right: string, total: string) => `${right} / ${total}`,
    streak: (n: string) => `${n} in a row`,
    nameQuestion: 'Which structure is highlighted?',
    locateQuestion: 'Tap on the body:',
    locateHint: 'Hide layers or explode the anatomy to reach deeper structures.',
    correct: 'Correct!',
    wrong: (answer: string) => `The answer is ${answer}.`,
    tapped: (name: string) => `You tapped ${name}.`,
    isolate: 'Isolate',
    context: 'Show in context',
    reveal: 'Show answer',
    next: 'Next',
    skip: 'Skip',
    empty: 'Turn on more systems to get questions.',
    scope: (n: string) => `Questions from ${n} structures in the visible systems.`,
  },
  share: {
    button: 'Copy a link to this view',
    copied: 'Link copied',
    failed: 'The link could not be copied',
  },
  views: {
    region: 'Camera controls',
    labels: { 'three-quarter': '¾', front: 'F', side: 'S', back: 'B' } as Record<View, string>,
    names: {
      'three-quarter': 'three-quarter view',
      front: 'front view',
      side: 'side view',
      back: 'back view',
    } as Record<View, string>,
    rotate: 'Rotate body',
    pause: 'Pause rotation',
    autoRotate: 'Auto rotate',
    reset: 'Reset view and layers',
    resetShort: 'Reset',
  },
  dock: {
    openLayers: 'Open system layers',
    systems: 'Systems',
    explode: 'Explode anatomy',
    assembled: 'Assembled',
    everyPiece: 'Every piece',
    reset: 'Reset',
    assembleReset: 'Assemble and reset',
  },
  caption: {
    selected: 'SELECTED STRUCTURE',
    inventory: 'ANATOMICAL INVENTORY',
    separated: 'SEPARATED STRUCTURES',
    assembled: { male: 'ADULT HUMAN · MALE', female: 'ADULT HUMAN · FEMALE' } as Record<
      Sex,
      string
    >,
  },
  detail: {
    eyebrow: 'ANATOMY',
    contextNote: 'System overview · structure identified from source anatomy',
    reference: 'Atlas reference',
    selectedPieces: 'Selected pieces',
    included: 'Included structures',
    more: (n: number) => `And ${n} more modeled pieces.`,
    source: 'View anatomical source',
    isolate: 'Isolate structure',
    showSurrounding: 'Show surrounding anatomy',
    clear: 'Clear selection',
    close: 'Close',
  },
  about: {
    eyebrow: 'SOURCE & SCOPE',
    title: 'A body, revealed.',
    description: 'Explore two independent, licensed reference collections.',
    datasetTitle: 'Male · BodyParts3D',
    dataset:
      '2,234 individual meshes and 3,432 named concepts from an adult male reference anatomy.',
    femaleTitle: 'Female · Human Reference Atlas',
    female:
      '888 source meshes, including the whole-body surface, selected organs, and female reproductive anatomy. Skeleton and muscle coverage is partial. Eight pregnancy reference pieces are in a separate layer, hidden by default.',
    scope:
      'These collections have different coverage. Neither contains every human structure or variation. Named concepts can contain multiple pieces; each source mesh is rendered once.',
    disclaimer:
      'Colors and system groupings are designed for exploration. The geometry is simplified for the web, and short explanations provide general educational context. This is an anatomical reference, not a diagnostic or surgical tool.',
    sourceHeading: 'Source',
    source:
      'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.',
    femaleSource:
      'Kristen Browne and Heidi Schlehlein, Human Reference Atlas / HuBMAP, 3D Reference Organ Set for Female v1.5 (2023), licensed under CC Attribution 4.0 International.',
    femaleDataset: 'Female reference dataset',
    license: 'Dataset license',
    original: 'Original geometry & metadata',
    publication: 'Read the source publication',
  },
  loading: {
    title: 'Preparing the anatomy',
    progress: (percent: number, pieces: string) => `${percent}% · Loading ${pieces} pieces`,
    reload: 'Reload viewer',
  },
  errors: {
    webgl: 'This browser could not start the 3D viewer. Please try a browser with WebGL enabled.',
    contextLost: 'The 3D session was paused by your device. Reload to continue.',
    catalogue: 'The anatomy catalogue could not be loaded.',
    fileLoad: 'An anatomy file could not be loaded.',
    fileIncomplete: 'An anatomy file was incomplete. Please reload the viewer.',
    assemble: 'Could not assemble anatomy geometry.',
    load: 'Could not load the anatomy.',
  } as Record<ErrorCode, string>,
  canvas:
    'Interactive human anatomy. Drag to orbit, pinch or scroll to zoom, and tap a structure to inspect it.',
  systems: Object.fromEntries(
    SYSTEMS.map((s) => [s.id, { name: s.name, description: s.description }]),
  ) as Record<SystemId, { name: string; description: string }>,
  /** Replaces the (male) reproductive system description in the female atlas. */
  femaleReproductive:
    'Female reproductive structures include the ovaries, uterine tubes, uterus, cervix, and vagina. Together they support oocyte development, fertilization, menstruation, and pregnancy.',
  /** Short explanations for individual organs, keyed by the atlas (English) concept name. */
  explanations: {
    heart:
      'A muscular pump in the chest. Its right side sends blood to the lungs; its left side sends blood through the systemic circulation.',
    liver:
      'A large organ beneath the right side of the diaphragm. It processes absorbed nutrients, produces bile, and synthesizes many proteins carried in the blood.',
    brain:
      'The central organ of the nervous system. Its interconnected regions support perception, movement, memory, language, and the regulation of bodily functions.',
    stomach:
      'A muscular chamber between the esophagus and small intestine. It stores and mixes food with acid and enzymes before releasing it into the duodenum.',
    spleen:
      'A lymphoid organ in the upper left abdomen. It filters blood, removes aging blood cells, and participates in immune responses.',
    pancreas:
      'An abdominal organ with digestive and endocrine roles. It supplies enzymes to the small intestine and releases hormones including insulin and glucagon.',
    'urinary bladder':
      'A muscular reservoir in the pelvis that stores urine arriving from the kidneys through the ureters.',
    trachea:
      'The main airway connecting the larynx to the bronchi. Its cartilage supports keep the airway open during breathing.',
    diaphragm:
      'A broad muscle separating the chest and abdomen. When it contracts, it increases chest volume and helps draw air into the lungs.',
    uterus:
      'A hollow muscular organ in the pelvis. Its lining changes through the menstrual cycle and can support implantation and development during pregnancy.',
    vagina:
      'A muscular canal connecting the cervix of the uterus to the outside of the body. It provides a passage for menstrual flow and forms part of the birth canal.',
    ovary:
      'An organ that contains developing oocytes and produces hormones including estrogen and progesterone.',
  } as Record<string, string>,
};

export type Messages = typeof en;

const es: Messages = {
  locale: 'es-ES',
  langName: 'Español',
  switchTo: 'Cambiar a inglés',
  header: {
    eyebrow: 'ANATOMÍA INTERACTIVA',
    pieces: 'piezas modeladas',
    panels: 'Paneles del explorador',
    search: 'Buscar en la anatomía',
    find: 'Buscar una estructura',
    about: 'Acerca de este atlas',
    model: 'Anatomía de referencia',
    models: { male: 'Masculina', female: 'Femenina' },
  },
  footer: {
    pan: 'Arrastra para desplazar',
    orbit: 'Arrastra para girar',
    zoom: 'Pellizca para acercar',
    inspect: 'Toca para inspeccionar',
    credits: 'Fuente y créditos',
  },
  layers: {
    region: 'Capas anatómicas',
    heading: 'Sistemas',
    close: 'Cerrar sistemas',
    all: 'Todos',
    skeleton: 'Esqueleto',
    organs: 'Órganos',
    showOnly: (system) => `Mostrar solo ${system.toLowerCase()}`,
    show: (system) => `Mostrar ${system.toLowerCase()}`,
    visible: (n) => `${n} piezas visibles`,
    hideAll: 'Ocultar todo',
    partial: 'parcial',
    partialTitle: 'La colección de origen solo incluye parte de estas estructuras.',
    partialNote: (systems, counts) =>
      `En este modelo, ${systems.map((s) => (s === 'esqueleto' ? 'el esqueleto' : `los ${s}`)).join(' y ')} están incompletos: la colección de origen solo incluye ${counts.map((c, i) => `${c} ${systems[i] === 'esqueleto' ? 'piezas óseas' : systems[i]}`).join(' y ')}.`,
  },
  search: {
    region: 'Buscar en la anatomía',
    heading: 'Buscar una estructura',
    close: 'Cerrar búsqueda',
    placeholder: 'Corazón, fémur, nervio craneal…',
    input: 'Buscar estructuras anatómicas por nombre',
    empty: 'Ninguna estructura coincide con tu búsqueda.',
    pieces: (n) => `${n} ${n === 1 ? 'pieza' : 'piezas'}`,
    limited: (n) =>
      `Se muestran hasta ${n} resultados. Precisa la búsqueda para encontrar estructuras más pequeñas.`,
    hint: 'Empieza por un órgano principal o busca cualquier estructura con nombre.',
  },
  quiz: {
    open: 'Practicar',
    region: 'Práctica',
    heading: 'Práctica',
    close: 'Terminar la práctica',
    modeLabel: 'Tipo de pregunta',
    modes: { name: 'Nombrar', locate: 'Localizar' },
    levelLabel: 'Estructuras',
    levels: { basic: 'Principales', all: 'Todas' },
    scoreLabel: 'Puntuación',
    score: (right, total) => `${right} / ${total}`,
    streak: (n) => `${n} seguidas`,
    nameQuestion: '¿Qué estructura está resaltada?',
    locateQuestion: 'Toca en el cuerpo:',
    locateHint: 'Oculta capas o separa la anatomía para llegar a las estructuras internas.',
    correct: '¡Correcto!',
    wrong: (answer) => `La respuesta es: ${answer}.`,
    tapped: (name) => `Has tocado: ${name}.`,
    isolate: 'Aislar',
    context: 'Ver en contexto',
    reveal: 'Ver respuesta',
    next: 'Siguiente',
    skip: 'Saltar',
    empty: 'Activa más sistemas para recibir preguntas.',
    scope: (n) => `Preguntas sobre ${n} estructuras de los sistemas visibles.`,
  },
  share: {
    button: 'Copiar un enlace a esta vista',
    copied: 'Enlace copiado',
    failed: 'No se pudo copiar el enlace',
  },
  views: {
    region: 'Controles de cámara',
    labels: { 'three-quarter': '¾', front: 'F', side: 'L', back: 'P' },
    names: {
      'three-quarter': 'Vista de tres cuartos',
      front: 'Vista frontal',
      side: 'Vista lateral',
      back: 'Vista posterior',
    },
    rotate: 'Girar el cuerpo',
    pause: 'Pausar el giro',
    autoRotate: 'Giro automático',
    reset: 'Restablecer vista y capas',
    resetShort: 'Restablecer',
  },
  dock: {
    openLayers: 'Abrir capas de sistemas',
    systems: 'Sistemas',
    explode: 'Separar la anatomía',
    assembled: 'Ensamblado',
    everyPiece: 'Cada pieza',
    reset: 'Reiniciar',
    assembleReset: 'Ensamblar y reiniciar',
  },
  caption: {
    selected: 'ESTRUCTURA SELECCIONADA',
    inventory: 'INVENTARIO ANATÓMICO',
    separated: 'ESTRUCTURAS SEPARADAS',
    assembled: { male: 'VARÓN ADULTO', female: 'MUJER ADULTA' },
  },
  detail: {
    eyebrow: 'ANATOMÍA',
    contextNote: 'Resumen del sistema · estructura identificada en la anatomía de origen',
    reference: 'Referencia del atlas',
    selectedPieces: 'Piezas seleccionadas',
    included: 'Estructuras incluidas',
    more: (n) => `Y ${n} piezas modeladas más.`,
    source: 'Ver la fuente anatómica',
    isolate: 'Aislar estructura',
    showSurrounding: 'Mostrar la anatomía circundante',
    clear: 'Quitar selección',
    close: 'Cerrar',
  },
  about: {
    eyebrow: 'FUENTE Y ALCANCE',
    title: 'Un cuerpo, al descubierto.',
    description: 'Explora dos colecciones de referencia independientes y con licencia abierta.',
    datasetTitle: 'Masculina · BodyParts3D',
    dataset:
      '2.234 mallas individuales y 3.432 conceptos con nombre de una anatomía de referencia de un varón adulto.',
    femaleTitle: 'Femenina · Human Reference Atlas',
    female:
      '888 mallas de origen, con la superficie corporal completa, órganos seleccionados y la anatomía reproductora femenina. La cobertura del esqueleto y los músculos es parcial. Ocho piezas de referencia del embarazo están en una capa aparte, oculta por defecto.',
    scope:
      'Las dos colecciones tienen coberturas distintas. Ninguna incluye todas las estructuras ni variaciones del cuerpo humano. Un concepto con nombre puede abarcar varias piezas; cada malla de origen se dibuja una sola vez.',
    disclaimer:
      'Los colores y la agrupación por sistemas están pensados para explorar. La geometría está simplificada para la web y las explicaciones breves ofrecen un contexto educativo general. Es una referencia anatómica, no una herramienta de diagnóstico ni quirúrgica.',
    sourceHeading: 'Fuente',
    source:
      'BodyParts3D, © The Database Center for Life Science, con licencia Creative Commons Atribución 4.0 Internacional.',
    femaleSource:
      'Kristen Browne y Heidi Schlehlein, Human Reference Atlas / HuBMAP, 3D Reference Organ Set for Female v1.5 (2023), con licencia Creative Commons Atribución 4.0 Internacional.',
    femaleDataset: 'Conjunto de datos femenino',
    license: 'Licencia del conjunto de datos',
    original: 'Geometría y metadatos originales',
    publication: 'Leer la publicación original',
  },
  loading: {
    title: 'Preparando la anatomía',
    progress: (percent, pieces) => `${percent} % · Cargando ${pieces} piezas`,
    reload: 'Recargar el visor',
  },
  errors: {
    webgl:
      'Este navegador no pudo iniciar el visor 3D. Prueba con un navegador que tenga WebGL activado.',
    contextLost: 'Tu dispositivo pausó la sesión 3D. Recarga la página para continuar.',
    catalogue: 'No se pudo cargar el catálogo anatómico.',
    fileLoad: 'No se pudo cargar un archivo de anatomía.',
    fileIncomplete: 'Un archivo de anatomía llegó incompleto. Recarga el visor.',
    assemble: 'No se pudo ensamblar la geometría anatómica.',
    load: 'No se pudo cargar la anatomía.',
  },
  canvas:
    'Anatomía humana interactiva. Arrastra para girar, pellizca o usa la rueda para acercar y toca una estructura para inspeccionarla.',
  systems: {
    skeletal: {
      name: 'Esqueleto',
      description:
        'Los huesos forman el armazón que sostiene el cuerpo, protegen los órganos y sirven de anclaje a los músculos. Su tejido interno también almacena minerales y produce células sanguíneas.',
    },
    muscular: {
      name: 'Músculos',
      description:
        'Los músculos esqueléticos generan el movimiento tirando de sus inserciones. Junto con los tendones, mueven las articulaciones, estabilizan la postura y producen calor.',
    },
    cardiac: {
      name: 'Corazón',
      description:
        'El corazón es una bomba muscular de cuatro cavidades. Sus válvulas dirigen la sangre hacia delante por los circuitos pulmonar y sistémico.',
    },
    sensory: {
      name: 'Sentidos',
      description:
        'Estas estructuras participan en los sentidos especiales, como la vista, el oído y el equilibrio. Sus tejidos especializados detectan estímulos y trabajan con el sistema nervioso para transmitir la información.',
    },
    arterial: {
      name: 'Arterias',
      description:
        'El corazón impulsa la sangre por la circulación. Las arterias llevan la sangre desde el corazón para irrigar los tejidos o, en el circuito pulmonar, hacia los pulmones.',
    },
    venous: {
      name: 'Venas',
      description:
        'Las venas devuelven la sangre al corazón. Las redes superficiales y profundas recogen la sangre de los tejidos; las venas pulmonares traen de vuelta la sangre oxigenada desde los pulmones.',
    },
    nervous: {
      name: 'Sistema nervioso',
      description:
        'El encéfalo, la médula espinal y los nervios periféricos transmiten y procesan señales. Sostienen la sensibilidad, el movimiento, la coordinación y la regulación automática de las funciones del cuerpo.',
    },
    respiratory: {
      name: 'Respiratorio',
      description:
        'Las vías respiratorias conducen el aire hasta los pulmones, donde el oxígeno y el dióxido de carbono pasan entre el aire y la sangre. La respiración depende de los cambios de presión que producen los músculos respiratorios.',
    },
    digestive: {
      name: 'Digestivo',
      description:
        'El tubo digestivo descompone los alimentos, absorbe nutrientes y agua y hace avanzar los desechos. Los órganos anexos aportan bilis y enzimas digestivas.',
    },
    urinary: {
      name: 'Urinario',
      description:
        'Los riñones filtran la sangre y regulan el equilibrio de líquidos, electrolitos y ácido-base. La orina recorre los uréteres hasta la vejiga y sale por la uretra.',
    },
    lymphatic: {
      name: 'Linfático',
      description:
        'Los vasos linfáticos devuelven a la circulación el exceso de líquido de los tejidos. Los ganglios linfáticos y otros órganos linfoides sostienen la vigilancia y la respuesta inmunitarias.',
    },
    endocrine: {
      name: 'Endocrino',
      description:
        'Los órganos endocrinos liberan hormonas a la sangre para coordinar procesos como el metabolismo, el crecimiento, la respuesta al estrés y la reproducción.',
    },
    reproductive: {
      name: 'Reproductor',
      description:
        'Las estructuras reproductoras masculinas representadas aquí participan en la producción, maduración y transporte de los espermatozoides y en la producción de hormonas sexuales.',
    },
    integumentary: {
      name: 'Superficie corporal',
      description:
        'La superficie corporal sirve de referencia anatómica externa. El sistema tegumentario forma una barrera protectora y participa en la sensibilidad y la regulación de la temperatura.',
    },
    connective: {
      name: 'Tejido conectivo',
      description:
        'El cartílago, los ligamentos y otros tejidos conectivos sostienen, unen y separan estructuras. Entre sus funciones están estabilizar las articulaciones y repartir las cargas mecánicas.',
    },
    pregnancy: {
      name: 'Embarazo',
      description:
        'La placenta y el cordón umbilical permiten el intercambio entre la circulación materna y la fetal durante el embarazo. Estas estructuras de referencia se muestran aparte de la anatomía adulta por defecto.',
    },
  },
  femaleReproductive:
    'Las estructuras reproductoras femeninas incluyen los ovarios, las trompas uterinas, el útero, el cuello uterino y la vagina. Juntas participan en el desarrollo de los ovocitos, la fecundación, la menstruación y el embarazo.',
  explanations: {
    heart:
      'Una bomba muscular situada en el tórax. Su lado derecho envía la sangre a los pulmones; su lado izquierdo la impulsa por la circulación sistémica.',
    liver:
      'Un órgano grande situado bajo el lado derecho del diafragma. Procesa los nutrientes absorbidos, produce bilis y sintetiza muchas de las proteínas que circulan en la sangre.',
    brain:
      'El órgano central del sistema nervioso. Sus regiones interconectadas sostienen la percepción, el movimiento, la memoria, el lenguaje y la regulación de las funciones del cuerpo.',
    stomach:
      'Una cavidad muscular entre el esófago y el intestino delgado. Almacena el alimento y lo mezcla con ácido y enzimas antes de pasarlo al duodeno.',
    spleen:
      'Un órgano linfoide situado en la parte superior izquierda del abdomen. Filtra la sangre, elimina los glóbulos rojos envejecidos y participa en la respuesta inmunitaria.',
    pancreas:
      'Un órgano abdominal con funciones digestivas y endocrinas. Aporta enzimas al intestino delgado y libera hormonas como la insulina y el glucagón.',
    'urinary bladder':
      'Un reservorio muscular de la pelvis que almacena la orina que llega desde los riñones por los uréteres.',
    trachea:
      'La vía aérea principal que une la laringe con los bronquios. Sus anillos de cartílago mantienen abierta la vía durante la respiración.',
    diaphragm:
      'Un músculo ancho que separa el tórax del abdomen. Al contraerse aumenta el volumen del tórax y ayuda a que el aire entre en los pulmones.',
    uterus:
      'Un órgano muscular hueco situado en la pelvis. Su revestimiento cambia a lo largo del ciclo menstrual y puede permitir la implantación y el desarrollo durante el embarazo.',
    vagina:
      'Un conducto muscular que une el cuello del útero con el exterior del cuerpo. Da paso al flujo menstrual y forma parte del canal del parto.',
    ovary:
      'Un órgano que contiene los ovocitos en desarrollo y produce hormonas como los estrógenos y la progesterona.',
  },
};

export const MESSAGES: Record<Lang, Messages> = { en, es };

const STORAGE_KEY = 'human-atlas-lang';

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'es') return stored;
  } catch {
    // Storage can be unavailable (private mode, blocked site data); fall back to the browser.
  }
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Messages;
  /** Formats a count with the active language's digit grouping (2,234 / 2.234). */
  n: (value: number) => string;
  /**
   * Display name of an atlas structure from its (English) source name. Spanish names load on
   * demand; until then, or for any name without a translation, the English name is returned.
   */
  name: (english: string) => string;
}

/** Lowercase and strip accents so "femur" matches "fémur". */
export function fold(text: string) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang),
    [spanishNames, setSpanishNames] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    if (lang !== 'es' || spanishNames) return;
    const abort = new AbortController();
    fetch('/models/names-es.json', { signal: abort.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((names) => names && setSpanishNames(names))
      // Without the file the viewer keeps working with the English names.
      .catch(() => {});
    return () => abort.abort();
  }, [lang, spanishNames]);
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Not persisting the choice is acceptable.
    }
  }, [lang]);
  const t = MESSAGES[lang];
  // es-ES omits the thousands separator for four-digit numbers; always group for consistency.
  const n = (value: number) => value.toLocaleString(t.locale, { useGrouping: 'always' });
  const name = (english: string) => {
    const spanish = lang === 'es' ? spanishNames?.[english.toLowerCase().trim()] : undefined;
    return spanish ? spanish.charAt(0).toLocaleUpperCase('es') + spanish.slice(1) : english;
  };
  return (
    <I18nContext.Provider value={{ lang, setLang, t, n, name }}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider.');
  return value;
}
