export type SystemId =
  | 'skeletal'
  | 'muscular'
  | 'arterial'
  | 'venous'
  | 'nervous'
  | 'digestive'
  | 'respiratory'
  | 'urinary'
  | 'reproductive'
  | 'lymphatic'
  | 'endocrine'
  | 'integumentary'
  | 'connective'
  | 'sensory'
  | 'cardiac'
  | 'pregnancy';
export const SYSTEMS: { id: SystemId; name: string; color: string; description: string }[] = [
  {
    id: 'skeletal',
    name: 'Skeleton',
    color: '#e2d9ba',
    description:
      'Bones form the supporting framework of the body, protect organs, and provide attachment points for muscles. Their internal tissue also stores minerals and produces blood cells.',
  },
  {
    id: 'muscular',
    name: 'Muscles',
    color: '#a85b50',
    description:
      'Skeletal muscles generate movement by pulling on their attachments. Together with tendons, they move joints, stabilize posture, and produce heat.',
  },
  {
    id: 'cardiac',
    name: 'Heart',
    color: '#b96760',
    description:
      'The heart is a muscular pump with four chambers. Its valves direct blood forward through the pulmonary and systemic circuits.',
  },
  {
    id: 'sensory',
    name: 'Sensory organs',
    color: '#b0c8ce',
    description:
      'These structures contribute to special senses, including sight, hearing, and balance. Their specialized tissues detect stimuli and work with the nervous system to convey information.',
  },
  {
    id: 'arterial',
    name: 'Arteries',
    color: '#c05245',
    description:
      'The heart drives blood through the circulation. Arteries carry blood away from the heart to supply tissues or, in the pulmonary circuit, to the lungs.',
  },
  {
    id: 'venous',
    name: 'Veins',
    color: '#527c9f',
    description:
      'Veins return blood toward the heart. Superficial and deep networks collect blood from the tissues; the pulmonary veins bring oxygenated blood back from the lungs.',
  },
  {
    id: 'nervous',
    name: 'Nervous system',
    color: '#d8b565',
    description:
      'The brain, spinal cord, and peripheral nerves carry and process signals. They support sensation, movement, coordination, and automatic regulation of body functions.',
  },
  {
    id: 'respiratory',
    name: 'Respiratory',
    color: '#b98991',
    description:
      'The airways conduct air to the lungs, where oxygen and carbon dioxide move between air and blood. Breathing depends on pressure changes produced by respiratory muscles.',
  },
  {
    id: 'digestive',
    name: 'Digestive',
    color: '#b8916b',
    description:
      'The digestive tract breaks down food, absorbs nutrients and water, and moves waste onward. Accessory organs contribute bile and digestive enzymes.',
  },
  {
    id: 'urinary',
    name: 'Urinary',
    color: '#b47961',
    description:
      'The kidneys filter blood and regulate fluid, electrolyte, and acid–base balance. Urine travels through the ureters to the bladder and exits through the urethra.',
  },
  {
    id: 'lymphatic',
    name: 'Lymphatic',
    color: '#879f7c',
    description:
      'Lymphatic vessels return excess tissue fluid to the circulation. Lymph nodes and other lymphoid organs support immune surveillance and responses.',
  },
  {
    id: 'endocrine',
    name: 'Endocrine',
    color: '#c5a09a',
    description:
      'Endocrine organs release hormones into the blood to coordinate processes such as metabolism, growth, stress responses, and reproduction.',
  },
  {
    id: 'reproductive',
    name: 'Reproductive',
    color: '#bda098',
    description:
      'The male reproductive structures represented here contribute to sperm production, maturation, transport, and the production of sex hormones.',
  },
  {
    id: 'integumentary',
    name: 'Body surface',
    color: '#ba9b7d',
    description:
      'The body surface provides an outer anatomical reference. The integumentary system forms a protective barrier and contributes to sensation and temperature regulation.',
  },
  {
    id: 'connective',
    name: 'Connective tissue',
    color: '#aec3bb',
    description:
      'Cartilage, ligaments, and other connective tissues support, connect, and separate structures. Their roles include stabilizing joints and distributing mechanical loads.',
  },
  {
    id: 'pregnancy',
    name: 'Pregnancy reference',
    color: '#b88380',
    description:
      'The placenta and umbilical cord support exchange between maternal and fetal circulations during pregnancy. These reference structures are shown separately from the default adult anatomy.',
  },
];
export interface Part {
  id: string;
  name: string;
  conceptId: string;
  system: SystemId;
  chunk: number;
  /** Byte offsets and lengths of the meshopt-encoded buffers within the decompressed chunk. */
  positions: number;
  positionsBytes: number;
  normals: number;
  normalsBytes: number;
  indices: number;
  indicesBytes: number;
  vertexCount: number;
  indexCount: number;
  /** Also the quantization box: positions are uint16 over the largest extent from bounds[0]. */
  bounds: [number[], number[]];
}
export interface Concept {
  id: string;
  name: string;
  elements: string[];
}
export interface Atlas {
  version: string;
  sex?: Sex;
  source?: string;
  scope?: string;
  parts: Part[];
  concepts: Concept[];
  /** Gzipped chunks in load-priority order; `bytes` is the decompressed size. */
  chunks: { url: string; bytes: number; gzipBytes: number }[];
  triangles: number;
}
export type View = 'three-quarter' | 'front' | 'back' | 'side';
export interface SceneState {
  inspectorOpen?: boolean;
  explode: number;
  visible: SystemId[];
  selected: string[];
  isolate: boolean;
  view: View;
  rotate: boolean;
  reset: number;
}
export type SetSceneState = (update: (s: SceneState) => SceneState) => void;
export const DEFAULT_VISIBLE: SystemId[] = [
  'cardiac',
  'sensory',
  'skeletal',
  'muscular',
  'arterial',
  'venous',
  'nervous',
  'respiratory',
  'digestive',
  'urinary',
  'lymphatic',
  'endocrine',
  'reproductive',
  'connective',
];

export type Sex = 'male' | 'female';
/** The two reference collections; each has its own catalogue and geometry chunks. */
export const MODELS: Record<
  Sex,
  { url: string; source: string; pieces: number; defaultVisible: SystemId[] }
> = {
  male: {
    url: '/models/atlas.json',
    source: 'BodyParts3D',
    pieces: 2234,
    defaultVisible: DEFAULT_VISIBLE,
  },
  female: {
    url: '/models/atlas-female.json',
    source: 'HRA',
    pieces: 888,
    // Skeleton and muscle coverage is partial, so the translucent body surface gives the outline.
    defaultVisible: [...DEFAULT_VISIBLE, 'integumentary'],
  },
};
