import { Layers3, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { SceneState, SetSceneState } from '../anatomy';

interface Props {
  state: SceneState;
  setState: SetSceneState;
  onReset: () => void;
  onOpenLayers: () => void;
}

export function BottomDock({ state, setState, onReset, onOpenLayers }: Props) {
  return (
    <div className="bottom-dock glass">
      <Button
        variant="ghost"
        className="mobile-only dock-layers"
        onClick={onOpenLayers}
        aria-label="Open system layers"
      >
        <Layers3 size={20} />
        <span>Systems</span>
      </Button>
      <div className="explode-control">
        <div className="explode-label">
          <label id="explode-label">Explode anatomy</label>
          <output>
            {Math.round(state.explode * 100)}
            <span>%</span>
          </output>
        </div>
        <Slider
          aria-labelledby="explode-label"
          min={0}
          max={100}
          step={1}
          value={[state.explode * 100]}
          onValueChange={(v) => {
            const percent = Array.isArray(v) ? v[0] : v;
            setState((s) => ({
              ...s,
              explode: percent / 100,
              view: percent > 80 ? 'front' : s.view,
              rotate: false,
            }));
          }}
        />
        <div className="slider-endpoints">
          <span>Assembled</span>
          <span>Every piece</span>
        </div>
      </div>
      <Button
        variant="ghost"
        className="dock-reset"
        onClick={onReset}
        aria-label="Assemble and reset"
      >
        <RotateCcw size={18} />
        <span>Reset</span>
      </Button>
    </div>
  );
}

export function SceneCaption({ state, chosenName }: { state: SceneState; chosenName?: string }) {
  return (
    <div className="scene-caption">
      <span className="caption-line" />
      <span>
        {state.isolate
          ? (chosenName ?? 'SELECTED STRUCTURE')
          : state.explode > 0.95
            ? 'ANATOMICAL INVENTORY'
            : state.explode > 0.05
              ? 'SEPARATED STRUCTURES'
              : 'ADULT HUMAN · MALE'}
      </span>
      <span className="caption-line" />
    </div>
  );
}
