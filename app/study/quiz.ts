import type { Atlas, Concept, Part, SystemId } from '../anatomy';

export type QuizMode = 'name' | 'locate';
export type QuizLevel = 'basic' | 'all';

/** Well-known structures for the basic level; each atlas uses the ones it contains. */
const BASIC = new Set([
  'heart',
  'left ventricle',
  'right ventricle',
  'left atrium',
  'right atrium',
  'brain',
  'cerebellum',
  'brainstem',
  'spinal cord',
  'liver',
  'stomach',
  'spleen',
  'pancreas',
  'gallbladder',
  'esophagus',
  'duodenum',
  'jejunum',
  'ileum',
  'cecum',
  'vermiform appendix',
  'ascending colon',
  'transverse colon',
  'descending colon',
  'sigmoid colon',
  'rectum',
  'tongue',
  'trachea',
  'larynx',
  'left lung',
  'right lung',
  'diaphragm',
  'kidney',
  'ureter',
  'urinary bladder',
  'urethra',
  'adrenal gland',
  'thymus',
  'pituitary gland',
  'thyroid cartilage',
  'prostate',
  'testis',
  'uterus',
  'ovary',
  'vagina',
  'fallopian tube',
  'mammary gland',
  'placenta',
  'umbilical cord',
  'aorta',
  'arch of aorta',
  'pulmonary trunk',
  'superior vena cava',
  'inferior vena cava',
  'common carotid artery',
  'internal jugular vein',
  'femoral artery',
  'mandible',
  'maxilla',
  'frontal bone',
  'parietal bone',
  'temporal bone',
  'occipital bone',
  'zygomatic bone',
  'clavicle',
  'scapula',
  'sternum',
  'humerus',
  'radius',
  'ulna',
  'hip bone',
  'sacrum',
  'coccyx',
  'femur',
  'patella',
  'tibia',
  'fibula',
  'calcaneus',
  'sternocleidomastoid',
  'serratus anterior',
  'external oblique',
  'gluteus maximus',
  'gluteus medius',
  'sartorius',
  'rectus femoris',
  'vastus lateralis',
  'vastus medialis',
  'adductor longus',
  'gracilis',
  'semitendinosus',
  'tibialis anterior',
  'soleus',
]);

/** Names that describe groupings or fragments rather than a recognizable structure. */
const GENERIC = /\b(segment|set|tree|anastomosis|system|region|part|portion|zone|surface)\b/;
/** Smallest structure (largest extent, in meters) asked at the "all" level. */
const MIN_EXTENT = 0.05;
const MAX_ELEMENTS = 12;

export interface QuizItem {
  concept: Concept;
  system: SystemId;
}

function dominantSystem(elements: Part[]) {
  const counts = new Map<SystemId, number>();
  for (const p of elements) counts.set(p.system, (counts.get(p.system) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0][0];
}

function extent(elements: Part[]) {
  let size = 0;
  for (let k = 0; k < 3; k++)
    size = Math.max(
      size,
      Math.max(...elements.map((p) => p.bounds[1][k])) -
        Math.min(...elements.map((p) => p.bounds[0][k])),
    );
  return size;
}

/** Every structure the level can ask about in this atlas, before filtering by visible layers. */
export function quizItems(atlas: Atlas, parts: Map<string, Part>, level: QuizLevel): QuizItem[] {
  const items: QuizItem[] = [];
  for (const concept of atlas.concepts) {
    const key = concept.name.toLowerCase().trim(),
      elements = concept.elements.map((id) => parts.get(id)).filter((p) => !!p);
    if (!elements.length || elements.length < concept.elements.length) continue;
    const system = dominantSystem(elements);
    // The body surface is translucent and cannot be picked while other layers are shown.
    if (system === 'integumentary') continue;
    if (level === 'basic') {
      if (BASIC.has(key)) items.push({ concept, system });
    } else if (
      elements.length <= MAX_ELEMENTS &&
      new Set(elements.map((p) => p.system)).size === 1 &&
      !GENERIC.test(key) &&
      extent(elements) >= MIN_EXTENT
    )
      items.push({ concept, system });
  }
  // Keep one concept per name (the source data repeats a few names).
  const seen = new Set<string>();
  return items.filter(({ concept }) => {
    const key = concept.name.toLowerCase().trim();
    return !seen.has(key) && !!seen.add(key);
  });
}

const shuffle = <T>(items: T[], random: () => number) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/** Picks the next question, avoiding the recently asked ones while the pool allows it. */
export function pickQuestion(pool: QuizItem[], recent: string[], random = Math.random) {
  if (!pool.length) return null;
  const fresh = pool.filter((item) => !recent.includes(item.concept.id));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(random() * from.length)];
}

/**
 * Four answer choices for "name it": the answer plus three structures that share none of its
 * pieces, preferring the same system so the choices are plausible.
 */
export function answerChoices(
  answer: QuizItem,
  items: QuizItem[],
  random = Math.random,
): Concept[] | null {
  const pieces = new Set(answer.concept.elements),
    candidates = items.filter(
      (item) =>
        item.concept.id !== answer.concept.id &&
        !item.concept.elements.some((id) => pieces.has(id)),
    );
  const sameSystem = shuffle(
      candidates.filter((item) => item.system === answer.system),
      random,
    ),
    others = shuffle(
      candidates.filter((item) => item.system !== answer.system),
      random,
    );
  const distractors = [...sameSystem, ...others].slice(0, 3).map((item) => item.concept);
  if (distractors.length < 3) return null;
  return shuffle([answer.concept, ...distractors], random);
}
