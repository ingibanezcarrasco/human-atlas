import { useRef } from 'react';
import { ArrowUpRight, ChevronRight, Focus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  EXPLANATIONS,
  SYSTEMS,
  explanation,
  type Concept,
  type Part,
  type SceneState,
  type SetSceneState,
} from '../anatomy';

const MAX_MEMBERS = 50;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: SceneState;
  setState: SetSceneState;
  chosen: Concept | null;
  selectedParts: Part[];
  onChoosePart: (id: string) => void;
}

export function DetailSheet({
  open,
  onOpenChange,
  state,
  setState,
  chosen,
  selectedParts,
  onChoosePart,
}: Props) {
  const detailTitle = useRef<HTMLHeadingElement>(null);
  const selected = selectedParts[0],
    system = SYSTEMS.find((s) => s.id === selected?.system);
  return (
    <Sheet open={open} modal={false} disablePointerDismissal onOpenChange={onOpenChange}>
      <SheetContent
        initialFocus={detailTitle}
        className={`detail-sheet glass ${state.isolate ? 'is-isolated' : ''}`}
        showCloseButton={true}
      >
        <div className="detail-header">
          <div className="detail-accent" style={{ background: system?.color }} />
          <div className="eyebrow">{system?.name ?? 'ANATOMY'}</div>
          <SheetTitle ref={detailTitle} tabIndex={-1} className="structure-title">
            {chosen?.name}
          </SheetTitle>
        </div>
        <div className="detail-scroll" key={`${chosen?.id}-${state.isolate}`}>
          <SheetDescription className="structure-description">
            {chosen && selected ? explanation(chosen.name, selected.system) : ''}
          </SheetDescription>
          {chosen && !EXPLANATIONS[chosen.name.toLowerCase()] && (
            <span className="context-note">
              System overview · structure identified from source anatomy
            </span>
          )}
          <div className="structure-meta">
            <span>
              Atlas reference<strong>{chosen?.id}</strong>
            </span>
            <span>
              Selected pieces<strong>{state.selected.length.toLocaleString()}</strong>
            </span>
          </div>
          {selectedParts.length > 1 && (
            <div className="member-list">
              <h3>Included structures</h3>
              {selectedParts.slice(0, MAX_MEMBERS).map((p) => (
                <Button variant="ghost" key={p.id} onClick={() => onChoosePart(p.id)}>
                  <span>{p.name}</span>
                  <ChevronRight size={14} />
                </Button>
              ))}
              {selectedParts.length > MAX_MEMBERS && (
                <p>And {selectedParts.length - MAX_MEMBERS} more modeled pieces.</p>
              )}
            </div>
          )}
          <a
            className="source-link"
            href="https://lifesciencedb.jp/bp3d/"
            target="_blank"
            rel="noreferrer"
          >
            View anatomical source <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="detail-actions">
          <Button
            className={`primary-action ${state.isolate ? 'active' : ''}`}
            onClick={() => setState((s) => ({ ...s, isolate: !s.isolate, explode: 0 }))}
          >
            <Focus size={18} />
            {state.isolate ? 'Show surrounding anatomy' : 'Isolate structure'}
            <ChevronRight size={16} />
          </Button>
          <Button
            variant="ghost"
            className="secondary-action"
            onClick={() => {
              setState((s) => ({ ...s, selected: [], isolate: false }));
              onOpenChange(false);
            }}
          >
            Clear selection
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
