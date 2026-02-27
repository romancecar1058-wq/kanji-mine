import { useState, useCallback } from 'react';
import type { AppState, Tag, TagStats, QuestionHistory, AnswerRecord, MineralType, Title } from '../types';
import { MINERALS } from '../constants/minerals';

const STORAGE_KEY = 'kanken6';
const CURRENT_VERSION = 3;

const ALL_TAGS: Tag[] = [
  'radical', 'stroke_count', 'okurigana', 'jukugo_making', 'homophone',
  'reading', 'on_kun', 'antonym_synonym', 'compound_structure',
  'three_char_compound', 'writing',
];

function createMineralState(): Record<MineralType, number> {
  const minerals = {} as Record<MineralType, number>;
  for (const m of MINERALS) minerals[m.type] = 0;
  return minerals;
}

function createInitialState(): AppState {
  const tagStats: Record<string, TagStats> = {};
  for (const t of ALL_TAGS) {
    tagStats[t] = { correct: 0, miss: 0 };
  }
  return {
    version: CURRENT_VERSION,
    profile: {
      name: '',
      createdAt: localDateString(),
      streak: 0,
      lastStudyDate: '',
      title: 'trainee' as Title,
    },
    history: {},
    tagStats: tagStats as Record<Tag, TagStats>,
    examResults: [],
    minerals: createMineralState(),
    badges: [],
  };
}

export function normalizeState(parsed: Partial<AppState>): AppState {
  const initial = createInitialState();
  return {
    ...initial,
    ...parsed,
    version: CURRENT_VERSION,
    profile: {
      ...initial.profile,
      ...(parsed.profile ?? {}),
    },
    history: parsed.history ?? {},
    tagStats: {
      ...initial.tagStats,
      ...(parsed.tagStats ?? {}),
    } as Record<Tag, TagStats>,
    examResults: Array.isArray(parsed.examResults) ? parsed.examResults : [],
    minerals: {
      ...initial.minerals,
      ...(parsed.minerals ?? {}),
    } as Record<MineralType, number>,
    badges: Array.isArray(parsed.badges) ? parsed.badges : [],
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (typeof parsed.version === 'number' && parsed.version > CURRENT_VERSION) {
      return createInitialState();
    }
    return normalizeState(parsed);
  } catch {
    return createInitialState();
  }
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useAppState() {
  const [state, setState] = useState<AppState>(loadState);

  const persist = useCallback((updater: (prev: AppState) => AppState) => {
    setState(prev => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  const recordAnswer = useCallback((record: AnswerRecord) => {
    persist(prev => {
      const next = structuredClone(prev);
      const today = localDateString();

      // Update question history
      const qh: QuestionHistory = next.history[record.questionId] ?? {
        correct: 0, miss: 0, lastAnswered: '', lastResult: 'miss',
        consecutiveCorrect: 0, bookmarked: false,
      };

      if (record.correct) {
        qh.correct++;
        qh.consecutiveCorrect++;
        qh.lastResult = 'correct';
      } else {
        qh.miss++;
        qh.consecutiveCorrect = 0;
        qh.lastResult = 'miss';
        if (record.errorType) qh.lastErrorType = record.errorType;
      }
      qh.lastAnswered = today;
      next.history[record.questionId] = qh;

      // Update tag stats
      const ts = next.tagStats[record.tag] ?? { correct: 0, miss: 0 };
      if (record.correct) ts.correct++;
      else ts.miss++;
      next.tagStats[record.tag] = ts;

      // Mineral rewards
      if (record.correct) {
        if (qh.correct === 1) {
          // First correct → quartz
          next.minerals.quartz++;
        }
        if (qh.consecutiveCorrect === 3) {
          // 3 consecutive → pyrite
          next.minerals.pyrite++;
        }
        // Fossil: was missed before, now 3 consecutive
        if (qh.miss > 0 && qh.consecutiveCorrect === 3) {
          next.minerals.fossil++;
        }
      }

      applyMilestoneMineralRewards(next, record);
      next.badges = checkAndAwardBadges(next);

      // Streak
      if (next.profile.lastStudyDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = localDateString(yesterday);

        if (next.profile.lastStudyDate === yesterdayStr) {
          next.profile.streak++;
        } else if (next.profile.lastStudyDate !== today) {
          next.profile.streak = 1;
        }
        next.profile.lastStudyDate = today;
      }

      // Title update
      next.profile.title = computeTitle(next);

      return next;
    });
  }, [persist]);

  const toggleBookmark = useCallback((questionId: string) => {
    persist(prev => {
      const next = structuredClone(prev);
      const qh = next.history[questionId];
      if (qh) qh.bookmarked = !qh.bookmarked;
      return next;
    });
  }, [persist]);

  const getTagRate = useCallback((tag: Tag): number => {
    const ts = state.tagStats[tag];
    if (!ts) return 0;
    const total = ts.correct + ts.miss;
    if (total === 0) return 0;
    return ts.correct / total;
  }, [state]);

  const resetData = useCallback(() => {
    const fresh = createInitialState();
    saveState(fresh);
    setState(fresh);
  }, []);

  return { state, recordAnswer, toggleBookmark, getTagRate, resetData, persist };
}

function computeTitle(state: AppState): Title {
  const bestExam = state.examResults.reduce((max, e) => Math.max(max, e.score), 0);
  if (bestExam >= 170) return 'professor';
  if (bestExam >= 140) return 'doctor';
  if (bestExam >= 120) return 'researcher';

  const tags = Object.values(state.tagStats);
  const allAbove50 = tags.every(t => {
    const total = t.correct + t.miss;
    return total === 0 || t.correct / total >= 0.5;
  });
  if (allAbove50 && tags.some(t => t.correct + t.miss > 0)) return 'assistant';

  const totalCorrect = tags.reduce((sum, t) => sum + t.correct, 0);
  if (totalCorrect >= 100) return 'surveyor';

  return 'trainee';
}

export function getAccumulatedMinerals(state: AppState): Record<MineralType, number> {
  return { ...state.minerals };
}

function applyMilestoneMineralRewards(state: AppState, record: AnswerRecord) {
  if (!record.correct) return;

  for (const mineral of MINERALS) {
    if (!mineral.rewardTag || !mineral.rewardEvery) continue;
    if (mineral.rewardTag !== record.tag) continue;
    if (mineral.requirePerfectWriting && record.selfScore !== 'perfect') continue;

    const correct = state.tagStats[mineral.rewardTag]?.correct ?? 0;
    if (correct > 0 && correct % mineral.rewardEvery === 0) {
      state.minerals[mineral.type] = (state.minerals[mineral.type] ?? 0) + 1;
    }
  }
}

function checkAndAwardBadges(state: AppState): string[] {
  const newBadges = [...state.badges];
  const addIfNew = (id: string) => {
    if (!newBadges.includes(id)) newBadges.push(id);
  };

  // 総正解数
  const totalCorrect = Object.values(state.history).reduce((sum, history) => sum + history.correct, 0);
  if (totalCorrect >= 1) addIfNew('first_correct');

  // 連続正解（historyの中で最大consecutiveCorrectを探す）
  const maxStreak = Math.max(0, ...Object.values(state.history).map(history => history.consecutiveCorrect ?? 0));
  if (maxStreak >= 3) addIfNew('streak_3');
  if (maxStreak >= 10) addIfNew('streak_10');

  // 書き取り正解数
  if ((state.tagStats.writing?.correct ?? 0) >= 30) addIfNew('writing_master');

  // 全タグ踏破
  if (ALL_TAGS.every(tag => (state.tagStats[tag]?.correct ?? 0) > 0)) addIfNew('all_tags');

  // 模試合格（examResultsを確認）
  if (state.examResults.some(exam => {
    const examWithOptionalTotal = exam as typeof exam & { total?: number };
    if (typeof examWithOptionalTotal.total === 'number' && examWithOptionalTotal.total > 0) {
      return exam.score / examWithOptionalTotal.total >= 0.7;
    }
    return exam.score >= 70;
  })) {
    addIfNew('exam_pass');
  }

  // 連続日数
  if ((state.profile?.streak ?? 0) >= 7) addIfNew('daily_7');

  return newBadges;
}

function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
