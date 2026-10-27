import { useRef } from 'react';
import { ArrowUpRight, ChevronRight, Focus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  SYSTEMS,
  type Concept,
  type Part,
  type SceneState,
  type SetSceneState,
  type Sex,
} from '../anatomy';
import { useI18n } from '../i18n';

const MAX_MEMBERS = 50;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: SceneState;
  setState: SetSceneState;
  chosen: Concept | null;
  sex: Sex;
  selectedParts: Part[];
  onChoosePart: (id: string) => void;
}

export function DetailSheet({
  open,
  onOpenChange,
  state,
  setState,
  chosen,
  sex,
  selectedParts,
  onChoosePart,
}: Props) {
  const { lang, t, n, name } = useI18n();
  const detailTitle = useRef<HTMLHeadingElement>(null);
  const selected = selectedParts[0],
    system = SYSTEMS.find((s) => s.id === selected?.system),
    organNote = chosen && t.explanations[chosen.name.toLowerCase()];
  return (
    <Sheet open={open} modal={false} disablePointerDismissal onOpenChange={onOpenChange}>
      <SheetContent
        initialFocus={detailTitle}
        className={`detail-sheet glass ${state.isolate ? 'is-isolated' : ''}`}
        showCloseButton={true}
        closeLabel={t.detail.close}
      >
        <div className="detail-header">
          <div className="detail-accent" style={{ background: system?.color }} />
          <div className="eyebrow">{system ? t.systems[system.id].name : t.detail.eyebrow}</div>
          <SheetTitle ref={detailTitle} tabIndex={-1} className="structure-title">
            {chosen && name(chosen.name)}
          </SheetTitle>
          {chosen && lang !== 'en' && name(chosen.name) !== chosen.name && (
            <span className="structure-source-name" lang="en">
              {chosen.name}
            </span>
          )}
        </div>
        <div className="detail-scroll" key={`${chosen?.id}-${state.isolate}`}>
          <SheetDescription className="structure-description">
            {chosen && selected
              ? (organNote ??
                (sex === 'female' && selected.system === 'reproductive'
                  ? t.femaleReproductive
                  : t.systems[selected.system].description))
              : ''}
          </SheetDescription>
          {chosen && !organNote && <span className="context-note">{t.detail.contextNote}</span>}
          <div className="structure-meta">
            <span>
              {t.detail.reference}
              <strong>{chosen?.id}</strong>
            </span>
            <span>
              {t.detail.selectedPieces}
              <strong>{n(state.selected.length)}</strong>
            </span>
          </div>
          {selectedParts.length > 1 && (
            <div className="member-list">
              <h3>{t.detail.included}</h3>
              {selectedParts.slice(0, MAX_MEMBERS).map((p) => (
                <Button variant="ghost" key={p.id} onClick={() => onChoosePart(p.id)}>
                  <span>{name(p.name)}</span>
                  <ChevronRight size={14} />
                </Button>
              ))}
              {selectedParts.length > MAX_MEMBERS && (
                <p>{t.detail.more(selectedParts.length - MAX_MEMBERS)}</p>
              )}
            </div>
          )}
          <a
            className="source-link"
            href="https://lifesciencedb.jp/bp3d/"
            target="_blank"
            rel="noreferrer"
          >
            {t.detail.source} <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="detail-actions">
          <Button
            className={`primary-action ${state.isolate ? 'active' : ''}`}
            onClick={() => setState((s) => ({ ...s, isolate: !s.isolate, explode: 0 }))}
          >
            <Focus size={18} />
            {state.isolate ? t.detail.showSurrounding : t.detail.isolate}
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
            {t.detail.clear}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
