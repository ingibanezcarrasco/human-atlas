import { MODELS, SYSTEMS, type SceneState, type Sex, type SystemId, type View } from '../anatomy';

/**
 * The shareable part of the viewer state, kept in the URL query:
 * ?model=female&concept=FMA7088&view=front&explode=40&layers=skeletal,cardiac&isolate=1
 * `part` replaces `concept` when a single piece was picked on the body.
 */
export interface ViewLink {
  sex?: Sex;
  concept?: string;
  part?: string;
  view?: View;
  explode?: number;
  visible?: SystemId[];
  isolate?: boolean;
}

const VIEWS: View[] = ['three-quarter', 'front', 'side', 'back'];

export function readLink(search: string): ViewLink {
  const q = new URLSearchParams(search),
    link: ViewLink = {};
  const model = q.get('model');
  if (model === 'male' || model === 'female') link.sex = model;
  link.concept = q.get('concept') ?? undefined;
  link.part = q.get('part') ?? undefined;
  const view = q.get('view') as View;
  if (VIEWS.includes(view)) link.view = view;
  const explode = Number(q.get('explode'));
  if (q.has('explode') && explode >= 0 && explode <= 100) link.explode = explode / 100;
  const layers = q.get('layers');
  if (layers !== null)
    link.visible = SYSTEMS.map((s) => s.id).filter((id) => layers.split(',').includes(id));
  if (q.get('isolate') === '1') link.isolate = true;
  return link;
}

/** Query string for the current view; defaults are left out to keep links short. */
export function writeLink(
  sex: Sex,
  state: SceneState,
  selection: { concept?: string; part?: string },
) {
  const q = new URLSearchParams();
  if (sex !== 'male') q.set('model', sex);
  if (selection.part) q.set('part', selection.part);
  else if (selection.concept) q.set('concept', selection.concept);
  if (state.view !== 'three-quarter') q.set('view', state.view);
  if (state.explode > 0) q.set('explode', String(Math.round(state.explode * 100)));
  const defaults = MODELS[sex].defaultVisible;
  if (
    state.visible.length !== defaults.length ||
    state.visible.some((id) => !defaults.includes(id))
  )
    q.set(
      'layers',
      SYSTEMS.map((s) => s.id)
        .filter((id) => state.visible.includes(id))
        .join(','),
    );
  if (state.isolate && (selection.part || selection.concept)) q.set('isolate', '1');
  // Keep commas and colons readable; both are valid in a query string.
  return q.toString().replace(/%2C/g, ',').replace(/%3A/g, ':');
}
