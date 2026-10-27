import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { SYSTEMS, type SceneState, type SetSceneState, type SystemId } from '../anatomy';

const ORGAN_SYSTEMS: SystemId[] = [
  'cardiac',
  'respiratory',
  'digestive',
  'urinary',
  'endocrine',
  'reproductive',
];

interface Props {
  state: SceneState;
  setState: SetSceneState;
  systems: typeof SYSTEMS;
  counts: Record<string, number>;
  visibleCount: number;
  mobileOpen: boolean;
  onClose: () => void;
  onToggle: (id: SystemId) => void;
}

export function LayersPanel({
  state,
  setState,
  systems,
  counts,
  visibleCount,
  mobileOpen,
  onClose,
  onToggle,
}: Props) {
  const show = (visible: SystemId[]) =>
    setState((s) => ({ ...s, selected: [], isolate: false, visible }));
  return (
    <section
      className={`layers-panel glass ${mobileOpen ? 'mobile-open' : ''}`}
      aria-label="Anatomical layers"
    >
      <div className="panel-heading">
        <span>Systems</span>
        <Button
          variant="ghost"
          className="mobile-only icon-button"
          onClick={onClose}
          aria-label="Close systems"
        >
          <X size={18} />
        </Button>
        <Badge variant="secondary" className="desktop-only small-number">
          {systems.length}
        </Badge>
      </div>
      <div className="layer-presets">
        <Button
          variant="ghost"
          aria-pressed={systems.every((x) => state.visible.includes(x.id))}
          onClick={() => show(systems.map((x) => x.id))}
        >
          All
        </Button>
        <Button
          variant="ghost"
          aria-pressed={state.visible.length === 1 && state.visible[0] === 'skeletal'}
          onClick={() => show(['skeletal'])}
        >
          Skeleton
        </Button>
        <Button
          variant="ghost"
          aria-pressed={
            state.visible.length === ORGAN_SYSTEMS.length &&
            ORGAN_SYSTEMS.every((id) => state.visible.includes(id))
          }
          onClick={() => show(ORGAN_SYSTEMS)}
        >
          Organs
        </Button>
      </div>
      <div className="system-list">
        {systems.map((s) => (
          <div className={`system-row ${state.visible.includes(s.id) ? 'enabled' : ''}`} key={s.id}>
            <Button
              variant="ghost"
              className="system-name"
              title={`Show only ${s.name.toLowerCase()}`}
              onClick={() => show([s.id])}
            >
              <span className="system-dot" style={{ background: s.color }} />
              {s.name}
              <span className="system-count">{counts[s.id]}</span>
            </Button>
            <Switch
              checked={state.visible.includes(s.id)}
              onCheckedChange={() => onToggle(s.id)}
              aria-label={`Show ${s.name.toLowerCase()}`}
            />
          </div>
        ))}
      </div>
      <div className="panel-foot">
        <span>{visibleCount.toLocaleString()} pieces visible</span>
        <Button variant="ghost" onClick={() => show([])}>
          Hide all
        </Button>
      </div>
    </section>
  );
}
