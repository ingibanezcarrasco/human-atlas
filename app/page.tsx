import { flushSync } from 'react-dom';
import { registerAtlasTools } from './agent-tools';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Check, GraduationCap, Info, Link2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AnatomyScene from './scene/anatomy-scene';
import { AboutSheet } from './panels/about-sheet';
import { BottomDock, SceneCaption } from './panels/bottom-dock';
import { DetailSheet } from './panels/detail-sheet';
import { LayersPanel } from './panels/layers-panel';
import { LoadStatus } from './panels/load-status';
import { QuizPanel } from './panels/quiz-panel';
import { SearchPanel } from './panels/search-panel';
import { ViewControls } from './panels/view-controls';
import { ViewerError, errorCode, type ErrorCode } from './errors';
import { useI18n } from './i18n';
import { readLink, writeLink, type ViewLink } from './study/share-link';
import { useQuiz } from './study/use-quiz';
import {
  MODELS,
  SYSTEMS,
  type Atlas,
  type Concept,
  type SceneState,
  type SetSceneState,
  type Sex,
  type SystemId,
} from './anatomy';
const initial: SceneState = {
  explode: 0,
  visible: MODELS.male.defaultVisible,
  selected: [],
  isolate: false,
  view: 'three-quarter',
  rotate: false,
  reset: 0,
};
export default function Home() {
  const { lang, setLang, t, n, name } = useI18n();
  // The view described by the page URL, applied once its model has loaded.
  const link = useRef<ViewLink | null>(readLink(location.search));
  const [sex, setSex] = useState<Sex>(link.current?.sex ?? 'male'),
    [atlas, setAtlas] = useState<Atlas | null>(null),
    [state, setState] = useState(initial),
    [progress, setProgress] = useState(0),
    [error, setError] = useState<ErrorCode | null>(null),
    [panel, setPanel] = useState<'layers' | 'search' | null>(null),
    [details, setDetails] = useState(false),
    [about, setAbout] = useState(false),
    [query, setQuery] = useState(''),
    [chosen, setChosen] = useState<Concept | null>(null),
    [shared, setShared] = useState<'copied' | 'failed' | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    setProgress(0);
    setError(null);
    setAtlas(null);
    setChosen(null);
    setDetails(false);
    setState((s) => ({ ...initial, visible: MODELS[sex].defaultVisible, reset: s.reset + 1 }));
    fetch(MODELS[sex].url, { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw new ViewerError('catalogue', 'The anatomy catalogue could not be loaded.');
        return r.json();
      })
      .then((data) => setAtlas(data as Atlas))
      .catch((e) => {
        if (e.name !== 'AbortError') setError(errorCode(e, 'catalogue'));
      });
    return () => abort.abort();
  }, [sex]);
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
        study.stop();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const parts = useMemo(() => new Map(atlas?.parts.map((p) => [p.id, p])), [atlas]);
  const study = useQuiz(atlas, parts, state.visible, setState),
    quizzing = !!study.quiz;
  // During practice the selection belongs to the quiz, so layer changes keep it.
  const setLayers: SetSceneState = quizzing
    ? (update) => setState((s) => ({ ...update(s), selected: s.selected, isolate: s.isolate }))
    : setState;
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
    if (!p || study.tapPart(id)) return;
    setChosen({ id: p.conceptId, name: p.name, elements: [id] });
    setState((s) => ({ ...s, selected: [id], isolate: false, rotate: false }));
    setDetails(true);
    setPanel(null);
  };
  const toggle = (id: SystemId) => {
    setDetails(false);
    setLayers((s) => ({
      ...s,
      selected: [],
      isolate: false,
      visible: s.visible.includes(id) ? s.visible.filter((x) => x !== id) : [...s.visible, id],
    }));
  };
  const reset = () => {
    study.stop();
    setState((s) => ({ ...initial, visible: MODELS[sex].defaultVisible, reset: s.reset + 1 }));
    setChosen(null);
    setDetails(false);
    setPanel(null);
  };
  const openPanel = (next: 'layers' | 'search') => {
    setDetails(false);
    if (next === 'search') study.stop();
    setPanel((p) => (p === next ? null : next));
  };
  const startQuiz = () => {
    if (quizzing) return study.stop();
    setDetails(false);
    setPanel(null);
    setChosen(null);
    study.start();
  };
  // Apply the linked view once its model is loaded.
  useEffect(() => {
    const l = link.current;
    if (!atlas || !l) return;
    link.current = null;
    const concept = l.concept ? atlas.concepts.find((c) => c.id === l.concept) : undefined,
      part = l.part ? parts.get(l.part) : undefined,
      picked = part
        ? { id: part.conceptId, name: part.name, elements: [part.id] }
        : (concept ?? null);
    setState((s) => ({
      ...s,
      view: l.view ?? s.view,
      explode: l.explode ?? s.explode,
      visible: l.visible ?? s.visible,
      selected: picked?.elements ?? [],
      isolate: !!picked && !!l.isolate,
      reset: s.reset + 1,
    }));
    setChosen(picked);
    setDetails(!!picked);
  }, [atlas]);
  const linkQuery = () =>
    writeLink(
      sex,
      state,
      // Never put a quiz answer in the address bar.
      quizzing || !chosen || !state.selected.length
        ? {}
        : chosen.elements.length === 1 && chosen.id === parts.get(chosen.elements[0])?.conceptId
          ? { part: chosen.elements[0] }
          : { concept: chosen.id },
    );
  // Keep the address bar in step with the view (debounced: browsers rate-limit replaceState).
  useEffect(() => {
    if (!atlas || link.current) return;
    const timer = setTimeout(() => {
      const query = linkQuery();
      history.replaceState(null, '', query ? `?${query}` : location.pathname);
    }, 300);
    return () => clearTimeout(timer);
  });
  const copyLink = async () => {
    const query = linkQuery();
    try {
      await navigator.clipboard.writeText(
        `${location.origin}${location.pathname}${query ? `?${query}` : ''}`,
      );
      setShared('copied');
    } catch {
      setShared('failed');
    }
    setTimeout(() => setShared(null), 2500);
  };
  const openAbout = () => {
    setDetails(false);
    setPanel(null);
    setAbout(true);
  };
  return (
    <main className={`studio ${quizzing ? 'is-quizzing' : ''}`}>
      {atlas && (
        <AnatomyScene
          atlas={atlas}
          // The practice panel takes the inspector's place when framing an isolated structure.
          state={{
            ...state,
            inspectorOpen: quizzing || (details && selectedParts.length > 0),
          }}
          onSelect={choosePart}
          onProgress={(percent) => {
            setProgress(percent);
            if (percent === 100) setError(null);
          }}
          onError={setError}
          label={t.canvas}
          // Hover names would give away the answers during practice.
          nameOf={quizzing ? () => '' : name}
        />
      )}
      <div className="vignette" />
      <header className="identity">
        <div className="eyebrow">
          <span className="status-dot" /> {t.header.eyebrow}
        </div>
        <h1>
          Human Atlas
          <Badge variant="outline" className="edition">
            3D
          </Badge>
        </h1>
        <div className="identity-meta">
          {n(atlas?.parts.length ?? MODELS[sex].pieces)} {t.header.pieces} <span>·</span>{' '}
          {MODELS[sex].source}
        </div>
        <div className="anatomy-choice" role="group" aria-label={t.header.model}>
          {(['male', 'female'] as Sex[]).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={sex === option}
              onClick={() => {
                if (option === sex) return;
                // Clear the previous atlas in the same render so header, caption and scene
                // never pair one model's name with the other's geometry.
                setAtlas(null);
                setProgress(0);
                setPanel(null);
                study.stop();
                setSex(option);
              }}
            >
              {t.header.models[option]}
            </button>
          ))}
        </div>
      </header>
      <nav className="top-actions" aria-label={t.header.panels}>
        <Button
          variant="ghost"
          className={panel === 'search' ? 'active' : ''}
          onClick={() => openPanel('search')}
          aria-label={t.header.search}
        >
          <Search size={18} />
          <span>{t.header.find}</span>
          <kbd>/</kbd>
        </Button>
        <Button
          variant="ghost"
          className={`icon-button ${quizzing ? 'active' : ''}`}
          aria-label={t.quiz.open}
          aria-pressed={quizzing}
          title={t.quiz.open}
          onClick={startQuiz}
        >
          <GraduationCap size={18} />
        </Button>
        <Button
          variant="ghost"
          className="icon-button share-button"
          aria-label={shared ? t.share[shared] : t.share.button}
          title={shared ? t.share[shared] : t.share.button}
          onClick={copyLink}
        >
          {shared === 'copied' ? <Check size={18} /> : <Link2 size={18} />}
        </Button>
        <Button
          variant="ghost"
          className="icon-button lang-toggle"
          aria-label={t.switchTo}
          title={t.switchTo}
          onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
        >
          {lang === 'es' ? 'EN' : 'ES'}
        </Button>
        <Button
          variant="ghost"
          className="icon-button"
          aria-label={t.header.about}
          onClick={openAbout}
        >
          <Info size={18} />
        </Button>
        <span className="sr-only" role="status">
          {shared && t.share[shared]}
        </span>
      </nav>
      <LayersPanel
        state={state}
        setState={setLayers}
        systems={activeSystems}
        counts={counts}
        visibleCount={visibleCount}
        partial={MODELS[sex].partial}
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
      {study.quiz && (
        <QuizPanel
          quiz={study.quiz}
          poolSize={study.poolSize}
          parts={parts}
          state={state}
          onToggleIsolated={study.toggleIsolated}
          onRestart={study.restart}
          onChoose={study.chooseAnswer}
          onReveal={study.reveal}
          onNext={study.next}
          onClose={study.stop}
        />
      )}
      <ViewControls state={state} setState={setState} onReset={reset} />
      <SceneCaption
        state={state}
        sex={sex}
        chosenName={chosen && !quizzing ? name(chosen.name) : undefined}
      />
      <BottomDock
        state={state}
        setState={setState}
        onReset={reset}
        onOpenLayers={() => openPanel('layers')}
      />
      <footer className="studio-footer">
        <span>
          {state.explode > 0.8 ? t.footer.pan : t.footer.orbit} <b>·</b> {t.footer.zoom} <b>·</b>{' '}
          {t.footer.inspect}
        </span>
        <Button variant="ghost" onClick={openAbout}>
          {t.footer.credits} <ArrowUpRight size={12} />
        </Button>
      </footer>
      <LoadStatus
        progress={progress}
        error={error}
        partCount={atlas?.parts.length ?? MODELS[sex].pieces}
      />
      <DetailSheet
        open={details && !quizzing && selectedParts.length > 0}
        onOpenChange={setDetails}
        state={state}
        setState={setState}
        chosen={chosen}
        sex={sex}
        selectedParts={selectedParts}
        onChoosePart={choosePart}
      />
      <AboutSheet open={about} onOpenChange={setAbout} />
    </main>
  );
}
