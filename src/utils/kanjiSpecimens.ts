import type { Question, QuestionHistory } from '../types';

export interface KanjiSpecimen {
  kanji: string;
  questionIds: string[];
  status: 'gold' | 'silver' | 'gray';
  correct: number;
  miss: number;
  example: string;
}

export function buildKanjiSpecimens(allQuestions: Question[], history: Record<string, QuestionHistory>): KanjiSpecimen[] {
  const writingQs = allQuestions.filter(q => q.tag === 'writing');
  const kanjiMap = new Map<string, { questionIds: string[]; example: string }>();

  for (const q of writingQs) {
    const kanji = q.answer;
    const existing = kanjiMap.get(kanji);
    if (existing) {
      existing.questionIds.push(q.id);
    } else {
      kanjiMap.set(kanji, { questionIds: [q.id], example: q.context || q.question });
    }
  }

  const specimens: KanjiSpecimen[] = [];
  for (const [kanji, { questionIds, example }] of kanjiMap) {
    let totalCorrect = 0;
    let totalMiss = 0;
    let attempted = false;
    for (const qid of questionIds) {
      const h = history[qid];
      if (h) {
        totalCorrect += h.correct;
        totalMiss += h.miss;
        attempted = true;
      }
    }
    const status: KanjiSpecimen['status'] = totalCorrect > 0 ? 'gold' : attempted ? 'silver' : 'gray';
    specimens.push({ kanji, questionIds, status, correct: totalCorrect, miss: totalMiss, example });
  }

  specimens.sort((a, b) => {
    const order = { gold: 0, silver: 1, gray: 2 };
    return order[a.status] - order[b.status] || a.kanji.localeCompare(b.kanji, 'ja');
  });

  return specimens;
}
