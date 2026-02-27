import { useEffect } from 'react';
import type { Question, AnswerRecord, AppState, QuizMode } from '../types';
import { useQuiz } from '../hooks/useQuiz';
import { LAYER_BY_TAG, LAYER_SCENES, MAX_LAYER_DEPTH } from '../constants/layers';
import QuizCard from '../components/QuizCard';
import WritingCanvas from '../components/WritingCanvas';

interface QuizProps {
  allQuestions: Question[];
  appState: AppState;
  mode: QuizMode;
  layerDepth?: number;
  onComplete: (answers: AnswerRecord[], mode: QuizMode) => void;
  onRecordAnswer: (record: AnswerRecord) => void;
  onBack: () => void;
}

export default function Quiz({ allQuestions, appState, mode, layerDepth, onComplete, onRecordAnswer, onBack }: QuizProps) {
  const { startQuiz, submitAnswer, currentQuestion, progress, answers, isActive } = useQuiz(allQuestions, appState);

  useEffect(() => {
    startQuiz(mode, layerDepth);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isActive && answers.length > 0) {
      onComplete(answers, mode);
    }
  }, [isActive, answers, mode, onComplete]);

  const handleSubmit = (record: AnswerRecord) => {
    onRecordAnswer(record);
    submitAnswer(record);
  };

  if (!currentQuestion) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: 'var(--text-dim)' }}>問題を読み込み中...</p>
      </div>
    );
  }

  const layer = LAYER_BY_TAG[currentQuestion.tag];
  const layerScene = LAYER_SCENES[currentQuestion.tag];
  const depthPct = (layer.depth / MAX_LAYER_DEPTH) * 100;
  const ambientClass = layerScene.ambientAnimation ? `ambient-${layerScene.ambientAnimation}` : '';

  return (
    <div
      className={ambientClass}
      style={{
        margin: '-20px -24px',
        padding: '20px 24px 28px',
        minHeight: '100vh',
        background: layerScene.readabilityMask
          ? `${layerScene.readabilityMask}, ${layerScene.bgGradient}`
          : layerScene.bgGradient,
      }}
    >
      <div
        className="layer-scene-header"
        style={{
          background: layerScene.bannerGradient,
          border: `1px solid ${layerScene.cardAccent}88`,
          boxShadow: `0 0 24px ${layerScene.cardAccent}44`,
        }}
      >
        <div className="layer-scene-emojis">
          {layerScene.sceneryEmojis.map((emoji, idx) => (
            <span
              key={`${emoji}-${idx}`}
              style={{
                animationDelay: `${idx * 0.22}s`,
                filter: layerScene.emojiFilter,
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
        <div className="layer-scene-progress-badge">
          {progress.current} / {progress.total}
        </div>
        <div>
          <p className="layer-scene-name" style={{ textShadow: `0 0 12px ${layerScene.cardAccent}99` }}>
            第{layer.depth}層 {layer.name}
          </p>
          <p className="layer-scene-atmosphere">{layerScene.atmosphere}</p>
        </div>
      </div>

      <div className="depth-gauge" aria-hidden="true">
        <span className="depth-gauge-label">深度 {layer.depth}</span>
        <div
          className="depth-gauge-fill"
          style={{
            height: `${depthPct}%`,
            background: layerScene.bannerGradient,
            boxShadow: `0 0 14px ${layerScene.cardAccent}66`,
          }}
        />
      </div>

      <div className="progress-bar" style={{ marginBottom: 16 }}>
        <div
          className="progress-bar-fill"
          style={{
            width: `${(progress.current / progress.total) * 100}%`,
            background: layerScene.timerColor,
          }}
        />
      </div>

      <button
        className="btn-ghost"
        onClick={onBack}
        style={{
          marginBottom: 8,
          color: layerScene.mutedTextColor ?? 'var(--text-dim)',
          textShadow: '0 1px 4px rgba(0, 0, 0, 0.35)',
        }}
      >
        ← 中断する
      </button>

      {currentQuestion.tag === 'writing' ? (
        <WritingCanvas
          key={currentQuestion.id}
          question={currentQuestion}
          layerScene={layerScene}
          onSubmit={handleSubmit}
        />
      ) : (
        <QuizCard
          key={currentQuestion.id}
          question={currentQuestion}
          layerScene={layerScene}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
