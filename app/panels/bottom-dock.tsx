import { Layers3, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { SceneState, SetSceneState } from '../anatomy';
import { useI18n } from '../i18n';

interface Props {
  state: SceneState;
  setState: SetSceneState;
  onReset: () => void;
  onOpenLayers: () => void;
}

export function BottomDock({ state, setState, onReset, onOpenLayers }: Props) {
  const { t } = useI18n();
  return (
    <div className="bottom-dock glass">
      <Button
        variant="ghost"
        className="mobile-only dock-layers"
        onClick={onOpenLayers}
        aria-label={t.dock.openLayers}
      >
        <Layers3 size={20} />
        <span>{t.dock.systems}</span>
      </Button>
      <div className="explode-control">
        <div className="explode-label">
          <label id="explode-label">{t.dock.explode}</label>
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
          <span>{t.dock.assembled}</span>
          <span>{t.dock.everyPiece}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        className="dock-reset"
        onClick={onReset}
        aria-label={t.dock.assembleReset}
      >
        <RotateCcw size={18} />
        <span>{t.dock.reset}</span>
      </Button>
    </div>
  );
}

export function SceneCaption({ state, chosenName }: { state: SceneState; chosenName?: string }) {
  const { t } = useI18n();
  return (
    <div className="scene-caption">
      <span className="caption-line" />
      <span>
        {state.isolate
          ? (chosenName ?? t.caption.selected)
          : state.explode > 0.95
            ? t.caption.inventory
            : state.explode > 0.05
              ? t.caption.separated
              : t.caption.assembled}
      </span>
      <span className="caption-line" />
    </div>
  );
}
