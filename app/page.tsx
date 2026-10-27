import { flushSync } from 'react-dom';
import { registerAtlasTools } from './agent-tools';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Info, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AnatomyScene from './scene/anatomy-scene';
import { AboutSheet } from './panels/about-sheet';
import { BottomDock, SceneCaption } from './panels/bottom-dock';
import { DetailSheet } from './panels/detail-sheet';
import { LayersPanel } from './panels/layers-panel';
import { LoadStatus } from './panels/load-status';
import { SearchPanel } from './panels/search-panel';
import { ViewControls } from './panels/view-controls';
import {
  DEFAULT_VISIBLE,
  SYSTEMS,
  type Atlas,
  type Concept,
  type SceneState,
  type SystemId,
} from './anatomy';
const initial: SceneState = {
  explode: 0,
  visible: DEFAULT_VISIBLE,
  selected: [],
  isolate: false,
  view: 'three-quarter',
  rotate: false,
  reset: 0,
};
export default function Home() {
  const [atlas, setAtlas] = useState<Atlas | null>(null),
    [state, setState] = useState(initial),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(''),
    [panel, setPanel] = useState<'layers' | 'search' | null>(null),
    [details, setDetails] = useState(false),
    [about, setAbout] = useState(false),
    [query, setQuery] = useState(''),
    [chosen, setChosen] = useState<Concept | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    setProgress(0);
    setError('');
    setAtlas(null);
    setChosen(null);
    setDetails(false);
    setState({ ...initial, visible: DEFAULT_VISIBLE });
    fetch('/models/atlas.json', { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw new Error('The anatomy catalogue could not be loaded.');
        return r.json();
      })
      .then((data) => setAtlas(data as Atlas))
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => abort.abort();
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setPanel('search');
        setDetails(false);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const parts = useMemo(() => new Map(atlas?.parts.map((p) => [p.id, p])), [atlas]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        SYSTEMS.map((s) => [s.id, atlas?.parts.filter((p) => p.system === s.id).length ?? 0]),
      ),
    [atlas],
  );
  const activeSystems = SYSTEMS.filter((s) => counts[s.id] > 0);
  const selectedParts = state.selected.map((id) => parts.get(id)).filter((p) => !!p);
  const visibleCount =
    atlas?.parts.filter((p) =>
      state.isolate
        ? state.selected.includes(p.id)
        : state.visible.includes(p.system) || state.selected.includes(p.id),
    ).length ?? 0;
  const choose = (c: Concept) => {
    setChosen(c);
    setState((s) => ({ ...s, selected: c.elements, isolate: false, rotate: false }));
    setDetails(true);
    setPanel(null);
  };
  useEffect(() => {
    if (!atlas) return;
    return registerAtlasTools(atlas, (c) => flushSync(() => choose(c)));
  }, [atlas]);
  const choosePart = (id: string) => {
    const p = parts.get(id);
    if (!p) return;
    setChosen({ id: p.conceptId, name: p.name, elements: [id] });
    setState((s) => ({ ...s, selected: [id], isolate: false, rotate: false }));
    setDetails(true);
    setPanel(null);
  };
  const toggle = (id: SystemId) => {
    setDetails(false);
    setState((s) => ({
      ...s,
      selected: [],
      isolate: false,
      visible: s.visible.includes(id) ? s.visible.filter((x) => x !== id) : [...s.visible, id],
    }));
  };
  const reset = () => {
    setState((s) => ({ ...initial, visible: DEFAULT_VISIBLE, reset: s.reset + 1 }));
    setChosen(null);
    setDetails(false);
    setPanel(null);
  };
  const openPanel = (next: 'layers' | 'search') => {
    setDetails(false);
    setPanel((p) => (p === next ? null : next));
  };
  const openAbout = () => {
    setDetails(false);
    setPanel(null);
    setAbout(true);
  };
  return (
    <main className="studio">
      {atlas && (
        <AnatomyScene
          atlas={atlas}
          state={{ ...state, inspectorOpen: details && selectedParts.length > 0 }}
          onSelect={choosePart}
          onProgress={(n) => {
            setProgress(n);
            if (n === 100) setError('');
          }}
          onError={setError}
        />
      )}
      <div className="vignette" />
      <header className="identity">
        <div className="eyebrow">
          <span className="status-dot" /> INTERACTIVE ANATOMY
        </div>
        <h1>
          Human Atlas
          <Badge variant="outline" className="edition">
            3D
          </Badge>
        </h1>
        <div className="identity-meta">
          {atlas ? atlas.parts.length.toLocaleString() : '2,234'} modeled pieces <span>·</span>{' '}
          BodyParts3D
        </div>
      </header>
      <nav className="top-actions" aria-label="Explorer panels">
        <Button
          variant="ghost"
          className={panel === 'search' ? 'active' : ''}
          onClick={() => openPanel('search')}
          aria-label="Search anatomy"
        >
          <Search size={18} />
          <span>Find a structure</span>
          <kbd>/</kbd>
        </Button>
        <Button
          variant="ghost"
          className="icon-button"
          aria-label="About this atlas"
          onClick={openAbout}
        >
          <Info size={18} />
        </Button>
      </nav>
      <LayersPanel
        state={state}
        setState={setState}
        systems={activeSystems}
        counts={counts}
        visibleCount={visibleCount}
        mobileOpen={panel === 'layers'}
        onClose={() => setPanel(null)}
        onToggle={toggle}
      />
      {panel === 'search' && (
        <SearchPanel
          atlas={atlas}
          query={query}
          onQueryChange={setQuery}
          onChoose={choose}
          onClose={() => setPanel(null)}
        />
      )}
      <ViewControls state={state} setState={setState} onReset={reset} />
      <SceneCaption state={state} chosenName={chosen?.name} />
      <BottomDock
        state={state}
        setState={setState}
        onReset={reset}
        onOpenLayers={() => openPanel('layers')}
      />
      <footer className="studio-footer">
        <span>
          {state.explode > 0.8 ? 'Drag to pan' : 'Drag to orbit'} <b>·</b> Pinch to zoom <b>·</b>{' '}
          Tap to inspect
        </span>
        <Button variant="ghost" onClick={openAbout}>
          Source & credits <ArrowUpRight size={12} />
        </Button>
      </footer>
      <LoadStatus progress={progress} error={error} partCount={atlas?.parts.length} />
      <DetailSheet
        open={details && selectedParts.length > 0}
        onOpenChange={setDetails}
        state={state}
        setState={setState}
        chosen={chosen}
        selectedParts={selectedParts}
        onChoosePart={choosePart}
      />
      <AboutSheet open={about} onOpenChange={setAbout} />
    </main>
  );
}
