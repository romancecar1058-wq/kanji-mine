import { useState, useCallback, useMemo } from 'react';
import type { Question, AnswerRecord } from '../types';
import type { LayerScene } from '../constants/layers';
import Timer from './Timer';

interface QuizCardProps {
  question: Question;
  layerScene: LayerScene;
  onSubmit: (record: AnswerRecord) => void;
}

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Generate random sparkle positions for the correct feedback */
function generateSparkles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 0.4,
    size: 4 + Math.random() * 6,
    color: ['#e8a849', '#5bd4a4', '#ffe66d', '#CFB53B', '#E8E8E8'][Math.floor(Math.random() * 5)],
  }));
}

export default function QuizCard({ question, layerScene, onSubmit }: QuizCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [startTime] = useState(Date.now());

  const sparkles = useMemo(() => generateSparkles(12), []);
  const aiueOrder: Record<string, number> = { ア: 0, イ: 1, ウ: 2, エ: 3 };
  const isAiueChoiceSet = useMemo(
    () => !!question.choices && question.choices.length === 4 && question.choices.every(c => c.label in aiueOrder),
    [question.choices],
  );
  const shuffledChoices = useMemo(
    () => {
      if (!question.choices) return null;
      const arr = [...question.choices];
      // 問題IDベースの並び替え（正解位置の固定偏りを防ぐ）。
      arr.sort((a, b) => {
        const ha = hashString(`${question.id}:${a.label}`);
        const hb = hashString(`${question.id}:${b.label}`);
        if (ha !== hb) return ha - hb;
        return a.label.localeCompare(b.label);
      });
      return arr;
    },
    [question.id, question.choices],
  );

  const handleSelect = useCallback((choice: string) => {
    if (showResult) return;
    setSelected(choice);
    setShowResult(true);

    const correct = choice === question.answer;
    setTimeout(() => {
      onSubmit({
        questionId: question.id,
        tag: question.tag,
        correct,
        timeSpent: Math.round((Date.now() - startTime) / 1000),
      });
      setSelected(null);
      setShowResult(false);
    }, 1800);
  }, [showResult, question, onSubmit, startTime]);

  const handleTimeout = useCallback(() => {
    if (showResult) return;
    setShowResult(true);
    setTimeout(() => {
      onSubmit({
        questionId: question.id,
        tag: question.tag,
        correct: false,
        timeSpent: 10,
      });
      setSelected(null);
      setShowResult(false);
    }, 2000);
  }, [showResult, question, onSubmit]);

  const isCorrect = selected === question.answer;

  return (
    <div className="fade-in">
      {/* Timer */}
      <Timer
        seconds={10}
        onTimeout={handleTimeout}
        paused={showResult}
        key={question.id}
        color={layerScene.timerColor}
      />

      {/* Question */}
      <div
        className="card"
        style={{
          marginTop: 16,
          textAlign: 'center',
          borderTop: `5px solid ${layerScene.cardAccent}`,
          borderInlineStart: `3px solid ${layerScene.cardAccent}aa`,
          background: layerScene.btnTint,
          boxShadow: `0 0 24px ${layerScene.cardAccent}26`,
        }}
      >
        <p
          style={{
            fontSize: '1.05rem',
            color: layerScene.mutedTextColor ?? 'var(--text-dim)',
            marginBottom: 10,
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.35)',
          }}
        >
          {question.question}
        </p>
        <p
          style={{
            fontSize: '1.6rem',
            fontWeight: 700,
            lineHeight: 1.6,
            color: layerScene.textColor ?? 'var(--text)',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
          }}
        >
          {question.context}
        </p>
        {question.hint != null && (
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-dim)',
              marginTop: 8,
            }}
          >
            💎 ヒント: {question.hint}
          </p>
        )}
      </div>

      {/* Choices */}
      {shuffledChoices && (
        <div className="choice-grid">
          {shuffledChoices.map(c => {
            let cls = 'choice-btn';
            if (showResult && c.label === question.answer) cls += ' correct';
            if (showResult && c.label === selected && selected !== question.answer) cls += ' wrong';
            return (
              <button
                key={c.label}
                className={cls}
                onClick={() => handleSelect(c.label)}
                disabled={showResult}
                style={{
                  ['--choice-bg' as string]: layerScene.btnTint,
                  ['--choice-accent' as string]: layerScene.cardAccent,
                  ['--choice-accent-glow' as string]: `${layerScene.cardAccent}66`,
                  borderColor: `${layerScene.cardAccent}55`,
                  boxShadow: showResult && c.label === question.answer
                    ? `0 0 20px ${layerScene.cardAccent}88`
                    : `inset 0 0 0 1px ${layerScene.cardAccent}33`,
                }}
              >
                {isAiueChoiceSet && c.desc ? c.desc : c.label}
                {c.desc && !isAiueChoiceSet && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      color: layerScene.mutedTextColor ?? 'var(--text-dim)',
                      marginTop: 4,
                      textShadow: '0 1px 3px rgba(0, 0, 0, 0.28)',
                    }}
                  >
                    {c.desc}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Dramatic Feedback Overlay */}
      {showResult && (
        isCorrect ? (
          <div
            className="feedback-overlay correct anim-pop-in"
            style={{
              borderColor: `${layerScene.cardAccent}88`,
              boxShadow: `0 0 30px ${layerScene.cardAccent}33`,
            }}
          >
            {/* Sparkle particles */}
            <div className="sparkle-container">
              {sparkles.map(s => (
                <div
                  key={s.id}
                  className="sparkle"
                  style={{
                    left: `${s.left}%`,
                    top: `${s.top}%`,
                    width: s.size,
                    height: s.size,
                    background: s.color,
                    boxShadow: `0 0 6px ${s.color}`,
                    animationDelay: `${s.delay}s`,
                  }}
                />
              ))}
              <div className="glow-ring" style={{ background: 'rgba(94, 232, 176, 0.25)' }} />
            </div>

            {/* Main content */}
            <div className="feedback-emoji anim-pop-in-big">
              ✨ 💎 ✨
            </div>
            <div className="feedback-sfx" style={{ color: layerScene.cardAccent }}>
              ガキーン！
            </div>
            <div className="feedback-text" style={{ color: layerScene.cardAccent }}>
              標本採取成功！
            </div>
            {question.explanation && (
              <p style={{ color: 'var(--text-dim)', marginTop: 10, fontSize: '0.95rem' }}>
                {question.explanation}
              </p>
            )}
          </div>
        ) : (
          <div className="feedback-overlay wrong anim-shake">
            <div className="feedback-emoji" style={{ animation: 'slam-in 0.5s ease-out both' }}>
              💥
            </div>
            <div className="feedback-sfx" style={{ color: 'var(--danger)' }}>
              ガラガラ…
            </div>
            <div className="feedback-text" style={{ color: 'var(--danger)' }}>
              断層発見！
            </div>
            <p style={{ marginTop: 10, fontSize: '1.1rem' }}>
              正解は「<strong style={{ color: layerScene.cardAccent, fontSize: '1.3rem' }}>{question.answer}</strong>」
            </p>
            {question.explanation && (
              <p style={{ color: 'var(--text-dim)', marginTop: 8, fontSize: '0.95rem' }}>
                {question.explanation}
              </p>
            )}
          </div>
        )
      )}
    </div>
  );
}
