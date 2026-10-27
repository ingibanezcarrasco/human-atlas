import { Pause, RotateCcw, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SceneState, SetSceneState, View } from '../anatomy';

const VIEWS: { view: View; label: string }[] = [
  { view: 'three-quarter', label: '¾' },
  { view: 'front', label: 'F' },
  { view: 'side', label: 'S' },
  { view: 'back', label: 'B' },
];

interface Props {
  state: SceneState;
  setState: SetSceneState;
  onReset: () => void;
}

export function ViewControls({ state, setState, onReset }: Props) {
  return (
    <nav className="view-controls glass" aria-label="Camera controls">
      {VIEWS.map(({ view, label }) => (
        <Button
          variant="ghost"
          key={view}
          className={state.view === view ? 'active' : ''}
          aria-pressed={state.view === view}
          disabled={state.explode > 0.8 && view !== 'front'}
          onClick={() => setState((s) => ({ ...s, view, reset: s.reset + 1, rotate: false }))}
          title={`${view} view`}
          aria-label={`${view} view`}
        >
          <span>{label}</span>
        </Button>
      ))}
      <i />
      <Button
        variant="ghost"
        disabled={state.explode >= 0.4}
        aria-label={state.rotate ? 'Pause rotation' : 'Rotate body'}
        title="Auto rotate"
        className={state.rotate ? 'active' : ''}
        onClick={() => setState((s) => ({ ...s, rotate: !s.rotate }))}
      >
        {state.rotate ? <Pause size={17} /> : <RotateCw size={18} />}
      </Button>
      <Button variant="ghost" aria-label="Reset view and layers" title="Reset" onClick={onReset}>
        <RotateCcw size={17} />
      </Button>
    </nav>
  );
}
