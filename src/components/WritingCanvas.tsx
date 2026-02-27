import { useRef, useEffect, useCallback, useState } from 'react';
import type { Question, AnswerRecord, SelfScore, ErrorType } from '../types';
import type { LayerScene } from '../constants/layers';
import { ERROR_TYPE_LABELS } from '../constants/messages';

interface WritingCanvasProps {
  question: Question;
  layerScene: LayerScene;
  onSubmit: (record: AnswerRecord) => void;
}

export default function WritingCanvas({ question, layerScene, onSubmit }: WritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<'write' | 'score' | 'errorType'>('write');
  const [selfScore, setSelfScore] = useState<SelfScore | null>(null);
  const startTime = useRef(Date.now());

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 4;

    // Guide lines
    ctx.save();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(rect.width / 2, 0);
    ctx.lineTo(rect.width / 2, rect.height);
    ctx.moveTo(0, rect.height / 2);
    ctx.lineTo(rect.width, rect.height / 2);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
  }, [question.id]);

  const getPoint = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (phase !== 'write') return;
    isDrawing.current = true;
    lastPoint.current = getPoint(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }, [phase, getPoint]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing.current || phase !== 'write') return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pt = getPoint(e);
    if (lastPoint.current) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
    lastPoint.current = pt;
  }, [phase, getPoint]);

  const onPointerUp = useCallback(() => {
    isDrawing.current = false;
    lastPoint.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Redraw guide lines
    ctx.save();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(rect.width / 2, 0);
    ctx.lineTo(rect.width / 2, rect.height);
    ctx.moveTo(0, rect.height / 2);
    ctx.lineTo(rect.width, rect.height / 2);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
  }, []);

  const handleDone = useCallback(() => {
    setPhase('score');
  }, []);

  const handleSelfScore = useCallback((score: SelfScore) => {
    setSelfScore(score);
    if (score === 'miss') {
      setPhase('errorType');
    } else {
      onSubmit({
        questionId: question.id,
        tag: question.tag,
        correct: score === 'perfect',
        selfScore: score,
        timeSpent: Math.round((Date.now() - startTime.current) / 1000),
      });
    }
  }, [onSubmit, question]);

  const handleErrorType = useCallback((errorType: ErrorType) => {
    onSubmit({
      questionId: question.id,
      tag: question.tag,
      correct: false,
      selfScore: selfScore ?? 'miss',
      errorType,
      timeSpent: Math.round((Date.now() - startTime.current) / 1000),
    });
  }, [onSubmit, question, selfScore]);

  return (
    <div className="fade-in">
      {/* Question */}
      <div
        className="card"
        style={{
          textAlign: 'center',
          marginBottom: 12,
          borderTop: `5px solid ${layerScene.cardAccent}`,
          borderInlineStart: `3px solid ${layerScene.cardAccent}aa`,
          background: layerScene.btnTint,
          boxShadow: `0 0 20px ${layerScene.cardAccent}24`,
        }}
      >
        <p
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            lineHeight: 1.6,
            color: layerScene.textColor ?? 'var(--text)',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
          }}
        >
          {question.context}
        </p>
        <p
          style={{
            fontSize: '0.9rem',
            color: layerScene.mutedTextColor ?? 'var(--accent-warm)',
            marginTop: 8,
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
          }}
        >
          「{question.target}」を漢字で書こう
        </p>
      </div>

      {/* Canvas */}
      {phase === 'write' && question.hint != null && (
        <p
          style={{
            fontSize: '0.88rem',
            color: 'var(--text-dim)',
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          💎 ヒント: {question.hint}
        </p>
      )}
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>

      {phase === 'write' && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12 }}>
          <button className="btn-secondary" onClick={clearCanvas}>消す</button>
          <button className="btn-primary" style={{ flex: 1, maxWidth: 200 }} onClick={handleDone}>
            できた！
          </button>
        </div>
      )}

      {/* Model answer + self score */}
      {phase === 'score' && (
        <div className="fade-in" style={{ textAlign: 'center', marginTop: 16 }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>正解</p>
          <p style={{ fontSize: '3rem', fontWeight: 700, margin: '8px 0', color: layerScene.cardAccent }}>
            {question.answer}
          </p>
          {question.explanation && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 12 }}>
              {question.explanation}
            </p>
          )}
          <p style={{ fontSize: '0.9rem', marginBottom: 8 }}>自分の字を比べてみよう</p>
          <div className="self-score-row">
            <button className="score-btn perfect" onClick={() => handleSelfScore('perfect')}>
              ◎ できた
            </button>
            <button className="score-btn close" onClick={() => handleSelfScore('close')}>
              △ 惜しい
            </button>
            <button className="score-btn miss" onClick={() => handleSelfScore('miss')}>
              × ダメ
            </button>
          </div>
        </div>
      )}

      {/* Error type selection */}
      {phase === 'errorType' && (
        <div className="fade-in" style={{ textAlign: 'center', marginTop: 16 }}>
          <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>断層レポート — 原因を1つ選ぼう</p>
          <div className="error-type-grid">
            {(Object.entries(ERROR_TYPE_LABELS) as [ErrorType, string][]).map(([key, label]) => (
              <button
                key={key}
                className="error-type-btn"
                onClick={() => handleErrorType(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
