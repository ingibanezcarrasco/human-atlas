import { Pause, RotateCcw, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SceneState, SetSceneState, View } from '../anatomy';
import { useI18n } from '../i18n';

const VIEWS: View[] = ['three-quarter', 'front', 'side', 'back'];

interface Props {
  state: SceneState;
  setState: SetSceneState;
  onReset: () => void;
}

export function ViewControls({ state, setState, onReset }: Props) {
  const { t } = useI18n();
  return (
    <nav className="view-controls glass" aria-label={t.views.region}>
      {VIEWS.map((view) => (
        <Button
          variant="ghost"
          key={view}
          className={state.view === view ? 'active' : ''}
          aria-pressed={state.view === view}
          disabled={state.explode > 0.8 && view !== 'front'}
          onClick={() => setState((s) => ({ ...s, view, reset: s.reset + 1, rotate: false }))}
          title={t.views.names[view]}
          aria-label={t.views.names[view]}
        >
          <span>{t.views.labels[view]}</span>
        </Button>
      ))}
      <i />
      <Button
        variant="ghost"
        disabled={state.explode >= 0.4}
        aria-label={state.rotate ? t.views.pause : t.views.rotate}
        title={t.views.autoRotate}
        className={state.rotate ? 'active' : ''}
        onClick={() => setState((s) => ({ ...s, rotate: !s.rotate }))}
      >
        {state.rotate ? <Pause size={17} /> : <RotateCw size={18} />}
      </Button>
      <Button
        variant="ghost"
        aria-label={t.views.reset}
        title={t.views.resetShort}
        onClick={onReset}
      >
        <RotateCcw size={17} />
      </Button>
    </nav>
  );
}
