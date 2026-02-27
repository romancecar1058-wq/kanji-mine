import type { AnswerRecord, Screen, Question, AppState, MineralType, QuizMode } from '../types';
import { LAYER_BY_TAG } from '../constants/layers';
import { MINERAL_BY_TYPE } from '../constants/minerals';
import { MESSAGES, pickRandom } from '../constants/messages';

interface MiningReward {
  type: MineralType;
  count: number;
}

function computeMiningRewards(
  appState: AppState,
  baselineMinerals: Record<MineralType, number>,
): MiningReward[] {
  const rewards: MiningReward[] = [];

  for (const [type, total] of Object.entries(appState.minerals) as [MineralType, number][]) {
    const gained = total - (baselineMinerals[type] ?? 0);
    if (gained > 0) rewards.push({ type, count: gained });
  }

  return rewards.sort((a, b) => {
    const rankDiff = MINERAL_BY_TYPE[b.type].rank - MINERAL_BY_TYPE[a.type].rank;
    if (rankDiff !== 0) return rankDiff;
    return b.count - a.count;
  });
}

interface ResultProps {
  answers: AnswerRecord[];
  questions: Question[];
  mode: QuizMode;
  navigate: (screen: Screen) => void;
  appState: AppState;
  baselineMinerals: Record<MineralType, number>;
}

export default function Result({ answers, questions, mode, navigate, appState, baselineMinerals }: ResultProps) {
  const correctCount = answers.filter(a => a.correct).length;
  const total = answers.length;
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const questionMap = new Map(questions.map(q => [q.id, q]));
  const misses = answers.filter(a => !a.correct);
  const rewards = computeMiningRewards(appState, baselineMinerals);

  const isGreat = pct >= 85;
  const isGood = pct >= 70;
  const isExamMode = mode === 'exam_short' || mode === 'exam_full';
  const resultMessage = mode === 'repair'
    ? pickRandom(MESSAGES.repairComplete)
    : isExamMode
    ? isGood
      ? pickRandom(MESSAGES.examPass)
      : pickRandom(MESSAGES.examFail)
    : isGreat
      ? pickRandom(MESSAGES.streak)
      : isGood
        ? pickRandom(MESSAGES.correct)
        : pickRandom(MESSAGES.miss);

  return (
    <div className="fade-in">
      <h2 style={{ textAlign: 'center', marginBottom: 20, fontSize: '1.5rem' }}>採掘結果</h2>

      {/* Score */}
      <div className="card" style={{ textAlign: 'center', marginBottom: 20 }}>
        <div className="anim-pop-in-big" style={{ marginBottom: 8 }}>
          <span style={{ fontSize: '3rem' }}>
            {isGreat ? '✨' : isGood ? '💎' : '🪨'}
          </span>
        </div>
        <p style={{ fontSize: '2.5rem', fontWeight: 700 }}>
          <span style={{ color: isGood ? 'var(--success)' : 'var(--accent-warm)' }}>
            {correctCount}
          </span>
          <span style={{ color: 'var(--text-dim)', fontSize: '1.2rem' }}> / {total}</span>
          <span style={{ fontSize: '1.1rem', color: 'var(--text-dim)', marginLeft: 8 }}>({pct}%)</span>
        </p>
        <div className="progress-bar" style={{ margin: '14px 0' }}>
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <p style={{ fontSize: '1.05rem', color: isGood ? 'var(--success)' : 'var(--accent-warm)' }}>
          {resultMessage}
        </p>
      </div>

      {/* Mining Rewards */}
      <div className="card" style={{ marginBottom: 20, padding: 24 }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: 16, textAlign: 'center' }}>
          <span style={{ fontSize: '1.5rem' }}>💎</span> 採掘成果
        </h3>
        {rewards.length > 0 ? (
          <>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
              {rewards.map((reward, i) => {
                const mineral = MINERAL_BY_TYPE[reward.type];
                return (
                  <div
                    key={reward.type}
                    className="anim-slide-up"
                    style={{
                      animationDelay: `${i * 0.25}s`,
                      background: `${mineral.color}1a`,
                      border: `2px solid ${mineral.color}44`,
                      borderRadius: 'var(--radius)',
                      padding: '16px 20px',
                      textAlign: 'center',
                      boxShadow: `0 0 20px ${mineral.color}33`,
                      minWidth: 110,
                    }}
                  >
                    <div style={{
                      fontSize: '1.5rem',
                      marginBottom: 6,
                      textShadow: `0 0 10px ${mineral.color}66`,
                    }}>
                      {'★'.repeat(Math.min(mineral.rank, 5))}
                    </div>
                    <div style={{
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      color: mineral.color,
                      textShadow: `0 0 8px ${mineral.color}44`,
                    }}>
                      {mineral.name}
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: 6 }}>
                      ×{reward.count}
                    </div>
                    {reward.type === 'fossil' && (
                      <span
                        className="anim-pop-in"
                        style={{
                          display: 'inline-block',
                          marginTop: 6,
                          fontSize: '0.85rem',
                          color: 'var(--success)',
                          fontWeight: 700,
                          background: 'rgba(94, 232, 176, 0.15)',
                          padding: '2px 10px',
                          borderRadius: 12,
                        }}
                      >
                        復活！
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <p style={{
              textAlign: 'center',
              marginTop: 14,
              fontSize: '1rem',
              color: 'var(--accent)',
              fontWeight: 600,
            }}>
              今回の採掘で標本が増えた！
            </p>
          </>
        ) : (
          <p style={{ textAlign: 'center', fontSize: '1rem', color: 'var(--text-dim)' }}>
            今回は鉱石が見つかりませんでした…次こそ！ 💪
          </p>
        )}
      </div>

      {/* Kanji Specimen chips for writing questions */}
      <WritingSpecimenChips answers={answers} questions={questions} appState={appState} />

      {/* Misses */}
      {misses.length > 0 && (
        <>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 10, color: 'var(--danger)' }}>
            💥 断層（ミス）: {misses.length}件
          </h3>
          {misses.map(a => {
            const q = questionMap.get(a.questionId);
            if (!q) return null;
            const layer = LAYER_BY_TAG[a.tag];
            return (
              <div key={a.questionId} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.95rem', color: 'var(--text-dim)' }}>
                    {layer.emoji} {layer.name}
                  </span>
                  {a.errorType && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>
                      {a.errorType}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '1.1rem' }}>
                  正解：<strong style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>{q.answer}</strong>
                </p>
                {q.explanation && (
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-dim)', marginTop: 6 }}>
                    {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 14, marginTop: 24 }}>
        <button
          className="btn-secondary"
          style={{ flex: 1 }}
          onClick={() => navigate({ kind: 'home' })}
        >
          ホームに戻る
        </button>
        <button
          className="btn-primary"
          style={{ flex: 1 }}
          onClick={() => navigate({ kind: 'quiz', mode: 'daily' })}
        >
          もう一回！
        </button>
      </div>
    </div>
  );
}

function WritingSpecimenChips({
  answers,
  questions,
  appState,
}: {
  answers: AnswerRecord[];
  questions: Question[];
  appState: AppState;
}) {
  const questionMap = new Map(questions.map(q => [q.id, q]));
  const writingAnswers = answers.filter(a => a.tag === 'writing');

  if (writingAnswers.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: 20, padding: 20 }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: 14, textAlign: 'center' }}>
        ✍️ 今回の書き取り
      </h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {writingAnswers.map((a, i) => {
          const q = questionMap.get(a.questionId);
          if (!q) return null;
          const kanji = q.answer;
          const selfScore = a.selfScore;
          const scoreIcon = selfScore === 'perfect' ? '◎' : selfScore === 'close' ? '△' : '×';
          const scoreColor = selfScore === 'perfect' ? '#D4AF37' : selfScore === 'close' ? '#A0A0A0' : 'var(--danger)';

          // "New discovery" = first time correct for this kanji
          const h = appState.history[a.questionId];
          const isNewDiscovery = selfScore === 'perfect' && h && h.correct === 1;

          return (
            <div
              key={a.questionId}
              className="anim-slide-up"
              style={{
                animationDelay: `${i * 0.15}s`,
                border: `2px solid ${scoreColor}55`,
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                textAlign: 'center',
                minWidth: 72,
                background: `${scoreColor}0d`,
                position: 'relative',
              }}
            >
              <div style={{
                fontSize: '1.6rem',
                fontWeight: 700,
                color: scoreColor,
                lineHeight: 1.2,
              }}>
                {kanji}
              </div>
              <div style={{
                fontSize: '1rem',
                marginTop: 4,
                color: scoreColor,
              }}>
                {scoreIcon}
              </div>
              {isNewDiscovery && (
                <div
                  className="anim-pop-in"
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: '#D4AF37',
                    background: 'rgba(212,175,55,0.2)',
                    border: '1px solid rgba(212,175,55,0.4)',
                    padding: '1px 6px',
                    borderRadius: 8,
                    whiteSpace: 'nowrap',
                  }}
                >
                  新発見！
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
