import { Check, Eye, Focus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Concept, Part, SceneState } from '../anatomy';
import { useI18n } from '../i18n';
import type { QuizLevel, QuizMode } from '../study/quiz';
import type { QuizState } from '../study/use-quiz';

const MODES: QuizMode[] = ['name', 'locate'];
const LEVELS: QuizLevel[] = ['basic', 'all'];

interface Props {
  quiz: QuizState;
  poolSize: number;
  parts: Map<string, Part>;
  state: SceneState;
  onToggleIsolated: () => void;
  onRestart: (mode: QuizMode, level: QuizLevel) => void;
  onChoose: (concept: Concept) => void;
  onReveal: () => void;
  onNext: () => void;
  onClose: () => void;
}

export function QuizPanel({
  quiz,
  poolSize,
  parts,
  state,
  onToggleIsolated,
  onRestart,
  onChoose,
  onReveal,
  onNext,
  onClose,
}: Props) {
  const { t, n, name } = useI18n();
  const answer = quiz.question && name(quiz.question.concept.name),
    tapped = quiz.mode === 'locate' && quiz.answer ? parts.get(quiz.answer) : undefined;
  return (
    <section className="search-panel quiz-panel glass" aria-label={t.quiz.region}>
      <div className="panel-heading">
        <span>{t.quiz.heading}</span>
        <span className="quiz-score" aria-label={t.quiz.scoreLabel}>
          {t.quiz.score(n(quiz.right), n(quiz.total))}
          {quiz.streak > 1 && <b>{t.quiz.streak(n(quiz.streak))}</b>}
        </span>
        <Button variant="ghost" className="icon-button" onClick={onClose} aria-label={t.quiz.close}>
          <X size={18} />
        </Button>
      </div>
      <div className="quiz-settings">
        <div className="anatomy-choice" role="group" aria-label={t.quiz.modeLabel}>
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={quiz.mode === mode}
              onClick={() => mode !== quiz.mode && onRestart(mode, quiz.level)}
            >
              {t.quiz.modes[mode]}
            </button>
          ))}
        </div>
        <div className="anatomy-choice" role="group" aria-label={t.quiz.levelLabel}>
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={quiz.level === level}
              onClick={() => level !== quiz.level && onRestart(quiz.mode, level)}
            >
              {t.quiz.levels[level]}
            </button>
          ))}
        </div>
      </div>
      {!quiz.question ? (
        <p className="search-note">{t.quiz.empty}</p>
      ) : (
        <>
          <p className="quiz-question">
            {quiz.mode === 'name' ? (
              t.quiz.nameQuestion
            ) : (
              <>
                {t.quiz.locateQuestion} <strong>{answer}</strong>
              </>
            )}
          </p>
          {quiz.mode === 'name' && (
            <div className="quiz-choices">
              {quiz.choices.map((c) => {
                const right = c.id === quiz.question!.concept.id;
                return (
                  <Button
                    key={c.id}
                    variant="ghost"
                    disabled={!!quiz.answer}
                    className={
                      quiz.answer && right
                        ? 'is-right'
                        : quiz.answer === c.id
                          ? 'is-wrong'
                          : undefined
                    }
                    onClick={() => onChoose(c)}
                  >
                    {name(c.name)}
                    {quiz.answer && right && <Check size={16} />}
                  </Button>
                );
              })}
            </div>
          )}
          <div className="quiz-feedback" role="status">
            {quiz.mode === 'locate' && !quiz.answer && <span>{t.quiz.locateHint}</span>}
            {quiz.correct === true && <strong className="is-right">{t.quiz.correct}</strong>}
            {quiz.correct === false && (
              <>
                {tapped && <span>{t.quiz.tapped(name(tapped.name))} </span>}
                <strong className="is-wrong">{t.quiz.wrong(answer ?? '')}</strong>
              </>
            )}
          </div>
          <div className="quiz-actions">
            {quiz.mode === 'name' || quiz.answer ? (
              <Button
                variant="ghost"
                className={state.isolate ? 'active' : ''}
                aria-pressed={state.isolate}
                onClick={onToggleIsolated}
              >
                <Focus size={16} />
                {state.isolate ? t.quiz.context : t.quiz.isolate}
              </Button>
            ) : (
              <Button variant="ghost" onClick={onReveal}>
                <Eye size={16} />
                {t.quiz.reveal}
              </Button>
            )}
            <Button className="primary-action" onClick={onNext}>
              {quiz.answer ? t.quiz.next : t.quiz.skip}
            </Button>
          </div>
        </>
      )}
      <p className="search-note">{t.quiz.scope(n(poolSize))}</p>
    </section>
  );
}
