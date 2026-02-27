import { useState, useCallback, useRef } from 'react';
import type { Question, AnswerRecord, Tag, QuizMode, AppState } from '../types';
import { LAYER_BY_DEPTH, LAYER_BY_TAG } from '../constants/layers';

type DailyPlan = 'normal' | 'weak' | 'overdue' | 'surprise';

const DAILY_QUESTION_COUNT = 7;
const DAILY_PLAN_COUNTS: Record<DailyPlan, number> = {
  normal: 3,
  weak: 2,
  overdue: 1,
  surprise: 1,
};

/** Shuffle array (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build daily question set based on allocation rules */
function buildDailySet(
  questions: Question[],
  state: AppState,
): Question[] {
  const picked: Question[] = [];
  const usedIds = new Set<string>();
  const pickedTagCount = {} as Record<Tag, number>;
  const writingBoost = needsWritingBoost(state);

  const weakPool = questions.filter(q => isWeakQuestion(q, state));
  const overduePool = questions.filter(q => isOverdueQuestion(q, state));
  const unseenPool = questions.filter(q => !state.history[q.id]);

  const pickPlans = buildDailyPlans(DAILY_QUESTION_COUNT);

  for (const plan of pickPlans) {
    const primaryPoolBase =
      plan === 'weak' ? weakPool :
      plan === 'overdue' ? overduePool :
      plan === 'surprise' ? questions :
      questions;
    const fallbackPoolBase =
      plan === 'normal' ? unseenPool.length > 0 ? unseenPool : questions :
      questions;
    const primaryPool = filterAvailableQuestions(primaryPoolBase, usedIds);
    const fallbackPool = filterAvailableQuestions(fallbackPoolBase, usedIds);

    const pickedOne = pickWeightedQuestion(
      primaryPool,
      state,
      usedIds,
      pickedTagCount,
      writingBoost,
      plan,
    ) ?? pickWeightedQuestion(
      fallbackPool,
      state,
      usedIds,
      pickedTagCount,
      writingBoost,
      'normal',
    ) ?? pickWeightedQuestion(
      questions,
      state,
      usedIds,
      pickedTagCount,
      writingBoost,
      'normal',
    );

    if (!pickedOne) continue;
    picked.push(pickedOne);
    usedIds.add(pickedOne.id);
    pickedTagCount[pickedOne.tag] = (pickedTagCount[pickedOne.tag] ?? 0) + 1;
  }

  // Fill remaining if needed
  while (picked.length < DAILY_QUESTION_COUNT) {
    const q = pickWeightedQuestion(
      questions,
      state,
      usedIds,
      pickedTagCount,
      writingBoost,
      'normal',
    );
    if (!q) break;
    picked.push(q);
    usedIds.add(q.id);
    pickedTagCount[q.tag] = (pickedTagCount[q.tag] ?? 0) + 1;
  }

  return shuffle(picked).slice(0, DAILY_QUESTION_COUNT);
}

/** Build repair set (up to 10 weak questions with miss history) */
function buildRepairSet(questions: Question[], state: AppState): Question[] {
  const weak = questions
    .filter(q => (state.history[q.id]?.miss ?? 0) > 0)
    .map(q => {
      const h = state.history[q.id];
      const total = h.correct + h.miss;
      const missRate = h.miss / Math.max(1, total);
      return { q, missRate };
    })
    .sort((a, b) => b.missRate - a.missRate)
    .slice(0, 10)
    .map(row => row.q);

  if (weak.length === 0) return [];
  return shuffle(weak);
}

function needsWritingBoost(state: AppState): boolean {
  const writing = state.tagStats.writing;
  if (!writing) return true;
  const attempts = writing.correct + writing.miss;
  if (attempts < 12) return true;
  const rate = writing.correct / attempts;
  const missRate = writing.miss / attempts;
  return missRate >= 0.35 || rate < 0.75;
}

function buildDailyPlans(totalQuestions: number): DailyPlan[] {
  const basePlans: DailyPlan[] = [];
  (Object.entries(DAILY_PLAN_COUNTS) as [DailyPlan, number][]).forEach(([plan, count]) => {
    for (let i = 0; i < count; i++) basePlans.push(plan);
  });

  if (basePlans.length === totalQuestions) return shuffle(basePlans);
  if (basePlans.length > totalQuestions) return shuffle(basePlans).slice(0, totalQuestions);

  const filled = [...basePlans];
  while (filled.length < totalQuestions) filled.push('normal');
  return shuffle(filled);
}

function pickWeightedQuestion(
  pool: Question[],
  state: AppState,
  usedIds: Set<string>,
  pickedTagCount: Record<Tag, number>,
  writingBoost: boolean,
  mode: 'normal' | 'weak' | 'overdue' | 'surprise',
): Question | null {
  const MAX_PER_TAG = 3;
  const candidates = pool.filter(q => !usedIds.has(q.id) && (pickedTagCount[q.tag] ?? 0) < MAX_PER_TAG);
  if (candidates.length === 0) return null;

  const weighted = candidates.map(q => {
    const base = getQuestionPriority(q, state, writingBoost);
    const weight =
      mode === 'weak' ? Math.pow(base, 1.1) :
      mode === 'overdue' ? Math.pow(base, 1.2) :
      mode === 'surprise' ? Math.pow(base, 0.55) :
      Math.pow(base, 0.75);
    return { q, weight: Math.max(0.05, weight) };
  });

  const sum = weighted.reduce((s, w) => s + w.weight, 0);
  if (sum <= 0) return shuffle(candidates)[0] ?? null;

  let r = Math.random() * sum;
  for (const row of weighted) {
    r -= row.weight;
    if (r <= 0) return row.q;
  }
  return weighted[weighted.length - 1]?.q ?? null;
}

function filterAvailableQuestions(pool: Question[], usedIds: Set<string>): Question[] {
  return pool.filter(q => !usedIds.has(q.id));
}

function getQuestionPriority(q: Question, state: AppState, writingBoost: boolean): number {
  const h = state.history[q.id];
  const total = (h?.correct ?? 0) + (h?.miss ?? 0);
  const missRate = (h?.miss ?? 0) / (total + 2);
  const days = daysSince(h?.lastAnswered);
  const interval = targetInterval(h?.consecutiveCorrect ?? 0);
  const overdueBoost = Math.max(0, Math.min(1.5, (days - interval) / Math.max(1, interval)));
  const recentMistakeBoost = h?.lastResult === 'miss' && days <= 2 ? 1 : 0;
  const streakPenalty = Math.min((h?.consecutiveCorrect ?? 0) / 5, 1);
  const sameDayPenalty = h?.lastAnswered === todayString() ? 1 : 0;
  const writingBias = writingBoost && q.tag === 'writing' ? 0.45 : 0;
  const newQuestionBoost = h ? 0 : 0.35;
  const tagStats = state.tagStats[q.tag];
  const tagTotal = (tagStats?.correct ?? 0) + (tagStats?.miss ?? 0);
  const tagMissRate = tagTotal > 0 ? (tagStats?.miss ?? 0) / tagTotal : 0;
  const layerGap = tagTotal > 0
    ? Math.max(0, (LAYER_BY_TAG[q.tag].targetRate - (tagStats?.correct ?? 0) / tagTotal) / LAYER_BY_TAG[q.tag].targetRate)
    : 0;

  return Math.max(
    0.1,
    1.0 +
      1.8 * missRate +
      1.2 * recentMistakeBoost +
      0.8 * overdueBoost +
      0.5 * tagMissRate +
      0.4 * layerGap +
      writingBias +
      newQuestionBoost -
      0.7 * streakPenalty -
      0.5 * sameDayPenalty,
  );
}

function isWeakQuestion(q: Question, state: AppState): boolean {
  const h = state.history[q.id];
  if (!h) return false;
  const total = h.correct + h.miss;
  const missRate = h.miss / Math.max(1, total);
  return h.lastResult === 'miss' || missRate >= 0.34 || (h.miss >= 2 && h.consecutiveCorrect < 2);
}

function isOverdueQuestion(q: Question, state: AppState): boolean {
  const h = state.history[q.id];
  if (!h?.lastAnswered) return false;
  const days = daysSince(h.lastAnswered);
  return days > targetInterval(h.consecutiveCorrect);
}

function targetInterval(consecutiveCorrect: number): number {
  if (consecutiveCorrect <= 0) return 1;
  if (consecutiveCorrect === 1) return 2;
  if (consecutiveCorrect === 2) return 4;
  return Math.min(14, 7 + (consecutiveCorrect - 3) * 2);
}

function daysSince(dateString?: string): number {
  if (!dateString) return 9999;
  const date = new Date(`${dateString}T00:00:00`);
  const today = localStartOfDay();
  const diff = today.getTime() - date.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function todayString(): string {
  return localDateString();
}

function localStartOfDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Build trial set (3 easy questions) */
function buildTrialSet(questions: Question[]): Question[] {
  const easy: Tag[] = ['radical', 'stroke_count', 'reading'];
  const pool = questions.filter(q => easy.includes(q.tag));
  return shuffle(pool).slice(0, 3);
}

/** Build layer-specific set */
function buildLayerSet(questions: Question[], depth: number): Question[] {
  const layer = LAYER_BY_DEPTH[depth];
  if (!layer) return shuffle(questions).slice(0, 10);

  const picked: Question[] = [];
  const usedIds = new Set<string>();
  const byTag = new Map<Tag, Question[]>();

  for (const q of questions) {
    if (!layer.tags.includes(q.tag)) continue;
    const arr = byTag.get(q.tag) ?? [];
    arr.push(q);
    byTag.set(q.tag, arr);
  }

  // Ensure at least one question from each tag in the selected geological layer.
  for (const tag of layer.tags) {
    const one = shuffle(byTag.get(tag) ?? [])[0];
    if (!one) continue;
    picked.push(one);
    usedIds.add(one.id);
  }

  const pool = questions.filter(q => layer.tags.includes(q.tag) && !usedIds.has(q.id));
  const rest = shuffle(pool).slice(0, Math.max(0, 10 - picked.length));
  return shuffle([...picked, ...rest]).slice(0, 10);
}

export function useQuiz(allQuestions: Question[], appState: AppState) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [isActive, setIsActive] = useState(false);
  const startTime = useRef(Date.now());

  const startQuiz = useCallback((mode: QuizMode, layerDepth?: number) => {
    let qs: Question[];
    switch (mode) {
      case 'daily':
        qs = buildDailySet(allQuestions, appState);
        break;
      case 'repair':
        qs = buildRepairSet(allQuestions, appState);
        break;
      case 'trial':
        qs = buildTrialSet(allQuestions);
        break;
      case 'layer':
        qs = buildLayerSet(allQuestions, layerDepth ?? 1);
        break;
      case 'exam_short':
        qs = buildExamShort(allQuestions);
        break;
      case 'exam_full':
        qs = buildExamFull(allQuestions);
        break;
      default:
        qs = shuffle(allQuestions).slice(0, 7);
    }
    setQuizQuestions(qs);
    setCurrentIndex(0);
    setAnswers([]);
    setIsActive(true);
    startTime.current = Date.now();
  }, [allQuestions, appState]);

  const submitAnswer = useCallback((record: AnswerRecord) => {
    setAnswers(prev => [...prev, record]);
    if (currentIndex + 1 < quizQuestions.length) {
      setCurrentIndex(prev => prev + 1);
      startTime.current = Date.now();
    } else {
      setIsActive(false);
    }
  }, [currentIndex, quizQuestions.length]);

  const currentQuestion = quizQuestions[currentIndex] ?? null;
  const progress = { current: currentIndex + 1, total: quizQuestions.length };
  const elapsed = () => Math.round((Date.now() - startTime.current) / 1000);

  return {
    startQuiz,
    submitAnswer,
    currentQuestion,
    progress,
    answers,
    isActive,
    elapsed,
  };
}

function buildExamShort(questions: Question[]): Question[] {
  const byTag = new Map<Tag, Question[]>();
  for (const q of questions) {
    const arr = byTag.get(q.tag) ?? [];
    arr.push(q);
    byTag.set(q.tag, arr);
  }

  const picked: Question[] = [];
  const usedIds = new Set<string>();

  function pickFrom(pool: Question[], count: number) {
    const shuffled = shuffle(pool.filter(q => !usedIds.has(q.id)));
    for (let i = 0; i < count && i < shuffled.length; i++) {
      picked.push(shuffled[i]);
      usedIds.add(shuffled[i].id);
    }
  }

  // Writing × 4
  pickFrom(byTag.get('writing') ?? [], 4);

  // 20pt fields × 2 each
  for (const tag of ['reading', 'compound_structure', 'three_char_compound', 'antonym_synonym', 'on_kun'] as Tag[]) {
    pickFrom(byTag.get(tag) ?? [], 2);
  }

  // Others × 1 each
  for (const tag of ['homophone', 'jukugo_making', 'okurigana', 'stroke_count', 'radical'] as Tag[]) {
    pickFrom(byTag.get(tag) ?? [], 1);
  }

  return shuffle(picked).slice(0, 20);
}

function buildExamFull(questions: Question[]): Question[] {
  const byTag = new Map<Tag, Question[]>();
  for (const q of questions) {
    const arr = byTag.get(q.tag) ?? [];
    arr.push(q);
    byTag.set(q.tag, arr);
  }

  const picked: Question[] = [];
  const usedIds = new Set<string>();

  function pickFrom(pool: Question[], count: number) {
    const shuffled = shuffle(pool.filter(q => !usedIds.has(q.id)));
    for (let i = 0; i < count && i < shuffled.length; i++) {
      picked.push(shuffled[i]);
      usedIds.add(shuffled[i].id);
    }
  }

  const fullExamBlueprint: Array<{ tag: Tag; count: number }> = [
    { tag: 'writing', count: 10 },
    { tag: 'reading', count: 10 },
    { tag: 'on_kun', count: 5 },
    { tag: 'homophone', count: 5 },
    { tag: 'antonym_synonym', count: 5 },
    { tag: 'compound_structure', count: 5 },
    { tag: 'three_char_compound', count: 5 },
    { tag: 'jukugo_making', count: 3 },
    { tag: 'radical', count: 1 },
    { tag: 'stroke_count', count: 1 },
  ];

  for (const { tag, count } of fullExamBlueprint) {
    pickFrom(byTag.get(tag) ?? [], count);
  }

  return shuffle(picked).slice(0, 50);
}
