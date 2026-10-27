import { useMemo, useState } from 'react';
import type { Atlas, Concept, Part, SetSceneState, SystemId } from '../anatomy';
import {
  answerChoices,
  pickQuestion,
  quizItems,
  type QuizItem,
  type QuizLevel,
  type QuizMode,
} from './quiz';

const RECENT = 12;

export interface QuizState {
  mode: QuizMode;
  level: QuizLevel;
  question: QuizItem | null;
  choices: Concept[];
  /** The chosen concept ("name it") or tapped part ("find it"); null until answered. */
  answer: string | null;
  correct: boolean | null;
  /** "Name it" shows the structure on its own (it may be hidden under other layers). */
  isolated: boolean;
  right: number;
  total: number;
  streak: number;
  recent: string[];
}

/**
 * Practice session state. While a quiz runs, the scene selection shows the question ("name it")
 * or the revealed answer, so the hook drives the selection through `setState`.
 */
export function useQuiz(
  atlas: Atlas | null,
  parts: Map<string, Part>,
  visible: SystemId[],
  setState: SetSceneState,
) {
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const items = useMemo(
    () => (atlas && quiz ? quizItems(atlas, parts, quiz.level) : []),
    [atlas, parts, quiz?.level],
  );
  const pool = useMemo(() => items.filter((i) => visible.includes(i.system)), [items, visible]);

  const ask = (base: QuizState, from = pool, all = items) => {
    let question = pickQuestion(from, base.recent),
      choices: Concept[] = [];
    if (question && base.mode === 'name') {
      const options = answerChoices(question, all);
      if (options) choices = options;
      else question = null;
    }
    setState((s) => ({
      ...s,
      selected: question && base.mode === 'name' ? question.concept.elements : [],
      isolate: !!question && base.mode === 'name' && base.isolated,
      explode: question && base.mode === 'name' && base.isolated ? 0 : s.explode,
      rotate: false,
    }));
    setQuiz({
      ...base,
      question,
      choices,
      answer: null,
      correct: null,
      recent: question ? [question.concept.id, ...base.recent].slice(0, RECENT) : base.recent,
    });
  };

  const score = (q: QuizState, answer: string, correct: boolean) => {
    setQuiz({
      ...q,
      answer,
      correct,
      right: q.right + (correct ? 1 : 0),
      total: q.total + 1,
      streak: correct ? q.streak + 1 : 0,
    });
    // Reveal the answer in the scene.
    setState((s) => ({ ...s, selected: q.question!.concept.elements }));
  };

  /** Restart with new settings; the pools are recomputed for the new level. */
  const restart = (mode: QuizMode, level: QuizLevel) => {
    const next = atlas ? quizItems(atlas, parts, level) : [];
    ask(
      {
        mode,
        level,
        question: null,
        choices: [],
        answer: null,
        correct: null,
        isolated: quiz?.isolated ?? true,
        right: 0,
        total: 0,
        streak: 0,
        recent: [],
      },
      next.filter((i) => visible.includes(i.system)),
      next,
    );
  };

  return {
    quiz,
    poolSize: pool.length,
    start: () => restart(quiz?.mode ?? 'name', quiz?.level ?? 'basic'),
    stop: () => {
      setQuiz(null);
      setState((s) => ({ ...s, selected: [], isolate: false }));
    },
    restart,
    next: () => quiz && ask(quiz),
    chooseAnswer: (concept: Concept) => {
      if (!quiz?.question || quiz.answer) return;
      score(quiz, concept.id, concept.id === quiz.question.concept.id);
    },
    /** A tap on the body; returns true when the quiz consumed it. */
    tapPart: (id: string) => {
      if (!quiz) return false;
      if (quiz.mode === 'locate' && quiz.question && !quiz.answer)
        score(quiz, id, quiz.question.concept.elements.includes(id));
      return true;
    },
    /** Isolate or show the structure in context; "name it" remembers the choice. */
    toggleIsolated: () => {
      if (!quiz) return;
      const isolated = !quiz.isolated;
      setQuiz({ ...quiz, isolated });
      setState((s) => ({ ...s, isolate: isolated, explode: isolated ? 0 : s.explode }));
    },
    reveal: () => {
      if (quiz?.question && !quiz.answer) score(quiz, '', false);
    },
  };
}
