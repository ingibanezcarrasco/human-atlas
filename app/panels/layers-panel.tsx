import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { SYSTEMS, type SceneState, type SetSceneState, type SystemId } from '../anatomy';
import { useI18n } from '../i18n';

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
  /** Systems this model covers only in part. */
  partial: SystemId[];
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
  partial,
  mobileOpen,
  onClose,
  onToggle,
}: Props) {
  const { t, n } = useI18n();
  const show = (visible: SystemId[]) =>
    setState((s) => ({ ...s, selected: [], isolate: false, visible }));
  // The pregnancy reference layer is opt-in: "All" means the adult anatomy.
  const adultSystems = systems.filter((x) => x.id !== 'pregnancy');
  return (
    <section
      className={`layers-panel glass ${mobileOpen ? 'mobile-open' : ''}`}
      aria-label={t.layers.region}
    >
      <div className="panel-heading">
        <span>{t.layers.heading}</span>
        <Button
          variant="ghost"
          className="mobile-only icon-button"
          onClick={onClose}
          aria-label={t.layers.close}
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
          aria-pressed={adultSystems.every((x) => state.visible.includes(x.id))}
          onClick={() => show(adultSystems.map((x) => x.id))}
        >
          {t.layers.all}
        </Button>
        <Button
          variant="ghost"
          aria-pressed={state.visible.length === 1 && state.visible[0] === 'skeletal'}
          onClick={() => show(['skeletal'])}
        >
          {t.layers.skeleton}
        </Button>
        <Button
          variant="ghost"
          aria-pressed={
            state.visible.length === ORGAN_SYSTEMS.length &&
            ORGAN_SYSTEMS.every((id) => state.visible.includes(id))
          }
          onClick={() => show(ORGAN_SYSTEMS)}
        >
          {t.layers.organs}
        </Button>
      </div>
      {partial.length > 0 && (
        <p className="partial-note">
          {t.layers.partialNote(
            partial.map((id) => t.systems[id].name.toLowerCase()),
            partial.map((id) => n(counts[id] ?? 0)),
          )}
        </p>
      )}
      <div className="system-list">
        {systems.map((s) => (
          <div className={`system-row ${state.visible.includes(s.id) ? 'enabled' : ''}`} key={s.id}>
            <Button
              variant="ghost"
              className="system-name"
              title={t.layers.showOnly(t.systems[s.id].name)}
              onClick={() => show([s.id])}
            >
              <span className="system-dot" style={{ background: s.color }} />
              {t.systems[s.id].name}
              {partial.includes(s.id) && (
                <span className="partial-tag" title={t.layers.partialTitle}>
                  {t.layers.partial}
                </span>
              )}
              <span className="system-count">{counts[s.id]}</span>
            </Button>
            <Switch
              checked={state.visible.includes(s.id)}
              onCheckedChange={() => onToggle(s.id)}
              aria-label={t.layers.show(t.systems[s.id].name)}
            />
          </div>
        ))}
      </div>
      <div className="panel-foot">
        <span>{t.layers.visible(n(visibleCount))}</span>
        <Button variant="ghost" onClick={() => show([])}>
          {t.layers.hideAll}
        </Button>
      </div>
    </section>
  );
}
