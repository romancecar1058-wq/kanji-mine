import { useMemo, useState } from 'react';
import type { AppState, Question, Screen, QuestionHistory, Tag } from '../types';
import { ERROR_TYPE_LABELS } from '../constants/messages';
import { LAYERS, LAYER_BY_TAG, LAYER_SCENES } from '../constants/layers';
import { MINERALS } from '../constants/minerals';

type ReportFilter = 'all' | 'miss' | 'bookmarked';
type ReportSort = 'newest' | 'miss' | 'layer';

interface FieldReportProps {
  state: AppState;
  allQuestions: Question[];
  navigate: (screen: Screen) => void;
  onToggleBookmark: (questionId: string) => void;
}

interface ReportEntry {
  question: Question;
  history: QuestionHistory;
}

interface LayerInsight {
  layer: (typeof LAYERS)[number];
  attempts: number;
  correct: number;
  miss: number;
  missQuestions: number;
  rate: number;
  gap: number;
  priority: number;
}

interface MineralTargetInsight {
  mineral: (typeof MINERALS)[number];
  layer: (typeof LAYERS)[number];
  correct: number;
  remaining: number;
  progressPct: number;
  weakLinked: boolean;
  score: number;
}

interface FossilRecoveryInsight {
  entry: ReportEntry;
  layer: (typeof LAYERS)[number];
  remaining: number;
}

interface WritingRewardInsight {
  mineral: (typeof MINERALS)[number];
  remaining: number;
  progressPct: number;
}

export default function FieldReport({ state, allQuestions, navigate, onToggleBookmark }: FieldReportProps) {
  const [filter, setFilter] = useState<ReportFilter>('all');
  const [sortBy, setSortBy] = useState<ReportSort>('newest');

  const questionById = useMemo(() => {
    return new Map(allQuestions.map(q => [q.id, q] as const));
  }, [allQuestions]);

  const entries = useMemo<ReportEntry[]>(() => {
    return Object.entries(state.history)
      .map(([id, history]) => {
        const question = questionById.get(id);
        if (!question) return null;
        return { question, history };
      })
      .filter((x): x is ReportEntry => x !== null);
  }, [state.history, questionById]);

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        acc.correct += entry.history.correct;
        acc.miss += entry.history.miss;
        return acc;
      },
      { correct: 0, miss: 0 },
    );
  }, [entries]);

  const overallRate = totals.correct + totals.miss > 0
    ? Math.round((totals.correct / (totals.correct + totals.miss)) * 100)
    : 0;

  const layerInsights = useMemo<LayerInsight[]>(() => {
    const missQuestionCountByTag = entries.reduce((acc, entry) => {
      if (entry.history.miss > 0) {
        acc[entry.question.tag] = (acc[entry.question.tag] ?? 0) + 1;
      }
      return acc;
    }, {} as Partial<Record<Tag, number>>);

    return LAYERS
      .map(layer => {
        const correct = layer.tags.reduce((sum, tag) => sum + (state.tagStats[tag]?.correct ?? 0), 0);
        const miss = layer.tags.reduce((sum, tag) => sum + (state.tagStats[tag]?.miss ?? 0), 0);
        const attempts = correct + miss;
        const rate = attempts > 0 ? correct / attempts : 0;
        const missRate = attempts > 0 ? miss / attempts : 0;
        const gap = Math.max(0, layer.targetRate - rate);
        const missQuestions = layer.tags.reduce((sum, tag) => sum + (missQuestionCountByTag[tag] ?? 0), 0);

        // Priority: score gap + miss density + high-point layer bonus
        const priority = (gap * 120 + missRate * 80) * layer.points
          + missQuestions * 8
          + (layer.points >= 20 ? 12 : 0);

        return {
          layer,
          attempts,
          correct,
          miss,
          missQuestions,
          rate,
          gap,
          priority,
        };
      })
      .filter(insight => insight.attempts > 0 || insight.missQuestions > 0)
      .sort((a, b) => b.priority - a.priority);
  }, [state.tagStats, entries]);

  const weakestLayer = useMemo(() => {
    return layerInsights
      .filter(insight => insight.attempts > 0)
      .sort((a, b) => a.rate - b.rate)[0] ?? null;
  }, [layerInsights]);

  const topWeakLayers = layerInsights.slice(0, 3);

  const mineralTargets = useMemo<MineralTargetInsight[]>(() => {
    return MINERALS
      .filter(mineral => mineral.rewardTag && mineral.rewardEvery)
      .map(mineral => {
        const tag = mineral.rewardTag!;
        const every = mineral.rewardEvery!;
        const correct = state.tagStats[tag]?.correct ?? 0;
        const mod = correct % every;
        const remaining = mod === 0 ? every : every - mod;
        const progressPct = Math.round(((every - remaining) / every) * 100);
        const weakLinked = topWeakLayers.some(weak => weak.layer.tags.includes(tag));
        const layer = LAYER_BY_TAG[tag];

        // Higher rank and near-complete conditions should be prioritized.
        const score = mineral.rank * 100 + progressPct * 2 + (weakLinked ? 20 : 0) - remaining * 5;

        return { mineral, layer, correct, remaining, progressPct, weakLinked, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [state.tagStats, topWeakLayers]);

  const writingStats = state.tagStats.writing ?? { correct: 0, miss: 0 };
  const writingAttempts = writingStats.correct + writingStats.miss;
  const writingRate = writingAttempts > 0
    ? Math.round((writingStats.correct / writingAttempts) * 100)
    : 0;
  const writingLayer = LAYER_BY_TAG.writing;

  const writingRewards = useMemo<WritingRewardInsight[]>(() => {
    return MINERALS
      .filter(mineral => mineral.rewardTag === 'writing' && mineral.rewardEvery)
      .map(mineral => {
        const every = mineral.rewardEvery!;
        const mod = writingStats.correct % every;
        const remaining = mod === 0 ? every : every - mod;
        const progressPct = Math.round(((every - remaining) / every) * 100);
        return { mineral, remaining, progressPct };
      })
      .sort((a, b) => a.remaining - b.remaining || b.mineral.rank - a.mineral.rank)
      .slice(0, 3);
  }, [writingStats.correct]);

  const fossilRecoveries = useMemo<FossilRecoveryInsight[]>(() => {
    return entries
      .filter(entry => entry.history.miss > 0 && entry.history.consecutiveCorrect < 3)
      .map(entry => {
        const layer = LAYER_BY_TAG[entry.question.tag];
        const remaining = Math.max(1, 3 - entry.history.consecutiveCorrect);
        return { entry, layer, remaining };
      })
      .sort((a, b) => a.remaining - b.remaining || b.entry.history.miss - a.entry.history.miss)
      .slice(0, 3);
  }, [entries]);

  const visibleEntries = useMemo(() => {
    const filtered = entries.filter(entry => {
      if (filter === 'miss') return entry.history.miss > 0;
      if (filter === 'bookmarked') return entry.history.bookmarked;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return b.history.lastAnswered.localeCompare(a.history.lastAnswered);
      }
      if (sortBy === 'miss') {
        if (b.history.miss !== a.history.miss) return b.history.miss - a.history.miss;
        return b.history.lastAnswered.localeCompare(a.history.lastAnswered);
      }
      const layerA = LAYER_BY_TAG[a.question.tag].depth;
      const layerB = LAYER_BY_TAG[b.question.tag].depth;
      if (layerA !== layerB) return layerA - layerB;
      return b.history.lastAnswered.localeCompare(a.history.lastAnswered);
    });
  }, [entries, filter, sortBy]);

  return (
    <div className="fade-in">
      <button className="btn-ghost" onClick={() => navigate({ kind: 'home' })} style={{ marginBottom: 14 }}>
        ← ホーム
      </button>

      <h2 style={{ textAlign: 'center', marginBottom: 4, fontSize: '1.55rem' }}>📋 調査レポート</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-dim)', marginBottom: 14, fontSize: '0.92rem' }}>
        ミスと正解の履歴を見直して、弱点を補修しよう
      </p>

      <div className="field-summary-grid">
        <div className="field-summary-card">
          <p className="field-summary-title">調査済み問題</p>
          <p className="field-summary-value">{entries.length}問</p>
        </div>
        <div className="field-summary-card">
          <p className="field-summary-title">全体正答率</p>
          <p className="field-summary-value">{overallRate}%</p>
        </div>
        <div className="field-summary-card">
          <p className="field-summary-title">最弱の層</p>
          <p className="field-summary-value" style={{ fontSize: '1rem' }}>
            {weakestLayer ? `${weakestLayer.layer.emoji} ${weakestLayer.layer.name}` : '—'}
          </p>
        </div>
      </div>

      <section className="field-analysis-panel">
        <p className="field-analysis-title">🧭 研究アナリスト</p>
        <p className="field-analysis-lead">
          ログを解析して、優先補修層と次に狙う標本を提案します。
        </p>

        <div className="field-analysis-grid">
          <div className="field-analysis-block">
            <p className="field-summary-title">✍️ 書き取り調査ログ</p>
            <div className="field-analysis-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ fontWeight: 700 }}>
                  {writingLayer.emoji} 第{writingLayer.depth}層 {writingLayer.name}
                </p>
                <span className="field-tag-pill">{writingRate}%</span>
              </div>
              <p className="field-analysis-note">
                正解 {writingStats.correct} / ミス {writingStats.miss} / 配点40点の最重要ゾーン
              </p>
              <button className="field-action-btn" onClick={() => navigate({ kind: 'layerQuiz', depth: writingLayer.depth })}>
                書き取りを連続練習する
              </button>
            </div>

            {writingRewards.map(target => (
              <div key={target.mineral.type} className="field-analysis-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <p style={{ fontWeight: 700 }}>
                    💎 {target.mineral.name}
                    <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}> ★{target.mineral.rank}</span>
                  </p>
                  <span className="field-tag-pill">あと {target.remaining}</span>
                </div>
                <p className="field-analysis-note">
                  書き取りログの蓄積でアンロック
                  {target.mineral.requirePerfectWriting ? ' / ◎できた限定' : ''}
                </p>
                <div className="field-meter">
                  <div className="field-meter-fill" style={{ width: `${target.progressPct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="field-analysis-block">
            <p className="field-summary-title">優先補修レイヤー</p>
            {topWeakLayers.length === 0 ? (
              <p className="field-analysis-note">まだ解析に十分なデータがありません。</p>
            ) : (
              topWeakLayers.map((insight, index) => (
                <div key={insight.layer.depth} className="field-analysis-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ fontWeight: 700 }}>
                      #{index + 1} {insight.layer.emoji} 第{insight.layer.depth}層 {insight.layer.name}
                    </p>
                    <span className="field-tag-pill">{toPct(insight.rate)}%</span>
                  </div>
                  <p className="field-analysis-note">
                    ミス {insight.miss} / 目標まで {toPct(insight.gap)}pt（配点 {insight.layer.points}）
                  </p>
                  <button className="field-action-btn" onClick={() => navigate({ kind: 'layerQuiz', depth: insight.layer.depth })}>
                    この層を補修する
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="field-analysis-block">
            <p className="field-summary-title">狙うべき標本（次の獲得候補）</p>
            {mineralTargets.length === 0 ? (
              <p className="field-analysis-note">現在の報酬設定では候補がありません。</p>
            ) : (
              mineralTargets.map(target => (
                <div key={target.mineral.type} className="field-analysis-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ fontWeight: 700 }}>
                      💎 {target.mineral.name} <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>★{target.mineral.rank}</span>
                    </p>
                    <span className="field-tag-pill">あと {target.remaining}</span>
                  </div>
                  <p className="field-analysis-note">
                    {target.layer.emoji} 第{target.layer.depth}層 {target.layer.name}
                    {target.mineral.requirePerfectWriting ? ' / ◎できた限定' : ''}
                    {target.weakLinked ? ' / 弱点補修と同時進行◎' : ''}
                  </p>
                  <div className="field-meter">
                    <div className="field-meter-fill" style={{ width: `${target.progressPct}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="field-analysis-block">
            <p className="field-summary-title">復活標本（化石）チャンス</p>
            {fossilRecoveries.length === 0 ? (
              <p className="field-analysis-note">復活待ちの断層標本はありません。</p>
            ) : (
              fossilRecoveries.map(({ entry, layer, remaining }) => (
                <div key={entry.question.id} className="field-analysis-item">
                  <p style={{ fontWeight: 700 }}>
                    🦴 {layer.emoji} 第{layer.depth}層 {layer.name}
                  </p>
                  <p className="field-analysis-note">
                    「{entry.question.target}」あと {remaining} 連続正解で化石標本化
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="field-report-toolbar">
        <div className="field-tabs">
          <button className={`field-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            📋 全部
          </button>
          <button className={`field-tab ${filter === 'miss' ? 'active' : ''}`} onClick={() => setFilter('miss')}>
            💥 ミスのみ
          </button>
          <button className={`field-tab ${filter === 'bookmarked' ? 'active' : ''}`} onClick={() => setFilter('bookmarked')}>
            ⭐ ブックマーク
          </button>
        </div>

        <div className="field-sort-row">
          <button className={`field-sort-btn ${sortBy === 'newest' ? 'active' : ''}`} onClick={() => setSortBy('newest')}>
            新しい順
          </button>
          <button className={`field-sort-btn ${sortBy === 'miss' ? 'active' : ''}`} onClick={() => setSortBy('miss')}>
            ミス多い順
          </button>
          <button className={`field-sort-btn ${sortBy === 'layer' ? 'active' : ''}`} onClick={() => setSortBy('layer')}>
            地層順
          </button>
        </div>
      </div>

      {visibleEntries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', marginTop: 10 }}>
          <p style={{ marginBottom: 6 }}>表示できる記録がありません</p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>クイズを解くとここに履歴が並びます</p>
        </div>
      ) : (
        visibleEntries.map(({ question, history }) => {
          const layer = LAYER_BY_TAG[question.tag];
          const scene = LAYER_SCENES[question.tag];
          const attempts = history.correct + history.miss;
          const rate = attempts > 0 ? Math.round((history.correct / attempts) * 100) : 0;
          return (
            <article
              key={question.id}
              className="field-report-card"
              style={{
                borderLeftColor: scene.cardAccent,
                background: `linear-gradient(135deg, ${scene.cardAccent}2a 0%, rgba(26, 22, 16, 0.56) 32%, rgba(24, 20, 14, 0.86) 100%)`,
              }}
            >
              <div className="field-report-meta">
                <p style={{ fontWeight: 700 }}>
                  {layer.emoji} 第{layer.depth}層 {layer.name}
                </p>
                <button className="field-bookmark-btn" onClick={() => onToggleBookmark(question.id)}>
                  {history.bookmarked ? '⭐ 保存済み' : '☆ 保存'}
                </button>
              </div>

              <p style={{ fontSize: '0.95rem', color: 'var(--text-dim)' }}>{question.question}</p>
              <p style={{ fontSize: '1.08rem', marginTop: 4 }}>{question.context}</p>

              <p className="field-report-answer" style={{ color: scene.cardAccent }}>
                {question.answer}
              </p>

              {history.lastErrorType && (
                <p style={{ fontSize: '0.9rem', color: 'var(--warning)' }}>
                  エラータイプ: {ERROR_TYPE_LABELS[history.lastErrorType]}
                </p>
              )}

              {question.explanation && (
                <p style={{ marginTop: 8, fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                  💡 {question.explanation}
                </p>
              )}

              <div className="field-report-stats">
                <span>✅ 正解 {history.correct}</span>
                <span>❌ ミス {history.miss}</span>
                <span>正答率 {rate}%</span>
                <span>🔥 連続 {history.consecutiveCorrect}</span>
                <span>最終: {history.lastAnswered}</span>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}

function toPct(rate: number): number {
  return Math.round(rate * 100);
}
